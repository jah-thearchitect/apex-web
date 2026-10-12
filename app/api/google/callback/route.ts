import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { completeConnection } from "@/lib/google";
import { getAdminId } from "@/lib/session";
import { SITE_URL } from "@/lib/site";

export async function GET(req: Request) {
  const back = (q: string) => NextResponse.redirect(`${SITE_URL}/admin/settings?google=${q}#booking`);
  if (!(await getAdminId())) return NextResponse.redirect(`${SITE_URL}/admin/login`);

  const url = new URL(req.url);
  const jar = await cookies();
  const expected = jar.get("apex_google_state")?.value;
  jar.delete({ name: "apex_google_state", path: "/api/google" });
  if (url.searchParams.get("error")) return back("denied");
  const code = url.searchParams.get("code");
  if (!code || !expected || url.searchParams.get("state") !== expected) return back("invalid");

  try {
    await completeConnection(code);
    return back("connected");
  } catch (err) {
    console.error("Google connect failed:", err);
    return back("failed");
  }
}
