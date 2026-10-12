import { NextResponse } from "next/server";
import { cancelBooking, rescheduleBooking } from "@/lib/booking";

// Client-side manage actions from /booking/<token>: cancel or move.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = (await req.json().catch(() => ({}))) as { action?: string; start?: string };
  if (body.action === "cancel") {
    const r = await cancelBooking(token);
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  }
  if (body.action === "reschedule" && typeof body.start === "string" && !Number.isNaN(Date.parse(body.start))) {
    const r = await rescheduleBooking(token, body.start);
    return NextResponse.json(r, { status: r.ok ? 200 : 409 });
  }
  return NextResponse.json({ error: "Invalid request." }, { status: 400 });
}
