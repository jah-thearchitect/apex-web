import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authUrl, googleConfigured } from "@/lib/google";
import { getAdminId } from "@/lib/session";
import { SITE_URL } from "@/lib/site";

// Admin-only: start the Google consent flow. The random `state` is kept in
// a short-lived cookie and checked on the way back to block forged callbacks.
export async function GET() {
  if (!(await getAdminId())) return NextResponse.redirect(`${SITE_URL}/admin/login`);
  if (!googleConfigured()) return NextResponse.redirect(`${SITE_URL}/admin/settings?google=missing-keys#booking`);
  const state = randomBytes(24).toString("base64url");
  (await cookies()).set("apex_google_state", state, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/api/google", maxAge: 600,
  });
  return NextResponse.redirect(authUrl(state));
}
