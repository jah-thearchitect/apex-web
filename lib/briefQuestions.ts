// The build brief: every question a client answers after paying a deposit.
// Used by the client form (components/BriefForm.tsx), the save API (to keep
// only known answers), and the admin view. To change the form, edit here:
// ids are stored with each answer, so rename an id only for a new question.

export type FileRef = { path: string; name: string; size: number };
export type Answer = string | string[] | FileRef[];
export type Answers = Record<string, Answer>;

type Base = {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  /** Only shown (and only required) when this returns true. */
  showIf?: (a: Answers) => boolean;
};
export type Question =
  | (Base & { type: "text" | "email" | "tel" | "url" | "date"; placeholder?: string })
  | (Base & { type: "textarea"; placeholder?: string })
  | (Base & { type: "choice"; options: string[]; multi?: boolean; other?: boolean })
  | (Base & { type: "files" });

export type Section = { id: string; title: string; intro: string; questions: Question[]; showIf?: (a: Answers) => boolean };

/** True if a choice answer includes `value` (or, given a list, any of them). */
export function picked(a: Answers, id: string, value: string | string[]) {
  const v = a[id];
  const want = Array.isArray(value) ? value : [value];
  if (typeof v === "string") return want.includes(v);
  return Array.isArray(v) && v.some((x) => typeof x === "string" && want.includes(x));
}

export const OTHER = "Other";

