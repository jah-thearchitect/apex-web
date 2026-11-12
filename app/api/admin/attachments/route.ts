import { NextResponse } from "next/server";
import { saveClientUpload } from "@/lib/briefs";
import { ATTACHMENT_PREFIX } from "@/lib/emailAttachments";
import { getAdminId } from "@/lib/session";

// A file Apex attaches to an email it is composing (a call follow-up or
// invite). Admin only. It goes to the private store; the email send then
// reads it back and attaches it, so nothing is ever linked publicly.
export async function POST(req: Request) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  try {
    const result = await saveClientUpload(file, ATTACHMENT_PREFIX);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json(result.file);
  } catch (err) {
    console.error("Email attachment upload failed:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }
}
