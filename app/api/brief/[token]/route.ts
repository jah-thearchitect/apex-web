import { NextResponse } from "next/server";
import { notifyFirm } from "@/lib/billing";
import { cleanAnswers, missingIn, SECTIONS, visibleSections } from "@/lib/briefQuestions";
import { emailReceived } from "@/lib/briefs";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

const MAX_BODY = 300_000;

// Autosave (and final submit) for a client's build brief. The token in the
// URL is the only credential, same as invoice and quote links.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const brief = await prisma.buildBrief.findUnique({ where: { token }, include: { client: true } });
  if (!brief) return NextResponse.json({ error: "This link isn't valid." }, { status: 404 });
  if (brief.status === "SUBMITTED") {
    return NextResponse.json({ error: "This brief was already submitted. Contact Apex to make changes." }, { status: 409 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: "That's more than the form can save at once." }, { status: 413 });
  let body: { answers?: unknown; step?: unknown; submit?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const answers = cleanAnswers(body.answers, `briefs/${brief.id}/`);
  const step = Math.max(0, Math.min(SECTIONS.length, Math.round(Number(body.step) || 0)));
  const submit = body.submit === true;

  if (submit) {
    const sections = visibleSections(answers);
    const gap = sections.findIndex((s) => missingIn(s, answers).length > 0);
    if (gap !== -1) {
      return NextResponse.json(
        { error: `A few required answers in "${sections[gap].title}" are still empty.`, section: sections[gap].id },
        { status: 400 }
      );
    }
  }

  const now = new Date();
  // Only an unsubmitted brief can change, even if two tabs race.
  const updated = await prisma.buildBrief.updateMany({
    where: { id: brief.id, status: { not: "SUBMITTED" } },
    data: {
      answers,
      step,
      status: submit ? "SUBMITTED" : "STARTED",
      startedAt: brief.startedAt ?? now,
      submittedAt: submit ? now : undefined,
    },
  });
  if (updated.count === 0) return NextResponse.json({ error: "This brief was already submitted." }, { status: 409 });

  if (submit) {
    await notifyFirm(`Build brief submitted: ${brief.client.businessName}`, [
      `${brief.client.businessName} submitted their build brief.`,
      `Review it: ${SITE_URL}/admin/requests/brief/${brief.id}`,
    ]);
    const to = typeof answers.contact_email === "string" && answers.contact_email.includes("@") ? answers.contact_email : brief.client.email;
    const name = typeof answers.contact_name === "string" && answers.contact_name.trim() ? answers.contact_name : brief.client.contactName;
    await emailReceived(to, name, "brief", brief.client);
  }
  return NextResponse.json({ ok: true, savedAt: now.toISOString() });
}
