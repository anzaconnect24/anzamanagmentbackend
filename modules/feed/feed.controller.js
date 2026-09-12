const { Op } = require("sequelize");
const { errorResponse, successResponse } = require("../../utils/responses");
const {
  FeedPost,
  FeedComment,
  FeedReaction,
  FeedSave,
  FeedView,
  Business,
  User,
  sequelize,
} = require("../../models");

// The live feed.
//
// One conversation for the whole platform: a startup, a mentor, an investor
// and the programme team all post into the same place and reply to each
// other. Newest first, because that is the only order a feed is ever read in.
//
// There is no visibility model on purpose. Everyone signed in sees every
// post, which is what makes it a community board rather than a mailbox.

// How much of the feed comes back at once. The page asks for more as it
// scrolls rather than pulling a year of conversation on first paint.
const PAGE_SIZE = 20;

// The comments shown under a post before "view all". Enough to see the
// conversation has a shape, few enough that the feed still scrolls.
const PREVIEW_COMMENTS = 3;

// Who a post is by.
//
// A startup posts as its business, not as the person who happens to hold the
// login: the feed is a room of organisations, and "Ngoni Mombeshora" means
// nothing to a reader who knows the company. Everyone else posts under their
// own name, because that is who they are here.
//
// The person's name is still carried, so a startup post can say who wrote it
// if a screen wants to.
const shapePerson = (user, businessFor) => {
  if (!user) return null;

  const business =
    user.role === "Enterprenuer" && businessFor
      ? businessFor.get(user.id) || null
      : null;

  return {
    uuid: user.uuid,
    name: business?.name || user.name,
    personName: user.name,
    business: business ? { uuid: business.uuid, name: business.name } : null,
    role: user.role,
    // A business has no picture of its own on this platform, so the avatar
    // stays the account's.
    image: user.image || null,
  };
};

// The businesses behind a set of authors, in one read. Keyed by user id,
// which is what shapePerson looks them up by.
//
// A user could in principle own more than one business; the first is taken,
// because a post has one name on it and the alternative is to invent a rule
// about which one speaks.
const businessesFor = async (users) => {
  const ids = [
    ...new Set(
      users
        .filter((user) => user && user.role === "Enterprenuer")
        .map((user) => user.id)
        .filter(Boolean),
    ),
  ];

  if (!ids.length) return new Map();

  const rows = await Business.findAll({
    where: { userId: { [Op.in]: ids } },
    attributes: ["uuid", "name", "userId"],
    order: [["id", "ASC"]],
    raw: true,
  });

  const map = new Map();

  for (const row of rows) {
    if (!map.has(row.userId)) map.set(row.userId, row);
  }

  return map;
};

const shapeComment = (row, businessFor) => {
  const data = row.toJSON ? row.toJSON() : row;
  return {
    uuid: data.uuid,
    body: data.body,
    createdAt: data.createdAt,
    author: shapePerson(data.author, businessFor),
  };
};

// Who may take a post or comment down: its author, or an administrator.
// Nobody else, however senior - a programme lead is not a moderator of the
// whole platform.
const mayRemove = (req, row) =>
  req.user.role === "Admin" || row.authorId === req.user.id;

