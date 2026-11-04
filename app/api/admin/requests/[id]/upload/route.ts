import { NextResponse } from "next/server";
import { saveClientUpload } from "@/lib/briefs";
import { prisma } from "@/lib/prisma";
import { getAdminId } from "@/lib/session";

// A file Apex attaches to a reply on a client's update request (admin only).
// Stored in the client's own request folder so the client can open it from
// their request page; the private store is never linked to directly.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;
  const request = await prisma.changeRequest.findUnique({ where: { id }, select: { clientId: true } });
  if (!request) return NextResponse.json({ error: "Request not found." }, { status: 404 });

  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  try {
    const result = await saveClientUpload(file, `requests/${request.clientId}/apex/`);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result.file);
  } catch (err) {
    console.error("Admin reply upload failed:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }
}
