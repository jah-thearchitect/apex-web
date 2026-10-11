import { NextResponse } from "next/server";
import { recordContact } from "@/lib/contacts";
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(body: Record<string, unknown>, key: string, max: number) {
  const v = body[key];
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot filled: report success, store nothing.
  if (str(body, "website", 200)) return NextResponse.json({ ok: true });

  const email = str(body, "email", 254).toLowerCase();
  const firstName = str(body, "firstName", 60);
  const lastName = str(body, "lastName", 80) || null;
  const source = str(body, "source", 40) || null;
  if (!firstName) return NextResponse.json({ error: "Please enter your first name." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });

  // Re-joining after unsubscribing reactivates the same row (and keeps the
  // same unsubscribe token). The response is identical either way, so the
  // form can't be used to check who is on the list.
  await prisma.subscriber.upsert({
    where: { email },
    create: { email, firstName, lastName, source },
    update: { status: "ACTIVE", unsubscribedAt: null, firstName, lastName: lastName ?? undefined },
  });
  await recordContact({ email, firstName, lastName, source: "minutes" });
  return NextResponse.json({ ok: true });
}
