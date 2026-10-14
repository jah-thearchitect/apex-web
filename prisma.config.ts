import "dotenv/config";
import { defineConfig } from "prisma/config";

// The CLI (migrate) needs a direct connection: migrations hold a Postgres
// advisory lock, and Neon's pooler can strand that lock on a pooled
// backend, which blocks every later deploy. Use the unpooled URL if Vercel
// provides one, otherwise drop "-pooler" from the Neon host. The app itself
// still connects through the pooler (lib/prisma.ts).
const pooled = process.env["DATABASE_URL"];
const direct = process.env["DATABASE_URL_UNPOOLED"] || pooled?.replace("-pooler.", ".");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: direct },
});
