import "server-only";
import { getSettings } from "./billing";
import { prisma } from "./prisma";

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Client list, saved items, and defaults (from Settings) for the quote/invoice editor. */
export async function editorContext(clientId = "") {
  const [clients, catalog, s] = await Promise.all([
    prisma.client.findMany({ orderBy: { businessName: "asc" }, select: { id: true, businessName: true, email: true } }),
    prisma.catalogItem.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, details: true, unitCents: true } }),
    getSettings(),
  ]);
  const now = Date.now();
  return {
    clients,
    catalog,
    defaults: {
      clientId,
      depositPercent: s.depositPercent,
      validUntil: ymd(new Date(now + s.quoteValidDays * 86_400_000)),
      issueDate: ymd(new Date(now)),
      dueDate: ymd(new Date(now + s.paymentTermsDays * 86_400_000)),
      terms: s.quoteTerms,
      notes: s.invoiceFooter,
    },
  };
}

export { ymd };
