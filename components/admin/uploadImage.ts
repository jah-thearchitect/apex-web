import { upload } from "@vercel/blob/client";

/** Uploads an image straight from the browser to Vercel Blob; returns its public URL. */
export async function uploadImage(file: File): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error("Images must be under 10 MB.");
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  const blob = await upload(`minutes/${safeName}`, file, {
    access: "public",
    handleUploadUrl: "/api/admin/upload",
  });
  return blob.url;
}
