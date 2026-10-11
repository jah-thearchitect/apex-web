import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getAdminId } from "@/lib/session";

const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
// Vercel caps request bodies at 4.5 MB; the editor shrinks photos before
// sending, so real uploads land well under this.
const MAX_BYTES = 4 * 1024 * 1024;

// Saves a post image to the private Blob store. The store is private, so
// images are served to readers through /media/[...path], never by Blob URL.
export async function POST(req: Request) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (!TYPES.includes(file.type)) return NextResponse.json({ error: "Use a JPG, PNG, WebP or GIF image." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That image is too large (max 4 MB after resizing)." }, { status: 400 });

  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-60) || "image";
  try {
    const blob = await put(`minutes/${safeName}`, file, {
      access: "private",
      addRandomSuffix: true,
      contentType: file.type,
    });
    return NextResponse.json({ url: `/media/${blob.pathname}` });
  } catch (err) {
    console.error("Image upload failed:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }
}
