import pg from "pg";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: pg.Pool;
};

const pool = globalForPrisma.pgPool ?? new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Hosted Postgres closes idle connections on its own schedule; without this
// handler that surfaces as an unhandled 'error' event and crashes the process.
pool.on("error", (err) => {
  console.error("Unexpected idle pg client error", err);
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg(pool) });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pgPool = pool;
}
