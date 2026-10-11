import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot filled: report success, store nothing.
  if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ ok: true });

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  const source = typeof body.source === "string" ? body.source.slice(0, 40) : null;

  // Re-joining after unsubscribing reactivates the same row (and keeps the
  // same unsubscribe token). The response is identical either way, so the
  // form can't be used to check who is on the list.
  await prisma.subscriber.upsert({
    where: { email },
    create: { email, source },
    update: { status: "ACTIVE", unsubscribedAt: null },
  });
  return NextResponse.json({ ok: true });
}
