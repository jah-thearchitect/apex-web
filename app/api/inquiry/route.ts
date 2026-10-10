import { NextResponse } from "next/server";
import { Resend } from "resend";

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

  // The destination address lives only in server env. It must never be
  // sent to the browser or appear anywhere on the public site.
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const to = process.env.INQUIRY_TO_EMAIL;

  if (!apiKey || !from || !to) {
    console.warn("RESEND_API_KEY / RESEND_FROM_EMAIL / INQUIRY_TO_EMAIL not set — inquiry not sent.");
    return NextResponse.json(
      { error: "This form isn’t connected to our inbox yet, so nothing was sent. Please try again soon." },
      { status: 503 }
    );
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `New Inquiry — ${name}`,
      text: [`Name: ${name}`, `Email: ${email}`, "", "What they want built:", details].join("\n"),
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("Inquiry email failed:", err);
    return NextResponse.json(
      { error: "Something went wrong and your inquiry wasn’t sent. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
