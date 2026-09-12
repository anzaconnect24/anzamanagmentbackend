const crypto = require("crypto");
const { Op } = require("sequelize");
const { errorResponse, successResponse } = require("../../utils/responses");
const { buildIcs } = require("./calendar.ics");
const {
  CalendarEvent,
  CalendarEventProgram,
  CalendarEventUser,
  CalendarFeedToken,
  CohortProgram,
  CohortMembership,
  CohortProgramLead,
  Business,
  User,
  sequelize,
} = require("../../models");

// The platform calendar.
//
// Everyone has one. What is on it is the union of two things: the events
// published to them, and the reminders they keep for themselves.
//
// Publishing to anyone but yourself is Admin and BDA only — they run the
// programmes, so they are the ones with something to announce. Everyone else
// can still write on their own calendar, and nobody, administrator included,
// can read those entries.

// The programmes a person belongs to, whichever way they belong: a startup by
// its business being on the cohort, an advisor by leading it.
const programsFor = async (user) => {
  const ids = new Set();

  const leads = await CohortProgramLead.findAll({
    where: { userId: user.id },
    attributes: ["cohortProgramId"],
    raw: true,
  });

  for (const row of leads) ids.add(row.cohortProgramId);

  const businesses = await Business.findAll({
    where: { userId: user.id },
    attributes: ["id"],
    raw: true,
  });

  if (businesses.length) {
    const memberships = await CohortMembership.findAll({
      where: { businessId: { [Op.in]: businesses.map((row) => row.id) } },
      attributes: ["cohortProgramId"],
      raw: true,
    });

    for (const row of memberships) ids.add(row.cohortProgramId);
  }

  return [...ids];
};

// Everything this person may see, as a where clause.
//
// Written as one OR rather than several queries stitched together, so there
// is a single place to look when asking "why can they see that?".
const visibleTo = async (user) => {
  const mine = { createdById: user.id };

  const published = [{ visibility: "everyone" }];

  // Named individually.
  const invitedTo = await CalendarEventUser.findAll({
    where: { userId: user.id },
    attributes: ["eventId"],
    raw: true,
  });

  if (invitedTo.length) {
    published.push({ id: { [Op.in]: invitedTo.map((row) => row.eventId) } });
  }

  // Published to a programme this person is on. An administrator sees every
  // programme's events without being on any of them — that is what running
  // the platform means — but still not anybody's private reminders.
  if (user.role === "Admin") {
    published.push({ visibility: "programs" });
  } else {
    const programIds = await programsFor(user);

    if (programIds.length) {
      const rows = await CalendarEventProgram.findAll({
        where: { cohortProgramId: { [Op.in]: programIds } },
        attributes: ["eventId"],
        raw: true,
      });

      if (rows.length) {
        published.push({ id: { [Op.in]: rows.map((row) => row.eventId) } });
      }
    }
  }

  return {
    archivedAt: null,
    [Op.or]: [
      mine,
      // Published entries are never private ones: an entry someone kept for
      // themselves is excluded here even if they also named a programme.
      { [Op.and]: [{ visibility: { [Op.ne]: "private" } }, { [Op.or]: published }] },
    ],
  };
};

