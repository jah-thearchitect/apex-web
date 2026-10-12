import { NextResponse } from "next/server";
import { availableSlots, bookingEnabled, getBookingSettings } from "@/lib/booking";

export const dynamic = "force-dynamic";

export async function GET() {
  const [enabled, s] = await Promise.all([bookingEnabled(), getBookingSettings()]);
  if (!enabled) return NextResponse.json({ enabled: false, days: [] });
  const days = await availableSlots();
  return NextResponse.json(
    { enabled: true, timezone: s.timezone, durationMin: s.durationMin, title: s.title, days },
    { headers: { "Cache-Control": "no-store" } }
  );
}
