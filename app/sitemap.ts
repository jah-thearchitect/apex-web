import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/firm", "/what-we-do", "/clients", "/minutes", "/consultation"].map((path) => ({
    url: `${SITE_URL}${path}`,
  }));
  const posts = await prisma.post.findMany({
    where: { publishedAt: { not: null } },
    select: { slug: true, updatedAt: true },
  });
  return [...pages, ...posts.map((p) => ({ url: `${SITE_URL}/minutes/${p.slug}`, lastModified: p.updatedAt }))];
}