const shape = (row, user) => {
  const data = row.toJSON ? row.toJSON() : row;

  const rows = data.invitees || [];

  // The reader's own seat at this event, if they were named on it. An event
  // published to a whole programme reaches them without one, which is the
  // difference the Invites tab turns on: you are only asked to answer for
  // something addressed to you personally.
  const seat = rows.find((entry) => entry.userId === user.id) || null;

  // Who has answered what, for whoever is running the event. Counted for
  // everyone rather than hidden, because an attendee list is not a secret from
  // the people on it.
  const tally = { pending: 0, accepted: 0, declined: 0, tentative: 0 };
  for (const entry of rows) {
    if (tally[entry.response] !== undefined) tally[entry.response] += 1;
  }

  return {
    invited: Boolean(seat),
    // null rather than "pending" when they were never asked, so the screen can
    // tell "has not replied" from "was never invited".
    myResponse: seat ? seat.response : null,
    responses: tally,
    uuid: data.uuid,
    title: data.title,
    description: data.description,
    location: data.location,
    startDate: data.startDate,
    endDate: data.endDate,
    startTime: data.startTime,
    endTime: data.endTime,
    colour: data.colour,
    visibility: data.visibility,
    // Said plainly, so the screen never has to work out from the visibility
    // whether this is the programme's or the reader's own.
    personal: data.visibility === "private",
    mine: data.createdById === user.id,
    canEdit: data.createdById === user.id || user.role === "Admin",
    createdBy: data.createdBy
      ? { uuid: data.createdBy.uuid, name: data.createdBy.name, role: data.createdBy.role }
      : null,
    programs: (data.programs || [])
      .filter((row) => row.program)
      .map((row) => ({ uuid: row.program.uuid, title: row.program.title })),
    invitees: rows
      .filter((entry) => entry.user)
      .map((entry) => ({
        uuid: entry.user.uuid,
        name: entry.user.name,
        response: entry.response,
      })),
  };
};

const includes = () => [
  { model: User, as: "createdBy", attributes: ["uuid", "name", "role"] },
  {
    model: CalendarEventProgram,
    as: "programs",
    include: [
      { model: CohortProgram, as: "program", attributes: ["uuid", "title"] },
    ],
  },
  {
    model: CalendarEventUser,
    as: "invitees",
    include: [{ model: User, as: "user", attributes: ["uuid", "name"] }],
  },
];