export const SECTIONS: Section[] = [
  {
    id: "business",
    title: "Your business",
    intro: "The basics, so the site and every account are set up under the right names.",
    questions: [
      { id: "biz_name", type: "text", label: "Business name, as it should appear on the site", required: true },
      { id: "legal_name", type: "text", label: "Legal business name, if different" },
      { id: "contact_name", type: "text", label: "Main contact for this build", required: true },
      { id: "contact_role", type: "text", label: "Their role", placeholder: "Owner, director, office manager" },
      { id: "contact_email", type: "email", label: "Their email", required: true },
      { id: "contact_phone", type: "tel", label: "Their phone" },
      { id: "approver", type: "text", label: "Who gives final approval on the build?", hint: "Name and role. Add a backup in case that person is hard to reach." },
      { id: "sector", type: "text", label: "What sector is your business in?", required: true, placeholder: "Youth athletics, catering, supportive housing" },
      { id: "what_you_do", type: "textarea", label: "In a sentence or two, what does your business do?", required: true },
      { id: "customers", type: "textarea", label: "Who are your customers?", hint: "Who you serve, where they are, and what they need from you." },
      { id: "service_area", type: "text", label: "Service area or locations", placeholder: "Columbia, SC and surrounding counties" },
      { id: "hours", type: "text", label: "Business hours to show on the site" },
      {
        id: "heard_from", type: "choice", label: "How did you hear about Apex?", other: true,
        options: ["Referral", "Google search", "Social media", "Saw a site Apex built", "Event or networking"],
      },
    ],
  },
  {
    id: "build",
    title: "The build",
    intro: "What we're building and what it needs to do. Your answers here decide which steps come next.",
    questions: [
      {
        id: "build_type", type: "choice", multi: true, other: true, required: true, label: "What are we building?",
        options: ["New website", "Redesign of my current site", "Online store", "Client or member portal", "Event or registration page", "Landing page", "Not sure yet"],
      },
      {
        id: "goals", type: "choice", multi: true, label: "What should the site do for you?", hint: "Pick your top one to three.",
        options: ["Get calls and inquiries", "Book appointments", "Sell products", "Sell services", "Collect registrations or sign-ups", "Take donations", "Build an email list", "Share information", "Recruit staff or members"],
      },
      {
        id: "pages", type: "choice", multi: true, other: true, label: "Which pages do you need?",
        options: ["Home", "About", "Services", "Products or menu", "Pricing", "Gallery", "Team", "Testimonials", "FAQ", "Events", "Blog or news", "Contact", "Careers", "Donate"],
      },
      { id: "takes_payments", type: "choice", required: true, label: "Will customers pay you through the site?", options: ["Yes", "No", "Not sure"] },
      { id: "inspiration", type: "textarea", label: "Sites you like", hint: "Paste links and say what you like about each one: the look, a feature, how it feels." },
      { id: "dislikes", type: "textarea", label: "Anything to avoid?", hint: "Sites, styles, or colors you don't want." },
      { id: "competitors", type: "textarea", label: "Competitors we should know about", hint: "Names or links." },
      { id: "launch_date", type: "date", label: "Target launch date" },
      { id: "launch_reason", type: "text", label: "What's driving that date?", placeholder: "Grand opening, season start, an event" },
    ],
  },
  {
    id: "brand",
    title: "Brand and look",
    intro: "Everything that makes the site look like you.",
    questions: [
      { id: "logo_status", type: "choice", required: true, label: "Your logo", options: ["I'm uploading it", "I need one designed", "Use the one on my current site or social"] },
      { id: "logo_files", type: "files", label: "Logo files", hint: "The highest-quality versions you have. SVG, PNG, PDF, or AI.", showIf: (a) => picked(a, "logo_status", "I'm uploading it") },
      { id: "colors", type: "text", label: "Brand colors", hint: "Hex codes if you know them (like #B4863C), or describe them. Leave it blank and we'll pull them from your logo." },
      { id: "fonts", type: "text", label: "Brand fonts, if you have them" },
      { id: "feel", type: "text", required: true, label: "Three words for how the site should feel", placeholder: "Bold, modern, trustworthy" },
      {
        id: "photos", type: "choice", multi: true, label: "Photos",
        options: ["I'll upload my own", "AI-generated images are fine", "Use stock photos", "I need a photographer"],
      },
      { id: "photo_files", type: "files", label: "Your photos", hint: "Your work, space, products, or team. Large photos are resized automatically.", showIf: (a) => picked(a, "photos", "I'll upload my own") },
      { id: "ai_people", type: "choice", label: "Can AI images show people?", options: ["Yes", "No, only places, objects, and scenes"], showIf: (a) => picked(a, "photos", "AI-generated images are fine") },
      { id: "tagline", type: "textarea", label: "Tagline, slogans, or quotes to feature" },
    ],
  },
  {
    id: "content",
    title: "Content and copy",
    intro: "The words on the site. Getting these now is what keeps the build from stalling later. Rough notes are fine.",
    questions: [
      { id: "copy_writer", type: "choice", required: true, label: "Who's writing the words on the site?", options: ["I'll provide all the text", "Apex writes it from my notes", "A mix of both"] },
      { id: "story", type: "textarea", label: "Your story", hint: "How the business started and why." },
      { id: "offerings", type: "textarea", label: "Services or products, with prices", hint: "Each one with a short description and price, or upload a price sheet below." },
      { id: "content_files", type: "files", label: "Documents", hint: "Price sheets, menus, brochures, flyers, headshots. Anything with content we can use." },
      { id: "testimonials", type: "textarea", label: "Testimonials or reviews to feature", hint: "Paste them with the customer's name, or link to your Google or Facebook reviews." },
      { id: "team", type: "textarea", label: "Team members to feature", hint: "Names, titles, and short bios." },
      { id: "faqs", type: "textarea", label: "Questions customers ask you most" },
      {
        id: "legal", type: "choice", multi: true, label: "Legal pages and notices",
        options: ["Privacy policy", "Terms of service", "Waiver or release", "Refund or cancellation policy", "Licenses or certifications to display", "Not sure"],
      },
      {
        id: "legal_notes", type: "textarea", label: "Details for those", hint: "License numbers, waiver wording from your attorney, refund terms.",
        showIf: (a) => picked(a, "legal", ["Waiver or release", "Refund or cancellation policy", "Licenses or certifications to display"]),
      },
    ],
  },
  {
    id: "accounts",
    title: "Domain, email, and accounts",
    intro: "Where things live today. Don't send any passwords here. When we need access to an account, we'll send you an invite or walk you through it.",
    questions: [
      { id: "has_domain", type: "choice", required: true, label: "Do you already own a domain?", options: ["Yes", "No, help me buy one", "Not sure"] },
      { id: "domain", type: "text", label: "Your domain", placeholder: "yourbusiness.com", showIf: (a) => picked(a, "has_domain", "Yes") },
      {
        id: "domain_registrar", type: "choice", other: true, label: "Where is it registered?", showIf: (a) => picked(a, "has_domain", "Yes"),
        options: ["Squarespace", "GoDaddy", "Namecheap", "Wix", "Don't know"],
      },
      { id: "domain_ideas", type: "text", label: "Domain names you'd like", placeholder: "yourbusiness.com, yourbusinessco.com", showIf: (a) => !picked(a, "has_domain", "Yes") },
      { id: "has_site", type: "choice", required: true, label: "Do you have a website now?", options: ["Yes", "No"] },
      { id: "current_site", type: "url", label: "Link to your current site", placeholder: "https://", showIf: (a) => picked(a, "has_site", "Yes") },
      {
        id: "current_platform", type: "choice", other: true, label: "What is it built on?", showIf: (a) => picked(a, "has_site", "Yes"),
        options: ["Squarespace", "Wix", "WordPress", "Shopify", "GoDaddy", "Custom-built", "Don't know"],
      },
      { id: "keep_from_site", type: "textarea", label: "Anything on it we should keep?", showIf: (a) => picked(a, "has_site", "Yes") },
      {
        id: "email_provider", type: "choice", label: "Business email", hint: "Google Workspace lets the site send and receive from your own domain.",
        options: ["Google Workspace", "Microsoft 365", "Another email provider", "I use a personal Gmail or Yahoo", "I don't have business email yet"],
      },
      { id: "site_inbox", type: "email", label: "Which address should receive messages from the site?", hint: "Inquiries, orders, and form submissions go here." },
      { id: "gbp", type: "choice", label: "Google Business Profile", options: ["I have one", "I need one set up", "Not sure"] },
      { id: "socials", type: "textarea", label: "Social media links for the site", placeholder: "instagram.com/yourbusiness" },
    ],
  },
  {
    id: "payments",
    title: "Selling and payments",
    intro: "How money moves through the site.",
    showIf: (a) => !picked(a, "takes_payments", "No"),
    questions: [
      {
        id: "pay_for", type: "choice", multi: true, other: true, label: "What will customers pay for?",
        options: ["Products", "Services or appointments", "Deposits", "Event registrations or tickets", "Memberships or subscriptions", "Donations"],
      },
      { id: "stripe", type: "choice", label: "Do you have a Stripe account?", hint: "Stripe is how the site takes cards and bank payments.", options: ["Yes", "No, set one up with me", "Not sure"] },
      { id: "bank", type: "choice", label: "Do you have a business bank account?", hint: "Payouts go to an account in the business's name.", options: ["Yes", "Not yet"] },
      { id: "product_count", type: "text", label: "About how many products?", showIf: (a) => picked(a, "pay_for", "Products") },
      { id: "product_options", type: "textarea", label: "Product options", hint: "Sizes, colors, materials, custom orders.", showIf: (a) => picked(a, "pay_for", "Products") },
      {
        id: "fulfillment", type: "choice", multi: true, label: "How do orders reach customers?", showIf: (a) => picked(a, "pay_for", "Products"),
        options: ["Shipping", "Local pickup", "Local delivery", "Digital download"],
      },
      { id: "sales_tax", type: "choice", label: "Do you collect sales tax?", options: ["Yes", "No", "Not sure"] },
      {
        id: "store_extras", type: "choice", multi: true, label: "Extras",
        options: ["Promo codes", "Discount for joining the email list", "Bundles", "Upsells at checkout", "Order tracking", "Gift cards"],
      },
      { id: "payment_notes", type: "textarea", label: "Anything else about payments?", hint: "Deposits, payment plans, refunds, tipping." },
    ],
  },
  {
    id: "features",
    title: "Features",
    intro: "What the site should be able to do beyond showing information.",
    questions: [
      {
        id: "features", type: "choice", multi: true, other: true, label: "What should the site be able to do?",
        options: ["Book appointments", "Contact or inquiry forms", "Email list and newsletter", "Blog or announcements", "Member or client logins", "Event registration", "Photo gallery", "Online applications", "Maps and directions"],
      },
      {
        id: "booking_details", type: "textarea", label: "Booking details", hint: "What people can book, how long each takes, your availability, and whether they pay up front.",
        showIf: (a) => picked(a, "features", "Book appointments"),
      },
      {
        id: "form_details", type: "textarea", label: "What should your forms collect?", hint: "The questions to ask, and who should get the answers.",
        showIf: (a) => picked(a, "features", ["Contact or inquiry forms", "Online applications"]),
      },
      {
        id: "login_details", type: "textarea", label: "Who logs in, and what can they see or do?",
        showIf: (a) => picked(a, "features", "Member or client logins"),
      },
      {
        id: "self_edit", type: "choice", multi: true, label: "What do you want to update yourself?",
        options: ["Text and photos", "Products and prices", "Blog posts or announcements", "Events", "Team members", "Nothing, Apex handles updates"],
      },
      { id: "tools", type: "textarea", label: "Tools you already use", hint: "Square, QuickBooks, Gusto, Calendly, Hudl, Mailchimp, a CRM. Anything the site might connect to." },
      { id: "special", type: "textarea", label: "Anything else the site should do?", hint: "Describe it in your own words. No idea is too big." },
    ],
  },
  {
    id: "security",
    title: "Staff and security",
    intro: "Who needs access, and how carefully the site needs to handle information.",
    questions: [
      { id: "staff_access", type: "choice", label: "Do staff need their own access to the site?", options: ["Yes", "No"] },
      { id: "staff_details", type: "textarea", label: "Who needs access?", hint: "How many people, their roles, and what each should be able to do.", showIf: (a) => picked(a, "staff_access", "Yes") },
      {
        id: "sensitive", type: "choice", multi: true, label: "Will the site collect any of these?",
        options: ["Health or medical information", "Information about minors", "Financial information", "ID documents or other uploads", "Home addresses", "None of these"],
      },
      { id: "compliance", type: "textarea", label: "Rules your business has to follow", hint: "HIPAA, school or league rules, a licensing board. Leave it blank if none." },
    ],
  },
  {
    id: "growth",
    title: "Growth and support",
    intro: "What happens after launch.",
    questions: [
      { id: "support", type: "choice", label: "Ongoing hosting and support", options: ["Yes, include a monthly plan", "No, just the build", "Let's talk about it"] },
      { id: "it_support", type: "choice", multi: true, label: "IT support", options: ["For the site", "For my staff", "For my customers", "Not needed"] },
      {
        id: "marketing", type: "choice", multi: true, label: "Brand expansion and marketing",
        options: ["SEO and Google ranking", "Google Business Profile", "Social media", "Email campaigns", "Paid ads", "Not right now"],
      },
      {
        id: "addon_budget", type: "choice", label: "Monthly budget for add-ons and support",
        options: ["Under $250", "$250 to $500", "$500 to $1,000", "$1,000 to $2,000", "Over $2,000", "Not sure yet"],
      },
      { id: "contact_method", type: "choice", label: "Best way to reach you during the build", options: ["Phone call", "Text", "Email"] },
      { id: "contact_times", type: "text", label: "Best times to reach you" },
      { id: "anything_else", type: "textarea", label: "Anything else we should know?" },
    ],
  },
];

