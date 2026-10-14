import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getAdminId } from "@/lib/session";

const INLINE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

// Files clients upload with a build brief or update request. Admin only and
// never cached. Anything that isn't a plain image or PDF downloads instead
// of opening, and the sandbox header keeps an uploaded SVG or HTML inert.
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!(await getAdminId())) return new NextResponse("Not found", { status: 404 });
  const pathname = (await params).path.map(decodeURIComponent).join("/");
  if (!(pathname.startsWith("briefs/") || pathname.startsWith("requests/")) || pathname.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const result = await get(pathname, { access: "private" }).catch(() => null);
  if (!result || result.statusCode !== 200 || !result.stream) return new NextResponse("Not found", { status: 404 });

  const type = result.blob.contentType || "application/octet-stream";
  const name = (pathname.split("/").pop() ?? "file").replace(/["\\]/g, "");
  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `${INLINE.has(type) ? "inline" : "attachment"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
