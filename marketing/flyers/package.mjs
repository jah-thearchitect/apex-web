// Bundles the flyers for sharing: one PDF (each flyer beside its caption)
// and one ZIP (full-size PNGs + captions.txt). Run after build.mjs:
//   node marketing/flyers/package.mjs
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, "export");
const require = createRequire(join(DIR, "..", "..", "package.json"));
const sharp = require("sharp");
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);

// captions.txt: a "N. file.png" line between ==== rules, then the caption.
const raw = readFileSync(join(DIR, "captions.txt"), "utf8").replace(/\r\n/g, "\n");
const posts = [...raw.matchAll(/=+\n(\d+)\. (\S+\.png)\n=+\n([\s\S]*?)(?=\n=+\n|\s*$)/g)].map((m) => ({
  n: m[1], file: m[2], caption: m[3].trim(),
}));
if (posts.length === 0) throw new Error("No captions found in captions.txt");

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
mkdirSync(OUT, { recursive: true });

// JPEG copies keep the PDF small enough to email comfortably.
const pages = [];
for (const p of posts) {
  const jpg = join(OUT, `page-${p.n}.jpg`);
  await sharp(join(DIR, p.file)).jpeg({ quality: 86 }).toFile(jpg);
  pages.push(`<section class="page">
  <img src="${pathToFileURL(jpg).href}" alt="">
  <div class="cap">
    <p class="num">Flyer ${p.n} of ${posts.length}</p>
    <p class="file">${esc(p.file)}</p>
    <div class="text">${esc(p.caption)}</div>
  </div>
</section>`);
}

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500&family=Manrope:wght@400;600&family=IBM+Plex+Mono:wght@500&display=block" rel="stylesheet">
<style>
@page{size:11in 8.5in;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Manrope,Arial,sans-serif;color:#101113}
.cover,.page{width:11in;height:8.5in;page-break-after:always;overflow:hidden}
.cover{background:#0A0B0D;color:#EDEEEC;display:flex;flex-direction:column;justify-content:center;padding:0 1in}
.cover .box{display:inline-block;border:1.5px solid #B4863C;padding:6px 16px;font-family:Newsreader,Georgia,serif;font-size:30px;align-self:flex-start}
.cover h1{font-family:Newsreader,Georgia,serif;font-weight:500;font-size:54px;margin-top:28px}
.cover p{color:#9CA0A0;font-size:17px;margin-top:14px;max-width:6.5in;line-height:1.6}
.cover .gold{color:#D8B268;font-family:"IBM Plex Mono",monospace;font-size:13px;letter-spacing:.18em;text-transform:uppercase}
.page{display:flex;gap:.45in;padding:.5in;align-items:center;background:#F6F5F1}
.page img{height:7.5in;width:6in;flex:none;box-shadow:0 4px 18px rgba(0,0,0,.18)}
.cap{flex:1;min-width:0;align-self:stretch;display:flex;flex-direction:column;padding-top:.15in}
.num{font-family:"IBM Plex Mono",monospace;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#8A6220}
.file{font-family:"IBM Plex Mono",monospace;font-size:11px;color:#8A8D8F;margin-top:4px}
.text{white-space:pre-wrap;font-size:13.5px;line-height:1.6;margin-top:18px;border-top:1px solid #dcdad3;padding-top:16px}
</style></head><body>
<section class="cover">
  <span class="box">Apex</span>
  <h1>Facebook flyers &amp; captions</h1>
  <p>Six ready-to-post flyers (1080 &times; 1350, Facebook&rsquo;s 4:5 feed size), each with its caption. The full-size images are in the ZIP that comes with this PDF.</p>
  <p class="gold" style="margin-top:36px">Apex Capital Consultants &middot; acc-funds.com</p>
</section>
${pages.join("\n")}
</body></html>`;

const htmlPath = join(OUT, "flyers.html");
writeFileSync(htmlPath, html);
const pdf = join(OUT, "Apex-Facebook-Flyers.pdf");
execFileSync(CHROME, [
  "--headless=new", "--disable-gpu", "--allow-file-access-from-files", "--no-pdf-header-footer",
  "--virtual-time-budget=8000", `--print-to-pdf=${pdf}`, pathToFileURL(htmlPath).href,
], { stdio: "ignore" });

// ZIP: the PNGs exactly as rendered, plus the captions.
const zip = join(OUT, "Apex-Facebook-Flyers.zip");
rmSync(zip, { force: true });
const files = [...posts.map((p) => join(DIR, p.file)), join(DIR, "captions.txt")].map((f) => `'${f.replace(/'/g, "''")}'`).join(",");
execFileSync("powershell.exe", ["-NoProfile", "-Command", `Compress-Archive -Path ${files} -DestinationPath '${zip}'`]);

if (!process.env.KEEP) for (const p of posts) rmSync(join(OUT, `page-${p.n}.jpg`), { force: true });
if (!process.env.KEEP) rmSync(htmlPath, { force: true });
console.log(`${pdf}\n${zip}`);
