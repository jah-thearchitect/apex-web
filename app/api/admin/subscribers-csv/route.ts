import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminId } from "@/lib/session";

// Export for moving to Mailchimp or another provider later. Leaves out
// unsubscribe tokens, which are secrets.
export async function GET() {
  if (!(await getAdminId())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const subs = await prisma.subscriber.findMany({ orderBy: { createdAt: "asc" } });
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [
    "first_name,last_name,email,status,source,joined,unsubscribed",
    ...subs.map((s) =>
      [q(s.firstName), q(s.lastName ?? ""), q(s.email), s.status.toLowerCase(), q(s.source ?? ""), s.createdAt.toISOString(), s.unsubscribedAt?.toISOString() ?? ""].join(",")
    ),
  ];
  return new NextResponse(rows.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="mastermind-minutes-subscribers.csv"`,
    },
  });
}
