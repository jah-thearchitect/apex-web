import "server-only";
import { prisma } from "./prisma";
import { ymdKey, zonedYmd } from "./tz";
import { REQUEST_CATEGORY } from "./workLogShared";

const FIRM_TZ = "America/New_York";

/** Today's date in the firm's time zone, as YYYY-MM-DD. */
export function todayYmd() {
  const t = zonedYmd(new Date(), FIRM_TZ);
  return ymdKey(t.y, t.m, t.d);
}

export const currentMonth = () => todayYmd().slice(0, 7);

/** The month before `ym` ("2026-11" -> "2026-10"), for the month picker. */
export function shiftMonth(ym: string, by: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * When an update request is finished, it goes in the work log on its own
 * (no time yet; add that by editing the entry). Safe to call twice: an
 * existing entry, and any edits to it, are left alone.
 */
export async function logCompletedRequest(requestId: string, note: string) {
  try {
    const req = await prisma.changeRequest.findUnique({ where: { id: requestId } });
    if (!req) return;
    const done = req.completedAt ?? new Date();
    const days = Math.max(0, Math.round((done.getTime() - req.createdAt.getTime()) / 86_400_000));
    const t = zonedYmd(done, FIRM_TZ);
    const turnaround = days === 0 ? "Finished the same day it came in." : `Finished ${days} day${days === 1 ? "" : "s"} after it came in.`;
    await prisma.workLog.upsert({
      where: { requestId },
      update: {},
      create: {
        clientId: req.clientId,
        requestId,
        workDate: new Date(`${ymdKey(t.y, t.m, t.d)}T00:00:00.000Z`),
        project: req.build || null,
        category: REQUEST_CATEGORY,
        title: `${req.kind}: ${req.details.replace(/\s+/g, " ").slice(0, 90)}${req.details.length > 90 ? "…" : ""}`,
        details: [note.trim(), turnaround].filter(Boolean).join("\n\n"),
      },
    });
  } catch (err) {
    console.error("Work log entry for finished request failed:", err);
  }
}
