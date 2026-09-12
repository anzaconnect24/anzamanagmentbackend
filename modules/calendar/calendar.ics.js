"use strict";

// A calendar as an .ics file, for the reader's own calendar app.
//
// RFC 5545 is fussy in a few specific ways and forgiving nowhere, so the
// fussiness lives here rather than being spread through the controller.

// Escaped per RFC 5545 3.3.11. The backslash goes first, or it escapes the
// escapes added after it.
const escape = (value) =>
  String(value == null ? "" : value)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

// Lines are folded at 75 octets, continuations starting with one space.
// Counted in bytes rather than characters: a name in a title can be several
// bytes per character, and folding by character overruns the limit.
const fold = (line) => {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;

  const parts = [];
  let cut = 0;

  while (cut < bytes.length) {
    // 75 on the first line, 74 on the rest to leave room for the leading space.
    let take = Math.min(cut === 0 ? 75 : 74, bytes.length - cut);

    // Never split a multi-byte character: back off to a leading byte.
    while (take > 1 && (bytes[cut + take] & 0xc0) === 0x80) take -= 1;

    parts.push(
      (cut === 0 ? "" : " ") + bytes.slice(cut, cut + take).toString("utf8"),
    );
    cut += take;
  }

  return parts.join("\r\n");
};

const stamp = (date) =>
  `${date.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;

const dateOnly = (value) => String(value || "").slice(0, 10).replace(/-/g, "");

// DTEND is exclusive for all-day events: a single day ends "the next day".
const dayAfter = (value) => {
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10).replace(/-/g, "");
};

const timeOnly = (value) => {
  const [hours = "0", minutes = "0"] = String(value || "").split(":");
  return `${hours.padStart(2, "0")}${minutes.padStart(2, "0")}00`;
};

// A timed event is written as floating local time: no Z, no TZID. These are
// entries like "the workshop at 09:00", which mean nine o'clock where the
// reader is. Pinning them to a zone would move them for anyone travelling, and
// the platform has never asked anybody what zone they are in.
const vevent = (event, host) => {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.uuid}@${host}`,
    `DTSTAMP:${stamp(new Date(event.updatedAt || Date.now()))}`,
    `SUMMARY:${escape(event.title)}`,
  ];

  const start = dateOnly(event.startDate);
  const end = String(event.endDate || "").slice(0, 10) || event.startDate;

  if (event.startTime) {
    lines.push(`DTSTART:${start}T${timeOnly(event.startTime)}`);
    lines.push(
      `DTEND:${dateOnly(end)}T${timeOnly(event.endTime || event.startTime)}`,
    );
  } else {
    lines.push(`DTSTART;VALUE=DATE:${start}`);
    lines.push(`DTEND;VALUE=DATE:${dayAfter(end)}`);
  }

  if (event.description) lines.push(`DESCRIPTION:${escape(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escape(event.location)}`);

  // What the reader already said, so an invitation they declined does not sit
  // in their own calendar looking accepted.
  if (event.myResponse === "declined") lines.push("STATUS:CANCELLED");
  else if (event.myResponse === "tentative") lines.push("STATUS:TENTATIVE");
  else lines.push("STATUS:CONFIRMED");

  // A private reminder stays nobody else's business even once it has been
  // pulled into a shared work calendar.
  lines.push(event.personal ? "CLASS:PRIVATE" : "CLASS:PUBLIC");

  lines.push("END:VEVENT");
  return lines;
};

const buildIcs = (events, { name, host }) => {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Anza//Platform Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escape(name)}`,
    // How often a client should come back. A hint only: Google in particular
    // reads it as a suggestion and refreshes on its own schedule.
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];

  for (const event of events) lines.push(...vevent(event, host));

  lines.push("END:VCALENDAR");

  // CRLF throughout, including a trailing one: some clients drop the last
  // line without it.
  return lines.map(fold).join("\r\n") + "\r\n";
};

module.exports = { buildIcs };
