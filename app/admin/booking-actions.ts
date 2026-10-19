"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cancelBooking } from "@/lib/booking";
import { disconnectGoogle } from "@/lib/google";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function saveBookingSettings(form: FormData): Promise<void> {
  await requireAdmin();
  const num = (k: string, min: number, max: number, dflt: number) => {
    const v = Math.round(Number(form.get(k)));
    return Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : dflt;
  };
  // Weekly hours: any number of windows per day, kept only if valid,
  // sorted, and not overlapping. Days off: future "YYYY-MM-DD" dates.
  let rawWeekly: Record<string, unknown> = {};
  try {
    rawWeekly = JSON.parse(String(form.get("weeklyHours") ?? "{}"));
  } catch {}
  const weekly: Record<string, [string, string][]> = {};
  for (let d = 0; d < 7; d++) {
    const list = Array.isArray(rawWeekly[String(d)]) ? (rawWeekly[String(d)] as unknown[]) : [];
    const ranges = list
      .filter((r): r is [string, string] => Array.isArray(r) && TIME_RE.test(String(r[0])) && TIME_RE.test(String(r[1])) && r[0] < r[1])
      .map(([a, b]) => [a, b] as [string, string])
      .sort((x, y) => x[0].localeCompare(y[0]))
      .slice(0, 6);
    weekly[String(d)] = ranges.filter((r, i) => i === 0 || r[0] >= ranges[i - 1][1]);
  }
  let rawOff: unknown = [];
  try {
    rawOff = JSON.parse(String(form.get("daysOff") ?? "[]"));
  } catch {}
  const daysOff = [...new Set((Array.isArray(rawOff) ? rawOff : []).filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort().slice(0, 200);
  const tz = String(form.get("timezone") ?? "America/New_York");
  let timezone = "America/New_York";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    timezone = tz;
  } catch {}

  await prisma.bookingSettings.upsert({
    where: { id: "singleton" },
    create: {},
    update: {
      title: String(form.get("title") ?? "").trim().slice(0, 80) || "Consultation",
      description: String(form.get("description") ?? "").trim().slice(0, 300),
      timezone,
      durationMin: num("durationMin", 15, 240, 60),
      bufferMin: num("bufferMin", 0, 120, 15),
      minNoticeHours: num("minNoticeHours", 0, 720, 72),
      windowDays: num("windowDays", 1, 120, 14),
      weeklyHours: JSON.stringify(weekly),
      daysOff,
    },
  });
  revalidatePath("/admin/settings");
  revalidatePath("/consultation");
  redirect("/admin/settings?bookingSaved=1#booking");
}

export async function disconnectGoogleAction(): Promise<void> {
  await requireAdmin();
  await disconnectGoogle();
  revalidatePath("/admin/settings");
  revalidatePath("/consultation");
  redirect("/admin/settings?google=disconnected#booking");
}

export async function adminCancelBooking(id: string): Promise<void> {
  await requireAdmin();
  const b = await prisma.booking.findUnique({ where: { id } });
  if (b) await cancelBooking(b.token);
  revalidatePath("/admin/bookings");
}
