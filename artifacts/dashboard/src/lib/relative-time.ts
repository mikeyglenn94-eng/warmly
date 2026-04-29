// Cheap relative-time formatter built on Intl.RelativeTimeFormat.
// "3 days ago", "in 5 minutes", "now". Past timestamps render with
// negative diffs so RelativeTimeFormat appends "ago" automatically.

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function relativeTime(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const abs = Math.abs(ms);
  const fmt = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (abs < MINUTE) return fmt.format(Math.round(ms / SECOND), "second");
  if (abs < HOUR) return fmt.format(Math.round(ms / MINUTE), "minute");
  if (abs < DAY) return fmt.format(Math.round(ms / HOUR), "hour");
  if (abs < MONTH) return fmt.format(Math.round(ms / DAY), "day");
  if (abs < YEAR) return fmt.format(Math.round(ms / MONTH), "month");
  return fmt.format(Math.round(ms / YEAR), "year");
}
