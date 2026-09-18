// Minimal hand-rolled ICS (iCalendar) builder — no dependency needed for one
// VEVENT. MVP-scoped: attaches all three parties as ATTENDEEs (no RSVP
// tracking/real invites sent server-side), 30-minute default duration, and a
// placeholder video link since there's no real video-call integration yet.
//
// The ORGANIZER is caller-supplied (see organizerName/organizerEmail below)
// rather than hardcoded here, deliberately kept separate from
// THIRD_PARTY_ATTENDEE — the organizer should be LandIt's own sending
// identity (see lib/email.js's getOrganizerIdentity, which ties it to
// whatever domain EMAIL_FROM actually sends from), while Joe still just
// rides along as a third attendee on every call regardless of who's
// configured as the sender.
function escapeText(str = "") {
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function toIcsUtc(date) {
  return new Date(date)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function foldLine(line) {
  // RFC 5545 recommends folding lines over 75 octets — most clients tolerate
  // long lines fine, but folding keeps us honest for anything picky (some
  // older Outlook builds included).
  if (line.length <= 75) return line;
  const chunks = [];
  let rest = line;
  while (rest.length > 75) {
    chunks.push(rest.slice(0, 75));
    rest = " " + rest.slice(75);
  }
  chunks.push(rest);
  return chunks.join("\r\n");
}

const THIRD_PARTY_ATTENDEE = { name: "Joe @ LandIt", email: "joe@trylandit.io" };

export function buildMeetingIcs({
  uid,
  scheduledAt,
  durationMinutes = 30,
  summary,
  description,
  companyName,
  companyEmail,
  repName,
  repEmail,
  organizerName = "LandIt",
  organizerEmail = THIRD_PARTY_ATTENDEE.email,
}) {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

  const attendees = [
    { name: companyName, email: companyEmail },
    { name: repName, email: repEmail },
    THIRD_PARTY_ATTENDEE,
  ].filter((a) => a.email);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//LandIt//Interview Scheduling//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    `ORGANIZER;CN=${escapeText(organizerName)}:mailto:${organizerEmail}`,
    ...attendees.map(
      (a) => `ATTENDEE;CN=${escapeText(a.name || a.email)};ROLE=REQ-PARTICIPANT:mailto:${a.email}`
    ),
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
