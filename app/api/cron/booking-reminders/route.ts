import { NextResponse } from "next/server";
import { getBookingSettings, sendBookingEmail } from "@/lib/booking";
import { prisma } from "@/lib/prisma";

// Runs hourly (vercel.json). Sends each client one reminder about a day
// before their call. Vercel signs cron calls with CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const now = Date.now();
  const due = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminderSentAt: null,
      startAt: { gt: new Date(now + 60 * 60_000), lte: new Date(now + 24 * 3_600_000) },
    },
  });
  const s = await getBookingSettings();
  for (const b of due) {
    // Claim first so overlapping runs can't double-send.
    const claimed = await prisma.booking.updateMany({ where: { id: b.id, reminderSentAt: null }, data: { reminderSentAt: new Date() } });
    if (claimed.count) await sendBookingEmail(b, s, "reminder");
  }
  return NextResponse.json({ sent: due.length });
}
