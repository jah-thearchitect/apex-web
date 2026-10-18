// Facebook flyers (1080x1350, 4:5 feed). Edit the copy in FLYERS, then:
//   node marketing/flyers/build.mjs
// Writes one HTML page per flyer to src/ and renders each to a PNG here
// with headless Chrome (fonts load from Google Fonts, so stay online).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const SRC = join(DIR, "src");
const MARK = pathToFileURL(join(DIR, "..", "..", "public", "brand", "apex-mark-dark.png")).href;
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);

const img = (name) => pathToFileURL(join(DIR, "img", `${name}.png`)).href;

// *word* renders as gold italic, like <em> on the site.
const em = (s) => s.replace(/\*(.+?)\*/g, "<em>$1</em>");

const FLYERS = [
  {
    file: "01-platforms-not-websites",
    image: "platform",
    eyebrow: "More than a website",
    kicker: "Anyone can build a website.",
    headline: "We build platforms that bring you *customers*.",
    compare: {
      left: { title: "A website", items: ["Looks nice", "Sits there", "Waits for customers"] },
      right: { title: "An Apex platform", items: ["Captures every lead", "Books and takes payments", "Brings customers back"] },
    },
    cta: "More customers. More revenue.",
    url: "acc-funds.com",
  },
  {
    file: "02-every-budget",
    image: "budget",
    eyebrow: "Builds for every budget",
    headline: "Start where you are. *Grow* from there.",
    body: "From a starter site to a full platform that books, sells, and follows up for you, every build is made to grow with your business.",
    steps: ["Starter websites from $199", "Online stores and booking", "Client portals and automation", "Marketing, AI, and capital"],
    cta: "Find your fit",
    url: "acc-funds.com",
  },
  {
    file: "03-no-website-yet",
    image: "newbiz",
    eyebrow: "No website yet?",
    headline: "Your customers are already *searching* for you.",
    body: "If they can’t find you, they find your competitor. We set up everything a new business needs to be found, trusted, and paid.",
    checks: ["A website on your own domain", "Business email and a Google Business Profile", "Booking, payments, and lead capture"],
    cta: "Get found",
    url: "acc-funds.com",
  },
  {
    file: "04-websites-from-199",
    image: "199",
    heroTop: 50,
    heroHeight: 560,
    eyebrow: "Website creation",
    headline: "Your business website, starting at",
    price: { amount: "199", note: "Professional. Mobile-ready. Built around your brand." },
    body: "Upgrade anytime to booking, payments, and lead capture.",
    cta: "Start your build",
    url: "acc-funds.com",
  },
  {
    file: "05-new-business-special",
    image: "free",
    eyebrow: "New business special",
    headline: "We’ll build your website *free*.",
    offer: { amount: "$99", per: "/month", note: "Hosting and support for 3 months" },
    body: "Just opened? Launch right with a custom website built at no cost. You only pay for hosting.",
    fine: "For new businesses. Ask us for details.",
    cta: "Claim the special",
    url: "acc-funds.com",
  },
  {
    file: "06-book-a-consultation",
    image: "consult",
    eyebrow: "Book a consultation",
    headline: "One hour. Your business. A clear plan to *grow*.",
    body: "Sit down with Apex to map out the platform, marketing, and capital your business needs to bring in more customers.",
    checks: ["What’s working, and what isn’t", "Where your next customers come from", "A build that fits your budget"],
    cta: "Book your consultation",
    url: "acc-funds.com/consultation",
  },
];

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px;overflow:hidden;background:#0A0B0D}
body{font-family:Manrope,Arial,sans-serif;color:#EDEEEC;-webkit-font-smoothing:antialiased}
.flyer{position:relative;width:1080px;height:1350px;display:flex;flex-direction:column}
.hero{position:absolute;inset:0 0 auto 0;height:640px;background-size:cover;background-position:center}
.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,11,13,.9) 0%,rgba(10,11,13,.55) 13%,rgba(10,11,13,0) 30%,rgba(10,11,13,0) 52%,#0A0B0D 100%)}
.brand{position:relative;z-index:2;display:flex;align-items:center;gap:16px;padding:56px 72px 0}
.box{border:1.5px solid #B4863C;padding:8px 18px;font-family:Newsreader,Georgia,serif;font-size:34px;color:#EDEEEC;background:rgba(10,11,13,.7)}
.brand img{height:44px}
.brand .sub{font-family:"IBM Plex Mono",monospace;font-size:15px;letter-spacing:.24em;color:rgba(237,238,236,.85);margin-left:8px;text-shadow:0 1px 10px #0A0B0D,0 0 3px #0A0B0D}
.content{position:relative;z-index:2;margin-top:auto;padding:0 72px 0}
.eyebrow{display:flex;align-items:center;gap:18px;font-family:"IBM Plex Mono",monospace;font-size:20px;letter-spacing:.2em;text-transform:uppercase;color:#D8B268}
.eyebrow::before{content:"";width:44px;height:2px;background:#B4863C}
.kicker{font-family:Newsreader,Georgia,serif;font-size:44px;color:#9CA0A0;margin-top:22px;text-decoration:line-through;text-decoration-color:#B4863C;text-decoration-thickness:3px}
h1{font-family:Newsreader,Georgia,serif;font-weight:500;font-size:84px;line-height:1.02;letter-spacing:-.01em;margin-top:18px;text-wrap:balance}
h1 em, .price em{font-style:italic;color:#D8B268}
.body{font-size:29px;line-height:1.5;color:#B9BCBC;margin-top:24px;max-width:900px}
.compare{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:34px}
.col{border:1.5px solid rgba(237,238,236,.14);padding:24px 26px}
.col.win{border-color:#B4863C;background:rgba(180,134,60,.08)}
.col h3{font-family:"IBM Plex Mono",monospace;font-weight:500;font-size:18px;letter-spacing:.16em;text-transform:uppercase;color:#9CA0A0}
.col.win h3{color:#D8B268}
.col li{list-style:none;font-size:27px;margin-top:12px;color:#7d8181}
.col li::before{content:"–  ";color:#63666A}
.col.win li{color:#EDEEEC}
.col.win li::before{content:"✓  ";color:#D8B268}
.list{margin-top:30px;display:flex;flex-direction:column;gap:14px}
.list li{list-style:none;font-size:29px;display:flex;gap:16px;align-items:baseline}
.list li::before{content:"✓";color:#D8B268;font-weight:700}
.steps{margin-top:30px;display:flex;flex-direction:column;gap:12px}
.steps li{list-style:none;font-size:28px;display:flex;align-items:center;gap:18px}
.steps li span{font-family:"IBM Plex Mono",monospace;font-size:18px;color:#0A0B0D;background:#D8B268;width:40px;height:40px;display:flex;align-items:center;justify-content:center;flex:none}
.price{display:flex;align-items:flex-start;gap:6px;margin-top:52px;height:204px;font-family:Newsreader,Georgia,serif;color:#D8B268}
.price .cur{font-size:110px;line-height:1;margin-top:30px}
.price .amt{font-size:290px;letter-spacing:-.03em;line-height:236px}
.note{font-family:"IBM Plex Mono",monospace;font-size:20px;letter-spacing:.08em;text-transform:uppercase;color:#EDEEEC;margin-top:26px}
.offer{display:flex;align-items:center;gap:28px;margin-top:30px;border:1.5px solid #B4863C;background:rgba(180,134,60,.1);padding:24px 30px}
.offer .amt{font-family:Newsreader,Georgia,serif;font-size:110px;line-height:1;color:#D8B268}
.offer .per{font-size:30px;color:#D8B268}
.offer .what{font-size:28px;line-height:1.35;color:#EDEEEC;border-left:1.5px solid rgba(180,134,60,.6);padding-left:26px}
.fine{font-size:20px;color:#7d8181;margin-top:16px}
.foot{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:20px;margin:44px 72px 64px;padding-top:30px;border-top:1.5px solid rgba(237,238,236,.14)}
.cta{font-family:"IBM Plex Mono",monospace;font-size:24px;letter-spacing:.06em;background:#EDEEEC;color:#0A0B0D;padding:20px 30px;white-space:nowrap}
.cta b{font-weight:500}
.url{font-family:"IBM Plex Mono",monospace;font-size:24px;letter-spacing:.04em;color:#D8B268;white-space:nowrap}
`;

function page(f) {
  const parts = [];
  if (f.kicker) parts.push(`<p class="kicker">${f.kicker}</p>`);
  parts.push(`<h1>${em(f.headline)}</h1>`);
  if (f.price) parts.push(`<div class="price"><span class="cur">$</span><span class="amt">${f.price.amount}</span></div><p class="note">${f.price.note}</p>`);
  if (f.offer) parts.push(`<div class="offer"><div><span class="amt">${f.offer.amount}</span><span class="per">${f.offer.per}</span></div><div class="what">${f.offer.note}</div></div>`);
  if (f.body) parts.push(`<p class="body">${f.body}</p>`);
  if (f.compare) {
    const col = (c, win) => `<div class="col${win ? " win" : ""}"><h3>${c.title}</h3><ul>${c.items.map((i) => `<li>${i}</li>`).join("")}</ul></div>`;
    parts.push(`<div class="compare">${col(f.compare.left, false)}${col(f.compare.right, true)}</div>`);
  }
  if (f.checks) parts.push(`<ul class="list">${f.checks.map((c) => `<li>${c}</li>`).join("")}</ul>`);
  if (f.steps) parts.push(`<ol class="steps">${f.steps.map((s, i) => `<li><span>${i + 1}</span>${s}</li>`).join("")}</ol>`);
  if (f.fine) parts.push(`<p class="fine">${f.fine}</p>`);

  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=Manrope:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=block" rel="stylesheet">
<style>${CSS}</style></head><body>
<div class="flyer">
  <div class="hero" style="background-image:url('${img(f.image)}');top:${f.heroTop ?? 0}px;height:${f.heroHeight ?? 640}px"></div>
  <div class="brand"><span class="box">Apex</span><img src="${MARK}" alt=""><span class="sub">BRAND MANAGEMENT FIRM</span></div>
  <div class="content">
    <p class="eyebrow">${f.eyebrow}</p>
    ${parts.join("\n    ")}
  </div>
  <div class="foot"><span class="cta"><b>${f.cta} →</b></span><span class="url">${f.url}</span></div>
</div></body></html>`;
}

mkdirSync(SRC, { recursive: true });
const only = process.argv[2];
for (const f of FLYERS) {
  if (only && !f.file.startsWith(only)) continue;
  const html = join(SRC, `${f.file}.html`);
  writeFileSync(html, page(f));
  if (!CHROME) { console.log(`wrote ${html} (no Chrome found to render)`); continue; }
  const png = join(DIR, `${f.file}.png`);
  execFileSync(CHROME, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
    "--force-device-scale-factor=1", "--window-size=1080,1350", "--virtual-time-budget=8000",
    `--screenshot=${png}`, pathToFileURL(html).href,
  ], { stdio: "ignore" });
  console.log(`rendered ${png}`);
}
