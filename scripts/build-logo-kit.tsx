// Builds the downloadable logo kit into public/brand/kit/:
//   npx tsx scripts/build-logo-kit.tsx
// Every file is pure vector (the wordmark is converted to outlines, so no
// font is needed to open it), plus a 2000px PNG of each.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import opentype from "opentype.js";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { LogoMark } from "../components/LogoMark";

const OUT = "public/brand/kit";
const fontDir = "node_modules/@fontsource/montserrat/files";
const load = (w: number) => {
  const buf = readFileSync(`${fontDir}/montserrat-latin-${w}-normal.woff`);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};
const heavy = load(800);
const semi = load(600);

/** Text as an SVG path with letter-spacing (in em). Returns path + width. */
function textPath(font: opentype.Font, text: string, size: number, tracking: number, x: number, y: number, fill: string) {
  let cursor = x;
  const parts: string[] = [];
  for (const ch of text) {
    const glyph = font.charToGlyph(ch);
    parts.push(glyph.getPath(cursor, y, size).toPathData(2));
    cursor += (glyph.advanceWidth! / font.unitsPerEm) * size + tracking * size;
  }
  const width = cursor - x - tracking * size;
  return { d: `<path fill="${fill}" d="${parts.join("")}"/>`, width };
}

function measure(font: opentype.Font, text: string, size: number, tracking: number) {
  return textPath(font, text, size, tracking, 0, 0, "#000").width;
}

function markSvg(tone: "light" | "dark", x: number, y: number, w: number) {
  return renderToStaticMarkup(<LogoMark tone={tone} width={w} />).replace("<svg", `<svg x="${x}" y="${y}"`);
}

type Theme = { tone: "light" | "dark"; word: string; tag: string; bg?: string };
const THEMES: Record<string, Theme> = {
  "black-gold": { tone: "light", word: "#0A0B0D", tag: "#8A6220" },
  "on-dark": { tone: "dark", word: "#EDEEEC", tag: "#D8B268", bg: "#0A0B0D" },
  "white": { tone: "dark", word: "#FFFFFF", tag: "#D8B268" },
};

function stacked(t: Theme) {
  const W = 640, pad = 60;
  const markW = 300, markH = Math.round((markW * 130) / 200);
  const wordSize = 120, tagSize = 30;
  const wordW = measure(heavy, "APEX", wordSize, 0.02);
  const tagW = measure(semi, "CAPITAL CONSULTANTS", tagSize, 0.08);
  const wordY = pad + markH + 30 + wordSize * 0.72;
  const tagY = wordY + 24 + tagSize * 0.75;
  const H = Math.round(tagY + pad);
  const word = textPath(heavy, "APEX", wordSize, 0.02, (W - wordW) / 2, wordY, t.word);
  const tag = textPath(semi, "CAPITAL CONSULTANTS", tagSize, 0.08, (W - tagW) / 2, tagY, t.tag);
  return { W, H, body: `${t.bg ? `<rect width="${W}" height="${H}" fill="${t.bg}"/>` : ""}${markSvg(t.tone, (W - markW) / 2, pad, markW)}${word.d}${tag.d}` };
}

function horizontal(t: Theme) {
  const pad = 40, markW = 200, markH = 130;
  const wordSize = 92, tagSize = 23;
  const textX = pad + markW + 32;
  const wordY = pad + 70, tagY = wordY + 46;
  const wordW = measure(heavy, "APEX", wordSize, 0.02);
  const tagW = measure(semi, "CAPITAL CONSULTANTS", tagSize, 0.08);
  const W = Math.round(textX + Math.max(wordW, tagW) + pad);
  const H = pad * 2 + markH;
  const word = textPath(heavy, "APEX", wordSize, 0.02, textX, wordY, t.word);
  const tag = textPath(semi, "CAPITAL CONSULTANTS", tagSize, 0.08, textX, tagY, t.tag);
  return { W, H, body: `${t.bg ? `<rect width="${W}" height="${H}" fill="${t.bg}"/>` : ""}${markSvg(t.tone, pad, pad, markW)}${word.d}${tag.d}` };
}

function markOnly(t: Theme) {
  const pad = 40, W = 280, H = Math.round((200 * 130) / 200) + pad * 2;
  return { W, H, body: `${t.bg ? `<rect width="${W}" height="${H}" fill="${t.bg}"/>` : ""}${markSvg(t.tone, pad, pad, 200)}` };
}

async function write(name: string, { W, H, body }: { W: number; H: number; body: string }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${body}</svg>`;
  writeFileSync(`${OUT}/${name}.svg`, svg);
  await sharp(Buffer.from(svg), { density: 300 }).resize({ width: 2000 }).png().toFile(`${OUT}/${name}.png`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const [key, t] of Object.entries(THEMES)) {
    await write(`apex-logo-stacked-${key}`, stacked(t));
    await write(`apex-logo-horizontal-${key}`, horizontal(t));
    await write(`apex-mark-${key}`, markOnly(t));
  }
  console.log("logo kit written to", OUT);
}

main();
