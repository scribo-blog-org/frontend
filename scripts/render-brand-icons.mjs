import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import pngToIco from "png-to-ico";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const publicDir = path.join(rootDir, "public");
const assetsDir = path.join(rootDir, "src", "assets", "svg");

const BG = "#161616";
const INK = "#ffffff";

function innerSvg(source) {
    return source
        .replace(/<\?xml[^>]*>/, "")
        .replace(/<svg[^>]*>/, "")
        .replace(/<\/svg>\s*$/, "")
        .replace(/currentColor/g, INK)
        .replace(/fill="currentColor"/g, `fill="${INK}"`);
}

function squareIcon(markInner) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${BG}"/>
  <svg x="86" y="116" width="340" height="272" viewBox="0 0 135 108" fill="${INK}">
    ${markInner}
  </svg>
</svg>
`;
}

function socialCard(wordmarkInner) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${BG}"/>
  <svg x="230" y="228" width="740" height="161" viewBox="0 0 506 110" fill="${INK}">
    ${wordmarkInner}
  </svg>
</svg>
`;
}

function png(svg, width) {
    return new Resvg(svg, {
        fitTo: { mode: "width", value: width },
        background: BG,
    }).render().asPng();
}

const mark = innerSvg(await readFile(path.join(assetsDir, "mini-logo-icon.svg"), "utf8"));
const wordmark = innerSvg(await readFile(path.join(assetsDir, "full-logo-icon.svg"), "utf8"));
const iconSvg = squareIcon(mark);
const ogSvg = socialCard(wordmark);

await writeFile(path.join(publicDir, "icon.svg"), iconSvg);
await writeFile(path.join(publicDir, "logo-512.png"), png(iconSvg, 512));
await writeFile(path.join(publicDir, "logo-192.png"), png(iconSvg, 192));
await writeFile(path.join(publicDir, "apple-touch-icon.png"), png(iconSvg, 180));
await writeFile(path.join(publicDir, "og.png"), png(ogSvg, 1200));

const ico = await pngToIco([png(iconSvg, 16), png(iconSvg, 32), png(iconSvg, 48)]);
await writeFile(path.join(publicDir, "favicon.ico"), ico);

console.log("[brand] wrote icon.svg, favicon.ico, logo-192.png, logo-512.png, apple-touch-icon.png, og.png");
