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
  const weekly: Record<string, [string, string][]> = {};
  for (let d = 0; d < 7; d++) {
    const on = form.get(`day${d}_on`) === "on";
    const start = String(form.get(`day${d}_start`) ?? "");
    const end = String(form.get(`day${d}_end`) ?? "");
    weekly[String(d)] = on && TIME_RE.test(start) && TIME_RE.test(end) && start < end ? [[start, end]] : [];
  }
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
