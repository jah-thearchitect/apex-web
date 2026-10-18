// Facebook page images, matched to acc-funds.com:
//   profile.png  1080x1080  (Facebook shows it as a circle; logo sits inside the circle)
//   cover.png    1640x856   (desktop shows the middle 1640x624 band, phones crop the
//                            sides, so everything important stays in the center)
//   node marketing/facebook-page/build.mjs
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(DIR, "..", "..");
const sharp = createRequire(join(ROOT, "package.json"))("sharp");
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);

// ---- Profile picture: the mark + APEX from the approved logo kit (the small
// "Capital Consultants" line is dropped; it would be unreadable at avatar size).
const stacked = join(ROOT, "public", "brand", "kit", "apex-logo-stacked-on-dark.png");
const logo = await sharp(stacked).extract({ left: 420, top: 200, width: 1160, height: 980 }).resize({ width: 640 }).png().toBuffer();
const meta = await sharp(logo).metadata();
await sharp({ create: { width: 1080, height: 1080, channels: 3, background: "#0A0B0D" } })
  .composite([{ input: logo, left: Math.round((1080 - meta.width) / 2), top: Math.round((1080 - meta.height) / 2) + 10 }])
  .png()
  .toFile(join(DIR, "profile.png"));

// A round preview, to check the circle crop the way Facebook will show it.
const circle = Buffer.from('<svg width="1080" height="1080"><circle cx="540" cy="540" r="540" fill="#fff"/></svg>');
await sharp(join(DIR, "profile.png")).composite([{ input: circle, blend: "dest-in" }]).png().toFile(join(DIR, "profile-preview-round.png"));

// ---- Cover photo
const bg = pathToFileURL(join(ROOT, "marketing", "flyers", "img", "budget.png")).href;
const mark = pathToFileURL(join(ROOT, "public", "brand", "apex-mark-dark.png")).href;
const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,500;1,6..72,500&family=IBM+Plex+Mono:wght@400;500&display=block" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1640px;height:856px;overflow:hidden;background:#0A0B0D}
.c{position:relative;width:1640px;height:856px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#EDEEEC}
.bg{position:absolute;inset:0;background:url('${bg}') center 40%/cover}
.bg::after{content:"";position:absolute;inset:0;background:
  radial-gradient(ellipse 60% 70% at 50% 50%,rgba(10,11,13,.82) 0%,rgba(10,11,13,.6) 55%,rgba(10,11,13,.35) 100%),
  linear-gradient(180deg,rgba(10,11,13,.5),rgba(10,11,13,0) 30%,rgba(10,11,13,0) 70%,rgba(10,11,13,.6))}
.c > *:not(.bg){position:relative}
.brand{display:flex;align-items:center;gap:18px}
.box{border:1.5px solid #B4863C;padding:7px 18px;font-family:Newsreader,Georgia,serif;font-size:36px;background:rgba(10,11,13,.6)}
.brand img{height:46px}
h1{font-family:Newsreader,Georgia,serif;font-weight:500;font-size:82px;line-height:1.02;margin-top:34px;letter-spacing:-.01em}
h1 em{font-style:italic;color:#D8B268}
.line{font-family:"IBM Plex Mono",monospace;font-size:21px;letter-spacing:.24em;text-transform:uppercase;color:#D8B268;margin-top:30px}
.url{font-family:"IBM Plex Mono",monospace;font-size:22px;letter-spacing:.06em;color:#EDEEEC;margin-top:26px;opacity:.85}
</style></head><body><div class="c">
  <div class="bg"></div>
  <div class="brand"><span class="box">Apex</span><img src="${mark}" alt=""></div>
  <h1>We build brands that make <em>money</em>.</h1>
  <p class="line">Platforms &middot; Marketing &middot; AI &middot; Capital</p>
  <p class="url">acc-funds.com</p>
</div></body></html>`;
const htmlPath = join(DIR, "cover.html");
writeFileSync(htmlPath, html);
execFileSync(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
  "--force-device-scale-factor=1", "--window-size=1640,856", "--virtual-time-budget=8000",
  `--screenshot=${join(DIR, "cover.png")}`, pathToFileURL(htmlPath).href,
], { stdio: "ignore" });

// Desktop view check: the middle 1640x624 band.
await sharp(join(DIR, "cover.png")).extract({ left: 0, top: 116, width: 1640, height: 624 }).png().toFile(join(DIR, "cover-preview-desktop.png"));
console.log("profile.png, cover.png (+ previews) written");
