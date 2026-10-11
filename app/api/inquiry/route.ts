import { NextResponse } from "next/server";
import { Resend } from "resend";
import { recordContact, splitName } from "@/lib/contacts";
import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(body: Record<string, unknown>, key: string, max: number) {
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

  // Honeypot filled: pretend success so the bot moves on, send nothing.
  if (field(body, "website", 200)) return NextResponse.json({ ok: true });

  const name = field(body, "name", 120);
  const email = field(body, "email", 254);
  const details = field(body, "details", 5000);

  if (!name || !details || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please fill in your name, a valid email, and what you want built." }, { status: 400 });
  }

  // Saved to the admin Contacts first, then emailed. The visitor sees
  // success if either one worked, since either way the firm has it.
  let saved = false;
  try {
    const contactId = await recordContact({ email, ...splitName(name), source: "inquiry" });
    await prisma.inquiry.create({ data: { contactId, name, email: email.toLowerCase(), details } });
    saved = true;
  } catch (err) {
    console.error("Inquiry save failed:", err);
  }

  if (!(await emailInquiry(name, email, details)) && !saved) {
    return NextResponse.json(
      { error: "Something went wrong and your inquiry wasn’t sent. Please try again." },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}

async function emailInquiry(name: string, email: string, details: string): Promise<boolean> {
  // The destination address lives only in server env. It must never be
  // sent to the browser or appear anywhere on the public site.
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.INQUIRY_TO_EMAIL;
  if (!apiKey || !from || !to) {
    console.warn("RESEND_API_KEY / RESEND_FROM_EMAIL / INQUIRY_TO_EMAIL not set — inquiry not emailed.");
    return false;
  }
  try {
    const { error } = await new Resend(apiKey).emails.send({
      from,
      to,
      replyTo: email,
      subject: `New Inquiry — ${name}`,
      text: [`Name: ${name}`, `Email: ${email}`, "", "What they want built:", details].join("\n"),
    });
    if (error) throw new Error(error.message);
    return true;
  } catch (err) {
    console.error("Inquiry email failed:", err);
    return false;
  }
}
