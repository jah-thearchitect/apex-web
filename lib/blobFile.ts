import "server-only";
import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

const INLINE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

/**
 * Streams a file from the private Blob store. Callers check who may see
 * `pathname` first. Never cached; anything that isn't a plain image or PDF
 * downloads instead of opening, and the sandbox header keeps an uploaded
 * SVG or HTML inert.
 */
export async function streamPrivateFile(pathname: string) {
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