export function visibleSections(a: Answers) {
  return SECTIONS.filter((s) => !s.showIf || s.showIf(a));
}

export function visibleQuestions(s: Section, a: Answers) {
  return s.questions.filter((q) => !q.showIf || q.showIf(a));
}

export function isAnswered(q: Question, a: Answers) {
  const v = a[q.id];
  if (Array.isArray(v)) {
    if (v.length === 0) return false;
    // "Other" alone needs its text filled in.
    if (q.type === "choice" && v.length === 1 && v[0] === OTHER) return !!String(a[`${q.id}__other`] ?? "").trim();
    return true;
  }
  if (typeof v !== "string" || !v.trim()) return false;
  if (q.type === "choice" && v === OTHER) return !!String(a[`${q.id}__other`] ?? "").trim();
  return true;
}

/** Required questions still empty in a section. */
export function missingIn(s: Section, a: Answers) {
  return visibleQuestions(s, a).filter((q) => q.required && !isAnswered(q, a));
}

const ALL = new Map(SECTIONS.flatMap((s) => s.questions.map((q) => [q.id, q] as const)));

/**
 * Keeps only answers to real questions, in the right shape and size, and
 * file references inside `filePrefix`. Anything else the browser sends is
 * dropped.
 */
export function cleanAnswers(raw: unknown, filePrefix: string): Answers {
  const out: Answers = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const otherOf = key.endsWith("__other") ? key.slice(0, -7) : null;
    const q = ALL.get(otherOf ?? key);
    if (!q) continue;
    if (otherOf) {
      if (q.type === "choice" && q.other && typeof value === "string") out[key] = value.slice(0, 300);
      continue;
    }
    if (q.type === "files") {
      if (!Array.isArray(value)) continue;
      const files: FileRef[] = [];
      for (const f of value.slice(0, 30)) {
        if (!f || typeof f !== "object") continue;
        const { path, name, size } = f as Record<string, unknown>;
        if (typeof path !== "string" || !path.startsWith(filePrefix) || path.includes("..")) continue;
        files.push({ path: path.slice(0, 300), name: String(name ?? "file").slice(0, 200), size: Number(size) || 0 });
      }
      out[key] = files;
    } else if (q.type === "choice") {
      const allowed = new Set([...q.options, ...(q.other ? [OTHER] : [])]);
      if (q.multi) {
        if (Array.isArray(value)) out[key] = value.filter((v): v is string => typeof v === "string" && allowed.has(v));
      } else if (typeof value === "string" && allowed.has(value)) {
        out[key] = value;
      }
    } else if (typeof value === "string") {
      out[key] = value.slice(0, q.type === "textarea" ? 6000 : 500);
    }
  }
  return out;
}

/** Human-readable answer for the admin view and emails. */
export function answerText(q: Question, a: Answers): string {
  const v = a[q.id];
  const other = String(a[`${q.id}__other`] ?? "").trim();
  if (q.type === "files") return Array.isArray(v) ? (v as FileRef[]).map((f) => f.name).join(", ") : "";
  if (Array.isArray(v)) return (v as string[]).map((x) => (x === OTHER && other ? `Other: ${other}` : x)).join(", ");
  if (typeof v !== "string") return "";
  return v === OTHER && other ? `Other: ${other}` : v;
}

// ---------- Update requests (existing clients) ----------

export const UPDATE_KINDS = [
  "Text or content update",
  "Photos or media",
  "New page or section",
  "New feature",
  "Something isn't working",
  "Design change",
  OTHER,
];

export const UPDATE_URGENCY = ["No rush", "Within a week", "Within 48 hours", "Urgent: the site is broken"];

/** How a request's status reads to the client. */
export const CLIENT_STATUS: Record<string, string> = {
  NEW: "Received",
  IN_PROGRESS: "In progress",
  WAITING: "Waiting on you",
  DONE: "Done",
};
