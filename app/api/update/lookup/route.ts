import { NextResponse } from "next/server";
import { emailUpdateLink } from "@/lib/briefs";
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const THROTTLE_MS = 10 * 60 * 1000;

// Footer "Client updates": emails a client their private update link. The
// reply is the same whether or not the email belongs to a client, so the
// form can't be used to find out who the firm works with.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const ok = NextResponse.json({ ok: true });
  if (typeof body.website === "string" && body.website) return ok; // honeypot

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 254) : "";
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });

  const clients = await prisma.client.findMany({
    where: { email: { equals: email, mode: "insensitive" }, status: { not: "PAST" } },
  });
  for (const c of clients) {
    if (c.updateLinkSentAt && Date.now() - c.updateLinkSentAt.getTime() < THROTTLE_MS) continue;
    try {
      await emailUpdateLink(c);
      await prisma.client.update({ where: { id: c.id }, data: { updateLinkSentAt: new Date() } });
    } catch (err) {
      console.error("Update link email failed:", err);
    }
  }
  return ok;
}
