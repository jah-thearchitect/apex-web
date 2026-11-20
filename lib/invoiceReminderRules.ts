// When automatic invoice reminders go out. Pure rules (no database), so they
// can be tested on their own.

export type ReminderKind = "MANUAL" | "AUTO_48" | "AUTO_72";

const HOUR = 3_600_000;
const FIRM_TZ = "America/New_York";

// A run that is late still sends within this many hours of the mark, then
// gives up, so an old unpaid invoice never gets a burst of reminders.
const CATCH_UP_HOURS = 24;
// Only email clients during the working day (Eastern time): 8:00 to 6:59 pm.
const SEND_FROM_HOUR = 8;
const SEND_UNTIL_HOUR = 19;
// A reminder (automatic or by hand) holds off the next automatic one this long.
export const QUIET_HOURS = 12;

export const AUTO_LABEL: Record<ReminderKind, string> = { MANUAL: "Reminder", AUTO_48: "48-hour reminder", AUTO_72: "72-hour reminder" };

export function easternHour(now: Date) {
  const h = new Intl.DateTimeFormat("en-US", { timeZone: FIRM_TZ, hour: "numeric", hourCycle: "h23" }).format(now);
  return Number(h);
}

export function inSendingHours(now: Date) {
  const h = easternHour(now);
  return h >= SEND_FROM_HOUR && h < SEND_UNTIL_HOUR;
}

/** Which automatic reminder (if any) is due for an invoice sent at `sentAt`. */
export function dueAutoKind(sentAt: Date, now: Date): "AUTO_48" | "AUTO_72" | null {
  const age = (now.getTime() - sentAt.getTime()) / HOUR;
  if (age >= 72 && age < 72 + CATCH_UP_HOURS) return "AUTO_72";
  if (age >= 48 && age < 48 + CATCH_UP_HOURS) return "AUTO_48";
  return null;
}

/** Unique per invoice, send time and kind: sending the invoice again restarts the sequence. */
export const claimKey = (invoiceId: string, sentAt: Date, kind: ReminderKind) => `${invoiceId}:${sentAt.getTime()}:${kind}`;

/** Whole calendar days from `now` to the due date in Eastern time (negative once past due). */
export function daysUntilDue(dueDate: Date, now: Date) {
  const ymd = (d: Date) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: FIRM_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d).map((x) => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day);
  };
  return Math.round((ymd(dueDate) - ymd(now)) / 86_400_000);
}
