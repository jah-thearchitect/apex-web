// Renders the Build Spotlight videos frame by frame in Chrome, piping the
// frames into ffmpeg.
//   node render.mjs stills            key frames as PNGs (for review)
//   node render.mjs [alss|nolas]       MP4s (9:16 and 4:5)
//   node render.mjs nolas --music path/to/track.mp3
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ffmpeg from "ffmpeg-static";
import puppeteer from "puppeteer-core";

const DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(DIR, "out");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FPS = 30;
const FORMATS = { "916": [1080, 1920], "45": [1080, 1350] };
const CLIENTS = ["alss", "nolas"];

const args = process.argv.slice(2);
const stills = args[0] === "stills";
const only = CLIENTS.includes(args[0]) ? args[0] : null;
const musicIdx = args.indexOf("--music");
const music = musicIdx >= 0 ? resolve(args[musicIdx + 1]) : null;
if (music && !existsSync(music)) throw new Error(`No music file at ${music}`);

mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--allow-file-access-from-files", "--hide-scrollbars", "--force-color-profile=srgb"],
});

async function open(client, fmt) {
  const [w, h] = FORMATS[fmt];
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(`${pathToFileURL(join(DIR, "composition.html")).href}?client=${client}&fmt=${fmt}`, { waitUntil: "networkidle0" });
  await page.evaluate(() => window.READY);
  return page;
}

try {
  for (const client of CLIENTS) {
    if (only && client !== only) continue;
    for (const fmt of Object.keys(FORMATS)) {
      const page = await open(client, fmt);
      if (stills) {
        for (const t of [1.6, 6.5, 11, 17, 21.5, 24.5, 28.5]) {
          await page.evaluate((s) => window.seek(s), t);
          await page.screenshot({ path: join(OUT, `still-${client}-${fmt}-${String(t).replace(".", "_")}.png`) });
        }
        console.log(`stills: ${client} ${fmt}`);
        await page.close();
        continue;
      }

      const duration = await page.evaluate(() => window.DURATION);
      const file = join(OUT, `apex-spotlight-${client}-${fmt === "916" ? "9x16" : "4x5"}.mp4`);
      const ff = spawn(ffmpeg, [
        "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
        ...(music ? ["-i", music, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "192k", "-af", `afade=t=out:st=${duration - 2}:d=2`, "-shortest"] : []),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium", "-movflags", "+faststart",
        file,
      ], { stdio: ["pipe", "ignore", "pipe"] });
      let errText = "";
      ff.stderr.on("data", (d) => { errText = (errText + d).slice(-2000); });
      const done = new Promise((res, rej) => ff.on("close", (code) => (code === 0 ? res() : rej(new Error(errText)))));

      const frames = Math.round(duration * FPS);
      for (let i = 0; i < frames; i++) {
        await page.evaluate((s) => window.seek(s), i / FPS);
        const buf = await page.screenshot({ type: "jpeg", quality: 92 });
        if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
        if (i % 150 === 0) process.stdout.write(`${client} ${fmt}: ${i}/${frames}\r`);
      }
      ff.stdin.end();
      await done;
      console.log(`rendered ${file}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
