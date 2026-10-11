import { NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/unsubscribe";

// RFC 8058 one-click unsubscribe: Gmail and Apple Mail POST here directly
// from their own "Unsubscribe" button, using the List-Unsubscribe header.
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  if (token) await unsubscribeByToken(token);
  return NextResponse.json({ ok: true });
}
