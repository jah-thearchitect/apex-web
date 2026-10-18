import { put } from "@vercel/blob";
import mammoth from "mammoth";
import { NextResponse } from "next/server";
import { getAdminId } from "@/lib/session";

const MAX_BYTES = 4 * 1024 * 1024;

// Word document → post HTML. Images inside the document are saved to the
// private Blob store like any post image and referenced by /media/ paths.
export async function POST(req: Request) {
  if (!(await getAdminId())) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".docx")) return NextResponse.json({ error: "Use a .docx file." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That document is over 4 MB." }, { status: 400 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    let n = 0;
    const { value } = await mammoth.convertToHtml(
      { buffer },
      {
        styleMap: ["p[style-name='Title'] => h1:fresh", "p[style-name='Subtitle'] => h2:fresh"],
        convertImage: mammoth.images.imgElement(async (image) => {
          const data = await image.readAsBuffer();
          const ext = (image.contentType.split("/")[1] ?? "png").replace("jpeg", "jpg").replace(/[^a-z0-9]/g, "");
          const blob = await put(`minutes/imported-${Date.now()}-${n++}.${ext}`, data, {
            access: "private",
            addRandomSuffix: true,
            contentType: image.contentType,
          });
          return { src: `/media/${blob.pathname}`, alt: (image as { altText?: string }).altText ?? "" };
        }),
      }
    );
    return NextResponse.json({ html: value });
  } catch (err) {
    console.error("Word import failed:", err);
    return NextResponse.json({ error: "That document couldn't be read. Try saving it again as .docx, or paste the text." }, { status: 422 });
  }
}
