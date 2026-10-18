import { NextResponse } from "next/server";
import { notifyFirm } from "@/lib/billing";
import { publishDuePosts } from "@/lib/postSchedule";
import { SITE_URL } from "@/lib/site";

// Hourly (vercel.json): publishes scheduled Minutes posts whose time has
// come and emails them. Vercel signs cron calls with CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const results = await publishDuePosts();
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    await notifyFirm("Scheduled post problem", [
      ...failed.map((r) => `${r.slug}: ${r.error}`),
      "",
      `Check it in Admin: ${SITE_URL}/admin/posts`,
    ]);
  }
  return NextResponse.json({ published: results });
}
