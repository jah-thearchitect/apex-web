// Full-page captures of client sites' PUBLIC pages, at phone and laptop
// sizes, for the Build Spotlight videos. Scrolls each page first so
// lazy-loaded images and scroll animations have appeared.
//   node capture.mjs            (all)   |   node capture.mjs alss
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, "captures");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

export const SITES = {
  alss: { base: "https://affordablelivingservices.org", pages: ["/", "/services", "/enroll"] },
  nolas: { base: "https://nolascreationz.com", pages: ["/", "/menu", "/catering"] },
};

const SIZES = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1.25 },
};
const MAX_HEIGHT = 9000; // CSS px; long pages are cut here

const slug = (p) => (p === "/" ? "home" : p.replace(/^\/|\/$/g, "").replace(/\//g, "-"));

mkdirSync(OUT, { recursive: true });
const only = process.argv[2];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--hide-scrollbars"] });
try {
  for (const [key, site] of Object.entries(SITES)) {
    if (only && key !== only) continue;
    for (const path of site.pages) {
      for (const [size, viewport] of Object.entries(SIZES)) {
        const page = await browser.newPage();
        await page.setViewport(viewport);
        if (viewport.isMobile) {
          await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1");
        }
        // Skip first-visit popups (newsletter/cookie modals) where sites check localStorage.
        await page.evaluateOnNewDocument(() => {
          try { localStorage.setItem("nl-dismissed", "1"); localStorage.setItem("newsletter-dismissed", "1"); } catch {}
        });
        await page.goto(site.base + path, { waitUntil: "networkidle2", timeout: 60_000 });
        // Walk down the page so lazy content loads, then back to the top.
        const h = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = 0; y < Math.min(h, MAX_HEIGHT); y += viewport.height * 0.7) {
          await page.evaluate((yy) => window.scrollTo(0, yy), y);
          await new Promise((r) => setTimeout(r, 250));
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise((r) => setTimeout(r, 800));
        // Close anything still floating over the page (dialogs, cookie bars).
        await page.evaluate(() => {
          document.querySelectorAll('[role="dialog"], [aria-modal="true"], .modal, .cookie, [class*="cookie"], [class*="Cookie"]').forEach((el) => (el.style.display = "none"));
          document.body.style.overflow = "auto";
        });
        const full = Math.min(await page.evaluate(() => document.documentElement.scrollHeight), MAX_HEIGHT);
        const file = join(OUT, `${key}-${slug(path)}-${size}.png`);
        await page.screenshot({ path: file, clip: { x: 0, y: 0, width: viewport.width, height: full }, captureBeyondViewport: true });
        console.log(`${file}  (${viewport.width}x${full})`);
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
