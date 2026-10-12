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
