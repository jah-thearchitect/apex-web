import { NextResponse } from "next/server";
import { createBooking } from "@/lib/booking";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  // Honeypot filled: pretend success, book nothing.
  if (str(body.website, 200)) return NextResponse.json({ ok: true, token: null });

  const input = {
    start: str(body.start, 40),
    firstName: str(body.firstName, 60),
    lastName: str(body.lastName, 80),
    email: str(body.email, 254).toLowerCase(),
    phone: str(body.phone, 40),
    businessName: str(body.businessName, 160),
    topic: str(body.topic, 3000),
  };
  if (!input.start || Number.isNaN(Date.parse(input.start))) return NextResponse.json({ error: "Pick a time." }, { status: 400 });
  if (!input.firstName) return NextResponse.json({ error: "Please enter your first name." }, { status: 400 });
  if (!EMAIL_RE.test(input.email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (!input.topic) return NextResponse.json({ error: "Tell us briefly what you'd like to discuss." }, { status: 400 });

  const res = await createBooking(input);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 409 });
  return NextResponse.json({ ok: true, token: res.booking.token });
}
