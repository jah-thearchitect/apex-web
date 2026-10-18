import "server-only";
import { prisma } from "./prisma";

export type ContactSource = "minutes" | "inquiry" | "booking" | "client";

/**
 * Creates or updates the contact for this email. Adds the source if new,
 * fills in names that were blank (never overwrites a name already on file
 * with an empty one), and bumps lastActivityAt. Returns the contact id.
 */
export async function recordContact(input: {
  email: string;
  firstName?: string;
  lastName?: string | null;
  source: ContactSource;
}): Promise<string> {
  const email = input.email.trim().toLowerCase();
  const firstName = input.firstName?.trim().slice(0, 60) ?? "";
  const lastName = input.lastName?.trim().slice(0, 80) || null;

  const existing = await prisma.contact.findUnique({ where: { email } });
  if (!existing) {
    const created = await prisma.contact.create({ data: { email, firstName, lastName, sources: [input.source] } });
    return created.id;
  }
  await prisma.contact.update({
    where: { id: existing.id },
    data: {
      firstName: firstName || existing.firstName,
      lastName: lastName ?? existing.lastName,
      sources: existing.sources.includes(input.source) ? existing.sources : [...existing.sources, input.source],
      lastActivityAt: new Date(),
    },
  });
  return existing.id;
}

/** "Jordan Lee" -> { firstName: "Jordan", lastName: "Lee" } */
export function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") || null };
}

/**
 * Puts a new client on the Mastermind Minutes list. Someone who already
 * unsubscribed stays unsubscribed (their opt-out wins), and an existing
 * subscriber is left as is. Never throws: a list problem mustn't block
 * creating the client.
 */
export async function subscribeClient(email: string, contactName: string) {
  try {
    const address = email.trim().toLowerCase();
    const { firstName, lastName } = splitName(contactName);
    const existing = await prisma.subscriber.findUnique({ where: { email: address } });
    if (existing) return;
    await prisma.subscriber.create({ data: { email: address, firstName: firstName.slice(0, 60), lastName: lastName?.slice(0, 80) ?? null, source: "client" } });
    await recordContact({ email: address, firstName, lastName, source: "minutes" });
  } catch (err) {
    console.error("Adding client to newsletter failed:", err);
  }
}
