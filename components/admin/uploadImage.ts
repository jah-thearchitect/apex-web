const MAX_EDGE = 2000;

// Phone photos are often 4–8 MB, over Vercel's 4.5 MB request cap and far
// too heavy for email. Shrink to at most 2000px on the long edge as WebP.
// GIFs are sent as-is so animation survives.
async function shrink(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
}

/** Uploads a post image; returns its site URL (/media/...). */
export async function uploadImage(file: File): Promise<string> {
  const small = await shrink(file);
  if (small.size > 4 * 1024 * 1024) throw new Error("That image is too large. Try a smaller one (GIFs must be under 4 MB).");
  const form = new FormData();
  form.append("file", small);
  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !json.url) throw new Error(json.error ?? "Upload failed.");
  return json.url;
}
