import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminId } from "@/lib/session";
import { isMonth, monthBounds, ymdOf } from "@/lib/workLogShared";

// Work log for one month as a CSV (admin only). Optional ?client=<id>.
const cell = (v: string | number | boolean | null) => {
  let s = v === null ? "" : String(v);
  // A leading = + - @ would run as a formula when opened in a spreadsheet.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  if (!(await getAdminId())) return new NextResponse("Not found", { status: 404 });
  const url = new URL(req.url);
  const month = url.searchParams.get("month");
  if (!isMonth(month)) return new NextResponse("Bad month", { status: 400 });
  const clientId = url.searchParams.get("client") || undefined;
  const { from, to } = monthBounds(month);
  const rows = await prisma.workLog.findMany({
    where: { workDate: { gte: from, lte: to }, ...(clientId ? { clientId } : {}) },
    orderBy: [{ client: { businessName: "asc" } }, { workDate: "asc" }, { createdAt: "asc" }],
    include: { client: { select: { businessName: true } } },
  });
  const lines = [
    ["Date", "Client", "Project", "Category", "Title", "Details", "Minutes", "In client report"].map(cell).join(","),
    ...rows.map((r) => [ymdOf(r.workDate), r.client.businessName, r.project, r.category, r.title, r.details, r.minutes, r.visible ? "yes" : "no"].map((v) => cell(v as string | number | null)).join(",")),
  ];
  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="work-log-${month}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
