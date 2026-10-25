// Renders the Build Spotlight videos frame by frame in Chrome, piping the
// frames into ffmpeg.
//   node render.mjs stills            key frames as PNGs (for review)
//   node render.mjs [alss|nolas]       MP4s (9:16 and 4:5)
//   node render.mjs nolas --music path/to/track.mp3
// Voiceover lines in vo/ (<client>-1..4.mp3 + end.mp3) are mixed in when
// present; --no-vo renders without them. Music sits under the voice.
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
const noVo = args.includes("--no-vo");

function voFiles(client) {
  const files = [1, 2, 3, 4].map((n) => join(DIR, "vo", `${client}-${n}.mp3`)).concat(join(DIR, "vo", "end.mp3"));
  return !noVo && files.every((f) => existsSync(f)) ? files : null;
}

// ffmpeg args for the audio: each voice line delayed to its cue, music ducked under it.
function audioArgs(vo, cues, duration) {
  if (!vo && !music) return [];
  const inputs = [], parts = [], mix = [];
  let n = 1;
  for (const [i, f] of (vo || []).entries()) {
    inputs.push("-i", f);
    const ms = Math.round(cues[i] * 1000);
    parts.push(`[${n}:a]adelay=${ms}:all=1[v${i}]`);
    mix.push(`[v${i}]`);
    n++;
  }
  if (music) {
    inputs.push("-i", music);
    parts.push(`[${n}:a]volume=${vo ? 0.18 : 1},afade=t=out:st=${duration - 2}:d=2[m]`);
    mix.push("[m]");
  }
  parts.push(`${mix.join("")}amix=inputs=${mix.length}:normalize=0:duration=longest,apad,atrim=0:${duration},loudnorm=I=-16:TP=-1.5[a]`);
  return [...inputs, "-filter_complex", parts.join(";"), "-map", "0:v", "-map", "[a]", "-c:a", "aac", "-b:a", "192k", "-ar", "48000"];
}

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
        for (const t of [2, 8, 12, 17, 21, 24.5, 31]) {
          await page.evaluate((s) => window.seek(s), t);
          await page.screenshot({ path: join(OUT, `still-${client}-${fmt}-${String(t).replace(".", "_")}.png`) });
        }
        console.log(`stills: ${client} ${fmt}`);
        await page.close();
        continue;
      }

      const [duration, cues] = await page.evaluate(() => [window.DURATION, window.VO_CUES]);
      const file = join(OUT, `apex-spotlight-${client}-${fmt === "916" ? "9x16" : "4x5"}.mp4`);
      const ff = spawn(ffmpeg, [
        "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
        ...audioArgs(voFiles(client), cues, duration),
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
