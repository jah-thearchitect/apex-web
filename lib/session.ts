import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Admin sessions are a signed cookie: "<adminId>.<expiresMs>.<hmac>". No
// session table — signing with SESSION_SECRET is what makes it trustworthy,
// so rotating that secret signs every admin out.
const COOKIE = "apex_admin";
const MAX_AGE_S = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set (32+ characters).");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export async function startSession(adminId: string) {
  const payload = `${adminId}.${Date.now() + MAX_AGE_S * 1000}`;
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in admin's id, or null. */
export async function getAdminId(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [id, exp, mac] = raw.split(".");
  if (!id || !exp || !mac) return null;
  const expected = Buffer.from(sign(`${id}.${exp}`));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  if (Number(exp) < Date.now()) return null;
  return id;
}

/** Use at the top of every admin page and admin server action. */
export async function requireAdmin(): Promise<string> {
  const id = await getAdminId();
  if (!id) redirect("/admin/login");
  return id;
}
