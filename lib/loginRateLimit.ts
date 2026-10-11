import "server-only";
import { prisma } from "./prisma";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function isLocked(email: string) {
  const row = await prisma.loginAttempt.findUnique({ where: { email } });
  return !!row?.lockedUntil && row.lockedUntil > new Date();
}

export async function recordFailure(email: string) {
  const row = await prisma.loginAttempt.upsert({
    where: { email },
    create: { email, attempts: 1 },
    update: { attempts: { increment: 1 } },
  });
  if (row.attempts >= MAX_ATTEMPTS) {
    await prisma.loginAttempt.update({
      where: { email },
      data: { attempts: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) },
    });
  }
}

export async function clearFailures(email: string) {
  await prisma.loginAttempt.deleteMany({ where: { email } });
}