const getCalendar = async (req, res) => {
  try {
    const where = await visibleTo(req.user);

    // A month at a time by default, but the window is the caller's to choose
    // — the header panel asks for what is coming, the page asks for a month.
    const from = String(req.query.from || "").slice(0, 10);
    const to = String(req.query.to || "").slice(0, 10);

    if (from && to) where.startDate = { [Op.between]: [from, to] };
    else if (from) where.startDate = { [Op.gte]: from };
    else if (to) where.startDate = { [Op.lte]: to };

    const rows = await CalendarEvent.findAll({
      where,
      include: includes(),
      order: [
        ["startDate", "ASC"],
        ["startTime", "ASC"],
        ["id", "ASC"],
      ],
      limit: Math.min(Number(req.query.limit) || 500, 500),
    });

    const data = rows.map((row) => shape(row, req.user));

    successResponse(res, {
      canPublish: CalendarEvent.PUBLISHERS.includes(req.user.role),
      visibilities: CalendarEvent.VISIBILITIES,
      colours: CalendarEvent.COLOURS,
      count: data.length,
      data,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Who an event can be addressed to. Only the roles that may publish get this,
// because it is a list of every programme and every account on the platform.
const getAudiences = async (req, res) => {
  try {
    if (!CalendarEvent.PUBLISHERS.includes(req.user.role)) {
      return res.status(403).json({
        status: false,
        message: "Only an administrator or advisor can publish events",
      });
    }

    const programs = await CohortProgram.findAll({
      where: { archivedAt: null },
      attributes: ["uuid", "title"],
      order: [["title", "ASC"]],
    });

    const users = await User.findAll({
      where: { activated: true },
      attributes: ["uuid", "name", "role"],
      order: [["name", "ASC"]],
    });

    successResponse(res, { programs, users });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Creating and editing are the same act with the same rules, so one handler
// does both: a recordUuid in the path means "this one".
const saveEvent = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const publisher = CalendarEvent.PUBLISHERS.includes(req.user.role);

    // Anyone who is not a publisher keeps reminders, whatever they asked for.
    // Refused rather than quietly downgraded: an event you believed you had
    // announced is worse than one you were told you could not.
    const wanted = String(req.body.visibility || "private");

    if (!CalendarEvent.VISIBILITIES.includes(wanted)) {
      await transaction.rollback();
      return res.status(400).json({
        status: false,
        message:
          "Visibility must be one of " + CalendarEvent.VISIBILITIES.join(", "),
      });
    }

    if (!publisher && wanted !== "private") {
      await transaction.rollback();
      return res.status(403).json({
        status: false,
        message:
          "Your calendar entries are your own — only an administrator or advisor can publish an event to others",
      });
    }

    const title = String(req.body.title || "").trim();

    if (!title) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ status: false, message: "A title is required" });
    }

    const startDate = String(req.body.startDate || "").slice(0, 10);

    if (!startDate) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ status: false, message: "A date is required" });
    }

    const endDate = String(req.body.endDate || "").slice(0, 10) || null;

    if (endDate && endDate < startDate) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ status: false, message: "An event cannot end before it starts" });
    }

    if (req.body.colour && !CalendarEvent.COLOURS.includes(req.body.colour)) {
      await transaction.rollback();
      return res.status(400).json({
        status: false,
        message: "Colour must be one of " + CalendarEvent.COLOURS.join(", "),
      });
    }

    let event;

    if (req.params.recordUuid) {
      event = await CalendarEvent.findOne({
        where: { uuid: req.params.recordUuid, archivedAt: null },
        transaction,
      });

      if (!event) {
        await transaction.rollback();
        return res
          .status(404)
          .json({ status: false, message: "Event not found" });
      }

      // An administrator can take an event down, but editing one is the
      // author's — including, especially, a private reminder.
      if (event.createdById !== req.user.id) {
        await transaction.rollback();
        return res
          .status(403)
          .json({ status: false, message: "This is not your event" });
      }
    }

    const payload = {
      title,
      description: req.body.description || null,
      location: req.body.location || null,
      startDate,
      endDate,
      startTime: req.body.startTime || null,
      endTime: req.body.endTime || null,
      colour: req.body.colour || "blue",
      visibility: wanted,
    };

    if (event) await event.update(payload, { transaction });
    else {
      event = await CalendarEvent.create(
        { ...payload, createdById: req.user.id },
        { transaction },
      );
    }

    // The audience is rewritten wholesale, which is what editing it does.
    await CalendarEventProgram.destroy({
      where: { eventId: event.id },
      transaction,
    });
    await CalendarEventUser.destroy({
      where: { eventId: event.id },
      transaction,
    });

    if (wanted === "programs") {
      const uuids = Array.isArray(req.body.programUuids)
        ? req.body.programUuids
        : [];

      const programs = uuids.length
        ? await CohortProgram.findAll({
            where: { uuid: { [Op.in]: uuids } },
            attributes: ["id"],
            raw: true,
            transaction,
          })
        : [];

      if (!programs.length) {
        await transaction.rollback();
        return res.status(400).json({
          status: false,
          message: "Choose at least one program to publish this to",
        });
      }

      await CalendarEventProgram.bulkCreate(
        programs.map((row) => ({ eventId: event.id, cohortProgramId: row.id })),
        { transaction },
      );
    }

    if (wanted === "users") {
      const uuids = Array.isArray(req.body.userUuids) ? req.body.userUuids : [];

      const users = uuids.length
        ? await User.findAll({
            where: { uuid: { [Op.in]: uuids } },
            attributes: ["id"],
            raw: true,
            transaction,
          })
        : [];

      if (!users.length) {
        await transaction.rollback();
        return res.status(400).json({
          status: false,
          message: "Choose at least one person to publish this to",
        });
      }

      await CalendarEventUser.bulkCreate(
        users.map((row) => ({ eventId: event.id, userId: row.id })),
        { transaction },
      );
    }

    await transaction.commit();

    const saved = await CalendarEvent.findOne({
      where: { id: event.id },
      include: includes(),
    });

    successResponse(res, shape(saved, req.user));
  } catch (error) {
    await transaction.rollback();
    errorResponse(res, error);
  }
};

