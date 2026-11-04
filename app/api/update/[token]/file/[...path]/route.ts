import { NextResponse } from "next/server";
import { streamPrivateFile } from "@/lib/blobFile";
import { prisma } from "@/lib/prisma";

// A client opening a file on one of their own update requests: something
// they attached, or something Apex attached to a reply. Their permanent
// update token authorizes it, and only files under their own folder open.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string; path: string[] }> }) {
  const { token, path } = await params;
  const client = await prisma.client.findUnique({ where: { requestToken: token }, select: { id: true } });
  const pathname = path.map(decodeURIComponent).join("/");
  if (!client || !pathname.startsWith(`requests/${client.id}/`) || pathname.includes("..")) {
    return new NextResponse("Not found", { status: 404 });
  }
  return streamPrivateFile(pathname);
}
