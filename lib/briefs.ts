import "server-only";
import { put } from "@vercel/blob";
import { emailShell, esc, getSettings, notifyFirm, P, send } from "./billing";
import { prisma } from "./prisma";
import { SITE_URL } from "./site";

export const briefUrl = (token: string) => `${SITE_URL}/brief/${token}`;
export const updateUrl = (token: string) => `${SITE_URL}/update/${token}`;
/** A single request's thread, where the client answers follow-up questions. */
export const requestUrl = (clientToken: string, requestId: string) => `${SITE_URL}/update/${clientToken}/r/${requestId}`;

const firstName = (full: string) => full.split(/\s+/)[0] || "there";

type ClientLite = { id: string; businessName: string; contactName: string; email: string; requestToken: string };

/** Emails the client their build brief link and stamps sentAt. Throws on email failure. */
export async function emailBriefLink(brief: { id: string; token: string; invoiceId: string | null }, client: ClientLite) {
  const s = await getSettings();
  const lead = brief.invoiceId
    ? "Thank you for your deposit. Your build is officially on the calendar."
    : "Thank you for moving forward with Apex.";
  const html = emailShell(
    "Let&rsquo;s get your build started",
    P(`Hi ${esc(firstName(client.contactName))},`) +
      P(lead) +
      P("The next step is your <strong>build brief</strong>: one form that covers everything we need to build your project in a single pass, with less back-and-forth later.") +
      P("It takes about 15 to 20 minutes. Your answers save as you go, so you can stop and come back anytime with this same link. Skip anything that doesn&rsquo;t apply."),
    { label: "Start your build brief", url: briefUrl(brief.token) },
    `${esc(s.legalName)} &middot; Build brief for ${esc(client.businessName)}`
  );
  const text = `Hi ${firstName(client.contactName)},\n\n${lead}\n\nThe next step is your build brief: one form that covers everything we need to build your project in a single pass.\n\nIt takes about 15 to 20 minutes, and your answers save as you go.\n\nStart here: ${briefUrl(brief.token)}`;
  await send(client.email, `Next step: your build brief for ${client.businessName}`, html, text);
  await prisma.buildBrief.update({ where: { id: brief.id }, data: { sentAt: new Date() } });
}

/**
 * After a deposit invoice is paid: creates that invoice's brief and emails
 * it. One brief per deposit (invoiceId is unique), so a repeated webhook
 * does nothing. If the client already has a brief in progress, that one is
 * reused instead of starting a second. Never throws.
 */
export async function startBriefForDeposit(invoiceId: string) {
  try {
    const inv = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { client: true, buildBrief: true } });
    if (!inv || inv.kind !== "DEPOSIT" || inv.buildBrief) return;
    const open = await prisma.buildBrief.findFirst({ where: { clientId: inv.clientId, status: { not: "SUBMITTED" } } });
    if (open) return;
    const brief = await prisma.buildBrief.create({ data: { clientId: inv.clientId, invoiceId: inv.id } });
    await emailBriefLink(brief, inv.client);
  } catch (err) {
    console.error("Build brief after deposit failed:", err);
    await notifyFirm("Build brief not sent", [`The build brief for invoice ${invoiceId} couldn't be sent automatically. Send it from the client's page in Admin.`]);
  }
}

/** Emails the client their permanent update-request link. Throws on failure. */
export async function emailUpdateLink(client: ClientLite) {
  const s = await getSettings();
  const html = emailShell(
    "Your update request link",
    P(`Hi ${esc(firstName(client.contactName))},`) +
      P("Use this link anytime you need a change on your build: new text or photos, a new page or feature, or something that isn&rsquo;t working.") +
      P("It&rsquo;s yours to keep, so bookmark it. Each request comes straight to us with everything we need to get it done."),
    { label: "Request an update", url: updateUrl(client.requestToken) },
    `${esc(s.legalName)} &middot; ${esc(client.businessName)}`
  );
  const text = `Hi ${firstName(client.contactName)},\n\nUse this link anytime you need a change on your build: new text or photos, a new page or feature, or something that isn't working. It's yours to keep, so bookmark it.\n\n${updateUrl(client.requestToken)}`;
  await send(client.email, `Your update request link for ${client.businessName}`, html, text);
}

