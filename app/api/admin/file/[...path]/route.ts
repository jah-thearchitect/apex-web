import { NextResponse } from "next/server";
import { streamPrivateFile } from "@/lib/blobFile";
import { getAdminId } from "@/lib/session";

// Files clients upload with a build brief or update request, and files
// Apex attaches to a reply. Admin only.
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!(await getAdminId())) return new NextResponse("Not found", { status: 404 });
  const pathname = (await params).path.map(decodeURIComponent).join("/");
  if (!(pathname.startsWith("briefs/") || pathname.startsWith("requests/")) || pathname.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }
  return streamPrivateFile(pathname);
}
