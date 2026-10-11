// Regenerates the raster logo files from components/LogoMark.tsx:
//   npx tsx scripts/build-brand-assets.tsx
// Email clients can't render inline SVG, so emails use these PNGs.
import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { LogoMark } from "../components/LogoMark";

async function main() {
  for (const tone of ["light", "dark"] as const) {
    const svg = renderToStaticMarkup(<LogoMark tone={tone} width={400} />).replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    writeFileSync(`public/brand/apex-mark-${tone}.svg`, svg);
    await sharp(Buffer.from(svg)).resize(400).png().toFile(`public/brand/apex-mark-${tone}.png`);
  }

  // Favicon: the dark-tone mark on the site's ink, rounded square.
  const inner = renderToStaticMarkup(<LogoMark tone="dark" width={52} />)
    .replace("<svg", '<svg x="6" y="15"');
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0A0B0D"/>${inner}</svg>`;
  writeFileSync("app/icon.svg", icon);
  console.log("brand assets written");
}

main();