/** The firm's follow-up question on an update request. Throws on failure. */
export async function emailRequestQuestion(
  req: { id: string; kind: string; name: string; email: string; details: string },
  client: ClientLite,
  question: string
) {
  const s = await getSettings();
  const url = requestUrl(client.requestToken, req.id);
  const asked = esc(question).replace(/\n/g, "<br>");
  const original = req.details.length > 300 ? `${req.details.slice(0, 300)}…` : req.details;
  const html = emailShell(
    "A quick question about your request",
    P(`Hi ${esc(firstName(req.name))},`) +
      P(`About your update request (<strong>${esc(req.kind)}</strong>):`) +
      `<div style="margin:0 0 18px;padding:14px 18px;border-left:3px solid #B4863C;background:#F6F4EE;font-size:16px;line-height:1.6;color:#101113;">${asked}</div>` +
      P("Answer with the button below, where you can also attach files. Replying to this email works too.") +
      `<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#8A8D8F;">Your request: ${esc(original)}</p>`,
    { label: "Answer the question", url },
    `${esc(s.legalName)} &middot; ${esc(client.businessName)}`
  );
  const text = `Hi ${firstName(req.name)},\n\nAbout your update request (${req.kind}):\n\n${question}\n\nAnswer here (you can attach files): ${url}\n\nYour request: ${original}`;
  await send(req.email, `Question about your update request: ${req.kind}`, html, text);
}

/** Tells the client their update request is finished, with the firm's note. Throws on failure. */
export async function emailRequestDone(
  req: { id: string; kind: string; name: string; email: string; details: string },
  client: ClientLite,
  note: string
) {
  const s = await getSettings();
  const url = requestUrl(client.requestToken, req.id);
  const original = req.details.length > 300 ? `${req.details.slice(0, 300)}…` : req.details;
  const noteHtml = note
    ? `<div style="margin:0 0 18px;padding:14px 18px;border-left:3px solid #B4863C;background:#F6F4EE;font-size:16px;line-height:1.6;color:#101113;">${esc(note).replace(/\n/g, "<br>")}</div>`
    : "";
  const html = emailShell(
    "Your update is done",
    P(`Hi ${esc(firstName(req.name))},`) +
      P(`Your update request (<strong>${esc(req.kind)}</strong>) for ${esc(client.businessName)} is complete.`) +
      (note ? P("Here’s what was done:") + noteHtml : "") +
      P("Take a look, and if anything isn’t quite right, reply on your request page and we’ll pick it back up.") +
      `<p style="margin:18px 0 0;font-size:13px;line-height:1.5;color:#8A8D8F;">Your request: ${esc(original)}</p>`,
    { label: "View your request", url },
    `${esc(s.legalName)} &middot; ${esc(client.businessName)}`
  );
  const text = `Hi ${firstName(req.name)},\n\nYour update request (${req.kind}) for ${client.businessName} is complete.${note ? `\n\nWhat was done:\n${note}` : ""}\n\nIf anything isn't quite right, reply on your request page: ${url}\n\nYour request: ${original}`;
  await send(req.email, `Done: your update request (${req.kind})`, html, text);
}

/** "We got it" to whoever submitted a brief or request. Never throws. */
export async function emailReceived(to: string, name: string, kind: "brief" | "update", client: ClientLite) {
  try {
    const s = await getSettings();
    const what = kind === "brief" ? "build brief" : "update request";
    const next = kind === "brief"
      ? "We&rsquo;ll review everything and reach out if anything needs a closer look. Otherwise, the build starts on the schedule we discussed."
      : "We&rsquo;ll review it and follow up with timing. If it&rsquo;s urgent and the site is down, reply to this email.";
    const html = emailShell(
      `We received your ${what}`,
      P(`Hi ${esc(firstName(name))},`) + P(`Thank you. Your ${what} for ${esc(client.businessName)} is in.`) + P(next),
      { label: "Request another update", url: updateUrl(client.requestToken) },
      `${esc(s.legalName)} &middot; ${esc(client.businessName)}`
    );
    const text = `Hi ${firstName(name)},\n\nThank you. Your ${what} for ${client.businessName} is in.\n\n${next.replace(/&rsquo;/g, "'")}\n\nNeed something else later? ${updateUrl(client.requestToken)}`;
    await send(to, `We received your ${what}`, html, text);
  } catch (err) {
    console.error("Receipt email failed:", err);
  }
}

// ---------- Client uploads ----------

const EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "webp", "gif", "svg", "heic", "pdf", "ai", "eps", "psd",
  "doc", "docx", "xls", "xlsx", "csv", "txt", "ppt", "pptx", "zip",
]);
// Vercel caps request bodies at 4.5 MB; photos are shrunk in the browser first.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/**
 * Saves a client's file to the private Blob store under `prefix`. Files are
 * never public: only a signed-in admin can open them (/api/admin/file).
 */
export async function saveClientUpload(file: File, prefix: string) {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  if (!EXTENSIONS.has(ext)) return { error: "That file type isn't supported. Use an image, PDF, Office document, or ZIP." } as const;
  if (file.size > MAX_UPLOAD_BYTES) return { error: "That file is over 4 MB. Share a Google Drive or Dropbox link in the notes instead." } as const;
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-60) || `file.${ext}`;
  const blob = await put(`${prefix}${safe}`, file, { access: "private", addRandomSuffix: true, contentType: file.type || undefined });
  return { file: { path: blob.pathname, name: file.name.slice(0, 200), size: file.size } } as const;
}