const removeEvent = async (req, res) => {
  try {
    const event = await CalendarEvent.findOne({
      where: { uuid: req.params.recordUuid, archivedAt: null },
    });

    if (!event) {
      return res.status(404).json({ status: false, message: "Event not found" });
    }

    // The author, or an administrator clearing something published. A private
    // reminder stays its author's alone even here.
    const allowed =
      event.createdById === req.user.id ||
      (req.user.role === "Admin" && event.visibility !== "private");

    if (!allowed) {
      return res
        .status(403)
        .json({ status: false, message: "This is not your event" });
    }

    await event.update({ archivedAt: new Date() });
    successResponse(res, { uuid: event.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

// The two numbers the top bar needs, without sending it the calendar.
//
// The header renders a dot, not a list, so this counts in the database rather
// than shipping several hundred events to be counted in a browser and thrown
// away.
const getSummary = async (req, res) => {
  try {
    // The reader's own day, not the server's. A person in +03:00 asking at
    // half past midnight means today where they are, and only the browser
    // knows which day that is.
    const today =
      String(req.query.on || "").slice(0, 10) ||
      new Date().toLocaleDateString("en-CA");

    // Still to come, counted by the last day an event covers so a workshop
    // running to Friday stays countable on the Wednesday.
    const ahead = {
      [Op.or]: [
        { endDate: { [Op.gte]: today } },
        { endDate: null, startDate: { [Op.gte]: today } },
      ],
    };

    const invites = await CalendarEventUser.count({
      where: { userId: req.user.id, response: "pending" },
      include: [
        {
          model: CalendarEvent,
          as: "event",
          required: true,
          attributes: [],
          where: {
            archivedAt: null,
            // Your own event is not an invitation you owe anybody an answer
            // to, even when you put yourself on the list.
            createdById: { [Op.ne]: req.user.id },
            ...ahead,
          },
        },
      ],
    });

    const where = await visibleTo(req.user);

    where[Op.and] = [
      { startDate: { [Op.lte]: today } },
      {
        [Op.or]: [
          { endDate: { [Op.gte]: today } },
          { endDate: null, startDate: today },
        ],
      },
    ];

    const onToday = await CalendarEvent.count({ where });

    successResponse(res, { invites, today: onToday });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Answering an invitation.
//
// Only the people actually named on an event can answer it. Someone reached
// through their programme has nothing to answer — they were told, not asked —
// and saying so plainly is better than inventing a seat for them.
const respondToEvent = async (req, res) => {
  try {
    const answer = String(req.body.response || "").trim();

    // "pending" is a state the system puts you in, not an answer you give.
    const allowed = CalendarEventUser.RESPONSES.filter(
      (value) => value !== "pending",
    );

    if (!allowed.includes(answer)) {
      return res.status(400).json({
        status: false,
        message: "Your answer must be one of " + allowed.join(", "),
      });
    }

    const event = await CalendarEvent.findOne({
      where: { uuid: req.params.recordUuid, archivedAt: null },
    });

    if (!event) {
      return res.status(404).json({ status: false, message: "Event not found" });
    }

    const seat = await CalendarEventUser.findOne({
      where: { eventId: event.id, userId: req.user.id },
    });

    if (!seat) {
      return res.status(403).json({
        status: false,
        message: "You were not invited to this event by name",
      });
    }

    await seat.update({ response: answer, respondedAt: new Date() });

    const saved = await CalendarEvent.findOne({
      where: { id: event.id },
      include: includes(),
    });

    successResponse(res, shape(saved, req.user));
  } catch (error) {
    errorResponse(res, error);
  }
};

// Where this API answers from, as a calendar app on the open internet would
// reach it. Configured explicitly where there is a proxy in front, because
// behind one the request's own host is the proxy's, not the world's.
const publicBase = (req) => {
  const configured = String(process.env.PUBLIC_API_URL || "").trim();
  if (configured) return configured.replace(/\/+$/, "");

  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  return `${protocol}://${req.get("host")}`;
};

// One live feed per account, minted the first time it is asked for. Reading
// this does not roll the token: a person opening the panel twice should be
// given the same URL, or every subscription they have made would go dead.
const feedFor = async (userId) => {
  const existing = await CalendarFeedToken.findOne({ where: { userId } });
  if (existing) return existing;

  return CalendarFeedToken.create({
    userId,
    token: crypto.randomBytes(24).toString("hex"),
  });
};

const feedLinks = (req, token) => {
  const url = `${publicBase(req)}/calendar/feed/${token}.ics`;

  // webcal:// is what tells a desktop client to subscribe rather than to
  // download the file once and let it go stale.
  const webcal = url.replace(/^https?:\/\//, "webcal://");

  return {
    url,
    webcal,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
    outlook:
      "https://outlook.live.com/calendar/0/addfromweb?url=" +
      encodeURIComponent(url) +
      "&name=" +
      encodeURIComponent("Anza calendar"),
    office365:
      "https://outlook.office.com/calendar/0/addfromweb?url=" +
      encodeURIComponent(url) +
      "&name=" +
      encodeURIComponent("Anza calendar"),
  };
};

const getFeed = async (req, res) => {
  try {
    const record = await feedFor(req.user.id);

    successResponse(res, {
      ...feedLinks(req, record.token),
      lastUsedAt: record.lastUsedAt,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Rolling the token. Every calendar already subscribed to the old URL stops
// updating, which is the whole point: it is what you do when the link got out.
const resetFeed = async (req, res) => {
  try {
    await CalendarFeedToken.destroy({ where: { userId: req.user.id } });
    const record = await feedFor(req.user.id);

    successResponse(res, { ...feedLinks(req, record.token), lastUsedAt: null });
  } catch (error) {
    errorResponse(res, error);
  }
};

// The feed itself. No JWT — Google and Outlook fetch this on their own
// schedule with no session to offer — so the token in the path is the whole
// credential, and it stands for exactly one account.
const getFeedFile = async (req, res) => {
  try {
    const record = await CalendarFeedToken.findOne({
      where: { token: String(req.params.token || "") },
    });

    if (!record) return res.status(404).type("text/plain").send("Not found");

    const user = await User.findOne({
      where: { id: record.userId },
      attributes: ["id", "name", "role"],
    });

    if (!user) return res.status(404).type("text/plain").send("Not found");

    // The same rules the screen is bound by: this is that person's calendar,
    // read by a different program, and nothing more.
    const where = await visibleTo(user);

    // A subscription is for what is coming, with enough behind it to keep the
    // recent past in view. A calendar app does not need the whole archive.
    const floor = new Date();
    floor.setMonth(floor.getMonth() - 6);
    where.startDate = { [Op.gte]: floor.toISOString().slice(0, 10) };

    const rows = await CalendarEvent.findAll({
      where,
      include: includes(),
      order: [["startDate", "ASC"]],
      limit: 2000,
    });

    const events = rows.map((row) => ({
      ...shape(row, user),
      updatedAt: row.updatedAt,
    }));

    // Best effort: a feed that served its file should not fail because the
    // bookkeeping write did.
    record.update({ lastUsedAt: new Date() }).catch(() => {});

    res
      .status(200)
      .type("text/calendar; charset=utf-8")
      .set(
        "Content-Disposition",
        'inline; filename="anza-calendar.ics"',
      )
      // Never cached by anything in between: the point of a subscription is
      // that it changes.
      .set("Cache-Control", "no-cache, no-store, must-revalidate")
      .send(
        buildIcs(events, {
          name: `Anza — ${user.name || "My calendar"}`,
          host: req.get("host") || "anzaconnect.co.tz",
        }),
      );
  } catch (error) {
    // A calendar client gets plain text, not a JSON error envelope it cannot
    // read.
    console.log(error);
    res.status(500).type("text/plain").send("Calendar unavailable");
  }
};

module.exports = {
  getCalendar,
  getSummary,
  getAudiences,
  saveEvent,
  removeEvent,
  respondToEvent,
  getFeed,
  resetFeed,
  getFeedFile,
};
