import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getAdminId } from "@/lib/session";

const MAX_BYTES = 8 * 1024 * 1024;

// Pasted posts often reference images hosted elsewhere (a Google Doc's
// images live on Google's servers and expire). This copies one into the
// post image store so the post owns it. Admin only, https only, and never
// a private/internal address.
function blockedHost(host: string) {
  const h = host.toLowerCase();
  return (
    h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h.startsWith("[") || h === "metadata.google.internal"
  );
}

export async function POST(req: Request) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { url?: unknown };
  let url: URL;
  try {
    url = new URL(String(body.url ?? ""));
  } catch {
    return NextResponse.json({ error: "Bad image address." }, { status: 400 });
  }
  if (url.protocol !== "https:" || blockedHost(url.hostname)) return NextResponse.json({ error: "That image can't be copied." }, { status: 400 });

  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15_000) });
    const type = res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!res.ok || !/^image\/(jpeg|png|webp|gif)$/.test(type)) return NextResponse.json({ error: "Not an image." }, { status: 422 });
    const data = Buffer.from(await res.arrayBuffer());
    if (data.length > MAX_BYTES) return NextResponse.json({ error: "Image too large." }, { status: 413 });
    const ext = type.split("/")[1].replace("jpeg", "jpg");
    const blob = await put(`minutes/pasted.${ext}`, data, { access: "private", addRandomSuffix: true, contentType: type });
    return NextResponse.json({ url: `/media/${blob.pathname}` });
  } catch (err) {
    console.error("Image import failed:", err);
    return NextResponse.json({ error: "Couldn't copy that image." }, { status: 502 });
  }
}
