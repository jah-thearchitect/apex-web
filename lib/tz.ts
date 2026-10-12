// Wall-clock <-> UTC conversion for a named time zone, using only Intl.
// Booking hours are defined in the firm's zone (e.g. 10:00 New York), and
// DST shifts the UTC offset, so every conversion asks Intl for that day.

function partsIn(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short",
  });
  const p: Record<string, string> = {};
  for (const { type, value } of fmt.formatToParts(date)) p[type] = value;
  return p;
}

/** Offset of `timeZone` from UTC at `date`, in ms (New York in winter: -5h). */
function offsetMs(date: Date, timeZone: string) {
  const p = partsIn(date, timeZone);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** The UTC instant for wall-clock y-m-d hh:mm in `timeZone`. */
export function zonedToUtc(y: number, m: number, d: number, hh: number, mm: number, timeZone: string): Date {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const off1 = offsetMs(new Date(guess), timeZone);
  let t = guess - off1;
  const off2 = offsetMs(new Date(t), timeZone);
  if (off2 !== off1) t = guess - off2;
  return new Date(t);
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Calendar date and weekday of `date` as seen in `timeZone`. */
export function zonedYmd(date: Date, timeZone: string) {
  const p = partsIn(date, timeZone);
  return { y: +p.year, m: +p.month, d: +p.day, weekday: WEEKDAYS[p.weekday] };
}

/** y-m-d plus `days`, as plain calendar math (no zone involved). */
export function addDays(y: number, m: number, d: number, days: number) {
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), weekday: t.getUTCDay() };
}

export const ymdKey = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export function formatInZone(date: Date, timeZone: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { timeZone, ...opts }).format(date);
}

/** "Friday, October 23, 2026 at 10:00 AM EDT" */
export function longDateTime(date: Date, timeZone: string) {
  return formatInZone(date, timeZone, {
    weekday: "long", month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
}
