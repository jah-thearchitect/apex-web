import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

// Serves post images out of the private Blob store. Only the minutes/
// folder is reachable. Uploads get a random suffix and are never
// overwritten, so a URL's content never changes and can be cached forever.
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const pathname = (await params).path.join("/");
  if (!pathname.startsWith("minutes/") || pathname.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }

  const result = await get(pathname, { access: "private" }).catch(() => null);
  if (!result || result.statusCode !== 200 || !result.stream) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
