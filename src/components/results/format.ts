/**
 * Display formatting for the results table. Pure functions, so they render the same on
 * the server and the client; anything that depends on "now" takes it as an argument.
 */

const DAY_MS = 86_400_000;

const integer = new Intl.NumberFormat("en-US");

// Dates in the data are calendar days ("YYYY-MM-DD"), so format them in UTC to keep
// the viewer's time zone from shifting them by a day.
const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const longDate = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const timestamp = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** "5305012345678" -> "5305-01-234-5678". Anything that is not 13 digits passes through. */
export function formatNsn(nsn: string): string {
  const match = /^(\d{4})(\d{2})(\d{3})(\d{4})$/.exec(nsn);
  return match ? match.slice(1).join("-") : nsn;
}

export function formatInteger(value: number): string {
  return integer.format(value);
}

/** "2026-10-09" -> "Oct 9". */
export function formatShortDate(isoDate: string): string {
  return shortDate.format(new Date(`${isoDate}T00:00:00Z`));
}

/** "2026-10-09" -> "Fri, Oct 9, 2026". */
export function formatLongDate(isoDate: string): string {
  return longDate.format(new Date(`${isoDate}T00:00:00Z`));
}

/** ISO timestamp -> "Oct 12, 2026, 3:26 PM" in the viewer's time zone. */
export function formatTimestamp(iso: string): string {
  return timestamp.format(new Date(iso));
}

/**
 * Whole calendar days from the viewer's today to `isoDate`: 0 is today, negative is past.
 * Rounding absorbs the 23 or 25 hour days around daylight saving changes.
 */
export function daysUntil(isoDate: string, now: number): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round(
    (new Date(year, month - 1, day).getTime() - today.getTime()) / DAY_MS,
  );
}

/** "just now", "12 min ago", "3 h ago", "2 days ago". */
export function formatAgo(iso: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}
