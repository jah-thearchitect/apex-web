// Creates (or resets the password of) a site admin. Run locally with the
// production DATABASE_URL in .env.local:
//   npm run admin:create -- you@acc-funds.com
// The password is typed at a hidden prompt and only its bcrypt hash is stored.
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import bcrypt from "bcryptjs";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    let value = "";
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (ch: string) => {
      if (ch === "\r" || ch === "\n" || ch === "\u0004") {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.off("data", onData);
        process.stdout.write("\n");
        resolve(value);
      } else if (ch === "\u0003") {
        process.exit(1);
      } else if (ch === "\u007f" || ch === "\b") {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    console.error("Usage: npm run admin:create -- you@acc-funds.com");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set (put it in .env.local).");
    process.exit(1);
  }

  const password = await promptHidden("New password (12+ characters): ");
  if (password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(1);
  }
  const confirm = await promptHidden("Confirm password: ");
  if (confirm !== password) {
    console.error("Passwords don't match.");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.admin.upsert({ where: { email }, create: { email, passwordHash }, update: { passwordHash } });
  await prisma.loginAttempt.deleteMany({ where: { email } });
  console.log(`Admin ready: ${email}`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
