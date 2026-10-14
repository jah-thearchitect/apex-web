import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BriefForm } from "@/components/BriefForm";
import { PageShell } from "@/components/PageShell";
import type { Answers } from "@/lib/briefQuestions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Build brief", robots: { index: false, follow: false } };

export default async function BriefPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const brief = await prisma.buildBrief.findUnique({ where: { token }, include: { client: true } });
  if (!brief) notFound();
  const c = brief.client;

  if (brief.status === "SUBMITTED") {
    return (
      <PageShell>
        <section className="brief-wrap">
          <div className="brief-done">
            <p className="eyebrow">BUILD BRIEF RECEIVED</p>
            <h1>Your brief is in.</h1>
            <p>{c.businessName}&rsquo;s build brief was submitted, so this form is closed. Need to add or change something?</p>
            <Link className="btn-solid" style={{ marginTop: 24 }} href={`/update/${c.requestToken}`}>Send an update →</Link>
          </div>
        </section>
      </PageShell>
    );
  }

  // First visit: fill in what Apex already knows.
  const saved = (brief.answers ?? {}) as Answers;
  const initial: Answers = Object.keys(saved).length
    ? saved
    : { biz_name: c.businessName, contact_name: c.contactName, contact_email: c.email, contact_phone: c.phone ?? "" };

  return (
    <PageShell>
      <section className="brief-wrap">
        <BriefForm token={token} businessName={c.businessName} initialAnswers={initial} initialStep={brief.step} />
      </section>
    </PageShell>
  );
}
