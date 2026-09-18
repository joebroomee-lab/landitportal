// A short, curated list rather than the full IANA database — LandIt is a UK
// marketplace, so UK-first, with the other zones a company or rep here is
// realistically in. Keeps the picker a simple dropdown instead of a
// searchable 400-option list.
export const TIMEZONES = [
  { value: "Europe/London", label: "London (UK)" },
  { value: "Europe/Dublin", label: "Dublin" },
  { value: "Europe/Paris", label: "Paris / Berlin / Madrid (CET)" },
  { value: "Europe/Athens", label: "Athens / Helsinki (EET)" },
  { value: "America/New_York", label: "New York (ET)" },
  { value: "America/Chicago", label: "Chicago (CT)" },
  { value: "America/Denver", label: "Denver (MT)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PT)" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Asia/Kolkata", label: "Mumbai / Delhi (IST)" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "UTC", label: "UTC" },
];

// How far the target IANA zone's wall clock sits from UTC at a given instant
// (in ms). Uses Intl's own timezone database rather than a hardcoded offset
// table, so it's correct across DST automatically.
function tzOffsetMs(timeZone, date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date).reduce((acc, p) => {
    acc[p.type] = p.value;
    return acc;
  }, {});
  const asIfUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    parts.hour === "24" ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asIfUTC - date.getTime();
}

// Converts a wall-clock date+time as understood in `timeZone` into the
// correct absolute UTC Date. E.g. ("2026-10-14", "14:00", "America/New_York")
// -> the Date representing 2026-10-14T18:00:00Z (EDT is UTC-4 in October).
export function zonedTimeToUtc(dateStr, timeStr, timeZone) {
  if (!dateStr || !timeStr || !timeZone) return null;
  const approx = new Date(`${dateStr}T${timeStr}:00.000Z`);
  const offsetMs = tzOffsetMs(timeZone, approx);
  return new Date(approx.getTime() - offsetMs);
}

// Renders a UTC instant back as "Mon 14 Oct, 2:00 PM" in the given zone —
// used so each side sees a proposed time in their own local clock rather
// than whichever zone the other side picked it in.
export function formatInZone(date, timeZone) {
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).formatToParts(new Date(date));
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  return `${get("weekday")} ${get("day")} ${get("month")}, ${get("hour")}:${get("minute")}${get("dayPeriod")}`;
}

export function guessBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
  } catch {
    return "Europe/London";
  }
}
