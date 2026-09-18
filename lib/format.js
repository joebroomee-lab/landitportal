// toLocaleString's punctuation for the same options can differ between ICU
// implementations (Node on the server vs. the browser's engine on the
// client render "Tue 1 Sep" vs "Tue, 1 Sep" for identical input) — since
// this runs inside a client component that's also server-rendered, that
// drift trips React's hydration check. formatToParts gives back the
// individual named pieces (weekday/day/month/hour/minute), which stay
// consistent across engines, and we assemble them into a fixed template
// ourselves so the string is identical wherever it renders.
export function formatMeetingTime(scheduledAt) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  }).formatToParts(new Date(scheduledAt));
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  return `${get("weekday")} ${get("day")} ${get("month")}, ${get("hour")}:${get("minute")}`;
}
