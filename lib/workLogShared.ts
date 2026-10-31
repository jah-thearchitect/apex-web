// Work-log pieces shared by the admin form and pages (no server-only imports).

export const WORK_CATEGORIES = [
  "Feature build",
  "AI integration",
  "Strategy & brainstorming",
  "Marketing session",
  "Update request",
  "Bug fix & support",
  "Security & maintenance",
  "Calls & project management",
  "Content",
  "Research & setup",
] as const;

export const REQUEST_CATEGORY = "Update request";

/** "1h 30m", "45m", "2h"; blank when no time was logged. */
export function minutesLabel(m: number | null | undefined) {
  if (!m || m <= 0) return "";
  const h = Math.floor(m / 60);
  const r = m % 60;
  return [h ? `${h}h` : "", r ? `${r}m` : ""].filter(Boolean).join(" ");
}

/** A @db.Date column comes back as UTC midnight; this is its YYYY-MM-DD. */
export const ymdOf = (d: Date) => d.toISOString().slice(0, 10);

export const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
};

export const shortDate = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
};

/** First and last day (as UTC-midnight dates) of a "YYYY-MM" month. */
export function monthBounds(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return { from: new Date(Date.UTC(y, m - 1, 1)), to: new Date(Date.UTC(y, m, 0)) };
}

export const isMonth = (s: unknown): s is string => typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