const getFeed = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || PAGE_SIZE, 50);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const where = { archivedAt: null };

    // One search box over what was said and who said it.
    const keyword = String(req.query.keyword || "").trim();

    if (keyword) {
      where[Op.or] = [
        { title: { [Op.like]: `%${keyword}%` } },
        { body: { [Op.like]: `%${keyword}%` } },
      ];
    }

    // "Saved" is a view of the feed, not a different feed: same shaping,
    // narrowed to what this reader has bookmarked.
    if (String(req.query.saved || "") === "1") {
      const saved = await FeedSave.findAll({
        where: { userId: req.user.id },
        attributes: ["postId"],
        raw: true,
      });

      where.id = { [Op.in]: saved.map((row) => row.postId) };
    }

    const { rows, count } = await FeedPost.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "uuid", "name", "role", "image"],
        },
        // What a repost points at, carried along so the feed can show the
        // original underneath whoever reshared it.
        {
          model: FeedPost,
          as: "repostOf",
          required: false,
          include: [
            {
              model: User,
              as: "author",
              attributes: ["id", "uuid", "name", "role", "image"],
            },
          ],
        },
      ],
      // id breaks the tie: two posts made in the same second are ordered by
      // which was actually written first, not by whatever the driver returns.
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
      limit,
      offset,
      distinct: true,
    });

    // Comments are fetched for this page of posts in one query rather than
    // one per post - a feed of twenty posts should not be twenty-one reads.
    const postIds = rows.map((row) => row.id);

    const comments = postIds.length
      ? await FeedComment.findAll({
          where: { postId: { [Op.in]: postIds }, archivedAt: null },
          include: [
            {
              model: User,
              as: "author",
              attributes: ["id", "uuid", "name", "role", "image"],
            },
          ],
          order: [
            ["createdAt", "ASC"],
            ["id", "ASC"],
          ],
        })
      : [];

    const byPost = new Map();

    for (const comment of comments) {
      const list = byPost.get(comment.postId) || [];
      list.push(comment);
      byPost.set(comment.postId, list);
    }

    // Reactions for this page, in one read for the same reason as the
    // comments: a feed of twenty posts is one query, not twenty.
    const reactions = postIds.length
      ? await FeedReaction.findAll({
          where: { postId: { [Op.in]: postIds } },
          attributes: ["postId", "userId", "kind"],
          raw: true,
        })
      : [];

    const tally = new Map();

    for (const reaction of reactions) {
      const row = tally.get(reaction.postId) || { counts: {}, mine: null };

      row.counts[reaction.kind] = (row.counts[reaction.kind] || 0) + 1;

      // Which way this reader went, so the page can light the right button
      // without a second call.
      if (reaction.userId === req.user.id) row.mine = reaction.kind;

      tally.set(reaction.postId, row);
    }

    // Saves, reposts and views for this page — three small reads rather than
    // three per post.
    const saves = postIds.length
      ? await FeedSave.findAll({
          where: { postId: { [Op.in]: postIds } },
          attributes: ["postId", "userId"],
          raw: true,
        })
      : [];

    const reposts = postIds.length
      ? await FeedPost.findAll({
          where: { repostOfId: { [Op.in]: postIds }, archivedAt: null },
          attributes: ["repostOfId", "authorId"],
          raw: true,
        })
      : [];

    const views = postIds.length
      ? await FeedView.findAll({
          where: { postId: { [Op.in]: postIds } },
          attributes: ["postId", "userId"],
          raw: true,
        })
      : [];

    // Which of these this reader had already seen before this read. Anything
    // not in here is about to become a new view, and the count below says so
    // rather than being a read behind.
    const seenBefore = new Set(
      views.filter((row) => row.userId === req.user.id).map((row) => row.postId),
    );

    const count2 = (list, key) => {
      const map = new Map();
      for (const row of list) {
        map.set(row[key], (map.get(row[key]) || 0) + 1);
      }
      return map;
    };

    const saveCount = count2(saves, "postId");
    const repostCount = count2(reposts, "repostOfId");
    const viewCount = count2(views, "postId");

    const savedByMe = new Set(
      saves.filter((row) => row.userId === req.user.id).map((row) => row.postId),
    );

    const repostedByMe = new Set(
      reposts
        .filter((row) => row.authorId === req.user.id)
        .map((row) => row.repostOfId),
    );

    // Having a post on screen is a view, counted once per person however
    // often they scroll past. Recorded here because this is the moment it
    // actually happens; duplicates are dropped by the unique index.
    if (postIds.length) {
      await FeedView.bulkCreate(
        postIds.map((postId) => ({ postId, userId: req.user.id })),
        { ignoreDuplicates: true },
      ).catch(() => {});
    }

    // Every person named anywhere on this page — post authors, the authors
    // of what they reshared, and everyone who commented — resolved to their
    // business in one read.
    const businessFor = await businessesFor([
      ...rows.map((row) => row.author),
      ...rows.map((row) => row.repostOf?.author),
      ...comments.map((comment) => comment.author),
    ]);

    const data = rows.map((row) => {
      const post = row.toJSON();
      const all = byPost.get(row.id) || [];
      const mood = tally.get(row.id) || { counts: {}, mine: null };

      return {
        reactions: mood.counts,
        reactionCount: Object.values(mood.counts).reduce(
          (sum, n) => sum + n,
          0,
        ),
        myReaction: mood.mine,
        uuid: post.uuid,
        title: post.title,
        body: post.body,
        imageUrl: post.imageUrl,
        createdAt: post.createdAt,
        author: shapePerson(post.author, businessFor),

        // The post this one reshares, if any.
        repostOf: post.repostOf
          ? {
              uuid: post.repostOf.uuid,
              title: post.repostOf.title,
              body: post.repostOf.body,
              imageUrl: post.repostOf.imageUrl,
              createdAt: post.repostOf.createdAt,
              author: shapePerson(post.repostOf.author, businessFor),
            }
          : null,

        repostCount: repostCount.get(row.id) || 0,
        reposted: repostedByMe.has(row.id),
        saveCount: saveCount.get(row.id) || 0,
        saved: savedByMe.has(row.id),
        // Counted at the moment it happens, this read included — so a reader
        // seeing a post for the first time is already in the number.
        viewCount:
          (viewCount.get(row.id) || 0) + (seenBefore.has(row.id) ? 0 : 1),
        // Whether this reader may take it down, answered here so the page
        // never has to work out the rule for itself.
        canRemove: mayRemove(req, row),
        commentCount: all.length,
        // The newest few, in reading order.
        comments: all
          .slice(-PREVIEW_COMMENTS)
          .map((comment) => shapeComment(comment, businessFor)),
        // Who is in the conversation, for the row of faces under a post.
        commenters: [
          ...new Map(
            all
              .filter((comment) => comment.author)
              .map((comment) => [
                comment.author.uuid,
                shapePerson(comment.author, businessFor),
              ]),
          ).values(),
        ],
      };
    });

    successResponse(res, {
      count,
      offset,
      limit,
      hasMore: offset + rows.length < count,
      data,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const createPost = async (req, res) => {
  try {
    const body = String(req.body.body || "").trim();

    if (!body) {
      return res
        .status(400)
        .json({ status: false, message: "Write something to post" });
    }

    const post = await FeedPost.create({
      authorId: req.user.id,
      title: String(req.body.title || "").trim() || null,
      body,
      imageUrl: req.file ? `/files/${req.file.filename}` : null,
    });

    const saved = await FeedPost.findOne({
      where: { id: post.id },
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "uuid", "name", "role", "image"],
        },
      ],
    });

    const shaped = saved.toJSON();

    successResponse(res, {
      uuid: shaped.uuid,
      title: shaped.title,
      body: shaped.body,
      imageUrl: shaped.imageUrl,
      createdAt: shaped.createdAt,
      author: shapePerson(
        shaped.author,
        await businessesFor([shaped.author]),
      ),
      canRemove: true,
      commentCount: 0,
      comments: [],
      commenters: [],
      reactions: {},
      reactionCount: 0,
      myReaction: null,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const removePost = async (req, res) => {
  try {
    const post = await FeedPost.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!post) {
      return res.status(404).json({ status: false, message: "Post not found" });
    }

    if (!mayRemove(req, post)) {
      return res
        .status(403)
        .json({ status: false, message: "This is not your post" });
    }

    await post.update({ archivedAt: new Date() });
    successResponse(res, { uuid: post.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Like, dislike, or take it back.
//
// One handler for all three, because they are one act: the reader is saying
// what they now think of the post, and what they thought before is replaced.
// Sending the same value again clears it, which is what tapping a lit button
// means everywhere else.
const reactToPost = async (req, res) => {
  try {
    // An empty kind means "take it back", which is a thing a reader does as
    // deliberately as reacting in the first place.
    const wanted = String(req.body.kind || "").trim().toLowerCase();

    if (wanted && !FeedReaction.KINDS.includes(wanted)) {
      return res.status(400).json({
        status: false,
        message:
          "A reaction is one of " +
          FeedReaction.KINDS.join(", ") +
          ", or empty to take it back",
      });
    }

    const post = await FeedPost.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!post) {
      return res.status(404).json({ status: false, message: "Post not found" });
    }

    const existing = await FeedReaction.findOne({
      where: { postId: post.id, userId: req.user.id },
    });

    // Sending the reaction that is already set clears it, which is what
    // tapping a lit button means everywhere else.
    if (!wanted || (existing && existing.kind === wanted)) {
      if (existing) await existing.destroy();
    } else if (existing) {
      await existing.update({ kind: wanted });
    } else {
      await FeedReaction.create({
        postId: post.id,
        userId: req.user.id,
        kind: wanted,
      });
    }

    // Counted from the rows rather than adjusted in the client's head, so
    // two people reacting at once still leaves the numbers true.
    const rows = await FeedReaction.findAll({
      where: { postId: post.id },
      attributes: ["userId", "kind"],
      raw: true,
    });

    const counts = {};

    for (const row of rows) {
      counts[row.kind] = (counts[row.kind] || 0) + 1;
    }

    successResponse(res, {
      uuid: post.uuid,
      reactions: counts,
      reactionCount: rows.length,
      myReaction: rows.find((row) => row.userId === req.user.id)?.kind || null,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Reshare a post, or take the reshare back.
//
// A repost is a post of its own pointing at the original, so it appears in
// the feed under the name of whoever reshared it and can be removed like any
// other post. Reposting a repost points at the original instead — a chain of
// reposts of reposts tells a reader nothing.
const repostPost = async (req, res) => {
  try {
    const target = await FeedPost.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!target) {
      return res.status(404).json({ status: false, message: "Post not found" });
    }

    const original = target.repostOfId
      ? await FeedPost.findOne({
          where: { id: target.repostOfId, archivedAt: null },
        })
      : target;

    if (!original) {
      return res
        .status(404)
        .json({ status: false, message: "The original post is gone" });
    }

    const mine = await FeedPost.findOne({
      where: {
        repostOfId: original.id,
        authorId: req.user.id,
        archivedAt: null,
      },
    });

    // Reposting again takes it back, the way tapping a lit button does
    // everywhere else on this page.
    if (mine) {
      await mine.update({ archivedAt: new Date() });

      return successResponse(res, {
        uuid: original.uuid,
        reposted: false,
        repostCount: await FeedPost.count({
          where: { repostOfId: original.id, archivedAt: null },
        }),
      });
    }

    await FeedPost.create({
      authorId: req.user.id,
      repostOfId: original.id,
      // A plain reshare says nothing of its own; a comment on it belongs in
      // the comments.
      body: String(req.body.body || "").trim(),
    });

    successResponse(res, {
      uuid: original.uuid,
      reposted: true,
      repostCount: await FeedPost.count({
        where: { repostOfId: original.id, archivedAt: null },
      }),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Save a post, or unsave it. Private to whoever saved it.
const savePost = async (req, res) => {
  try {
    const post = await FeedPost.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!post) {
      return res.status(404).json({ status: false, message: "Post not found" });
    }

    const existing = await FeedSave.findOne({
      where: { postId: post.id, userId: req.user.id },
    });

    if (existing) await existing.destroy();
    else await FeedSave.create({ postId: post.id, userId: req.user.id });

    successResponse(res, {
      uuid: post.uuid,
      saved: !existing,
      saveCount: await FeedSave.count({ where: { postId: post.id } }),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Every comment on one post, for when the preview under it is not enough.
const getComments = async (req, res) => {
  try {
    const post = await FeedPost.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!post) {
      return res.status(404).json({ status: false, message: "Post not found" });
    }

    const rows = await FeedComment.findAll({
      where: { postId: post.id, archivedAt: null },
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "uuid", "name", "role", "image"],
        },
      ],
      order: [
        ["createdAt", "ASC"],
        ["id", "ASC"],
      ],
    });

    const businessFor = await businessesFor(rows.map((row) => row.author));

    successResponse(res, {
      count: rows.length,
      data: rows.map((row) => ({
        ...shapeComment(row, businessFor),
        canRemove: mayRemove(req, row),
      })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const createComment = async (req, res) => {
  try {
    const body = String(req.body.body || "").trim();

    if (!body) {
      return res
        .status(400)
        .json({ status: false, message: "Write something to reply" });
    }

    const post = await FeedPost.findOne({
      where: { uuid: req.params.uuid, archivedAt: null },
    });

    if (!post) {
      return res.status(404).json({ status: false, message: "Post not found" });
    }

    const comment = await FeedComment.create({
      postId: post.id,
      authorId: req.user.id,
      body,
    });

    const saved = await FeedComment.findOne({
      where: { id: comment.id },
      include: [
        {
          model: User,
          as: "author",
          attributes: ["id", "uuid", "name", "role", "image"],
        },
      ],
    });

    successResponse(res, {
      ...shapeComment(saved, await businessesFor([saved.author])),
      canRemove: true,
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

const removeComment = async (req, res) => {
  try {
    const comment = await FeedComment.findOne({
      where: { uuid: req.params.commentUuid, archivedAt: null },
    });

    if (!comment) {
      return res
        .status(404)
        .json({ status: false, message: "Comment not found" });
    }

    if (!mayRemove(req, comment)) {
      return res
        .status(403)
        .json({ status: false, message: "This is not your comment" });
    }

    await comment.update({ archivedAt: new Date() });
    successResponse(res, { uuid: comment.uuid });
  } catch (error) {
    errorResponse(res, error);
  }
};

// Who else is here. Feeds the faces beside the feed, and answers "how big is
// this community?" without a second screen.
const getFeedMembers = async (req, res) => {
  try {
    const count = await User.count({ where: { activated: true } });

    const recent = await User.findAll({
      where: { activated: true },
      attributes: ["id", "uuid", "name", "role", "image"],
      order: [["createdAt", "DESC"]],
      limit: 8,
    });

    // Who is talking, counted over the posts and comments themselves.
    const [voices] = await sequelize.query(
      `SELECT u.id, u.uuid, u.name, u.role, u.image, COUNT(*) AS posts
         FROM feed_posts p
         JOIN Users u ON u.id = p.authorId
        WHERE p.archivedAt IS NULL
        GROUP BY u.id, u.uuid, u.name, u.role, u.image
        ORDER BY posts DESC
        LIMIT 5`,
    );

    // Startups are named here the same way they are named on a post: by
    // their business.
    const people = [...recent.map((row) => row.toJSON()), ...voices];
    const businessFor = await businessesFor(people);

    successResponse(res, {
      members: count,
      recent: recent.map((row) => shapePerson(row.toJSON(), businessFor)),
      mostActive: voices.map((row) => ({
        ...shapePerson(row, businessFor),
        posts: Number(row.posts),
      })),
    });
  } catch (error) {
    errorResponse(res, error);
  }
};

module.exports = {
  getFeed,
  createPost,
  removePost,
  reactToPost,
  repostPost,
  savePost,
  getComments,
  createComment,
  removeComment,
  getFeedMembers,
};
