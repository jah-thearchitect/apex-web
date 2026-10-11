import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminId } from "@/lib/session";

export async function GET() {
  if (!(await getAdminId())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const [contacts, subs] = await Promise.all([
    prisma.contact.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.subscriber.findMany({ select: { email: true, status: true } }),
  ]);
  const subStatus = new Map(subs.map((s) => [s.email, s.status.toLowerCase()]));
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = [
    "first_name,last_name,email,sources,minutes,first_seen,last_activity",
    ...contacts.map((c) =>
      [
        q(c.firstName),
        q(c.lastName ?? ""),
        q(c.email),
        q(c.sources.join(" ")),
        subStatus.get(c.email) ?? "",
        c.createdAt.toISOString(),
        c.lastActivityAt.toISOString(),
      ].join(",")
    ),
  ];
  return new NextResponse(rows.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="apex-contacts.csv"`,
    },
  });
}
