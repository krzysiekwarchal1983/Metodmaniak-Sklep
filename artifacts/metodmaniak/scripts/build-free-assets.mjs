import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const root = path.resolve(app, "../..");
const sharp = createRequire(path.join(app, "package.json"))("sharp");
const output = path.join(root, "generated-artifacts/free-materials");
await mkdir(output, { recursive: true });
const photo = await readFile(process.argv[2] ?? path.join(root, "generated-artifacts/wafters-images/hero-water.webp"));
const original = await sharp(path.join(app, "public/brand/wordmark.png")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
// Recover the supplied fluorescent artwork from either a transparent or black canvas.
for (let i = 0; i < original.data.length; i += 4) {
  original.data[i + 3] = Math.min(original.data[i + 3], original.data[i + 1]);
  original.data[i] = 204; original.data[i + 1] = 255; original.data[i + 2] = 0;
}
const logo = await sharp(original.data, { raw: original.info }).trim().png().toBuffer();
const symbol = await sharp(original.data, { raw: original.info })
  .extract({ left: 0, top: 0, width: Math.round(original.info.width * .165), height: original.info.height }).trim().png().toBuffer();
const entries = [];
const save = async (fileName, buffer, meta) => {
  await writeFile(path.join(output, fileName), buffer);
  const { width, height } = await sharp(buffer).metadata().catch(() => ({}));
  const previewName = `${fileName.replace(/\.[^.]+$/, "")}-preview.webp`;
  await sharp(meta.iconPreview ?? buffer).resize({ width: 640, height: 480, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(output, previewName));
  const { iconPreview, ...details } = meta;
  entries.push({ ...details, fileName, width, height, bytes: buffer.length, previewName });
};
const icon = async (size) => sharp({
  create: { width: size, height: size, channels: 4, background: "#0f110e" },
}).composite([{ input: await sharp(symbol).resize({ width: Math.round(size * .62) }).toBuffer(), gravity: "centre" }]).png().toBuffer();
for (const size of [192, 512]) {
  await writeFile(path.join(app, `public/brand/app-${size}.png`), await icon(size));
}
for (const item of [
  { id: "facebook", title: "Okładka na Facebooka", fileName: "metodmaniak-facebook-1640x624.jpg", width: 1640, height: 624, y: .57, logoWidth: .64 },
  { id: "phone", title: "Tapeta na telefon", fileName: "metodmaniak-telefon-1080x2400.png", width: 1080, height: 2400, y: .7, logoWidth: .8 },
  { id: "desktop", title: "Tapeta na komputer", fileName: "metodmaniak-komputer-2560x1440.jpg", width: 2560, height: 1440, y: .65, logoWidth: .52 },
]) {
  const { width, height } = item;
  const base = await sharp(photo).resize(width, height, { fit: "cover", position: "centre" }).toBuffer();
  const mark = await sharp(logo).resize(Math.round(width * item.logoWidth)).toBuffer();
  const markMeta = await sharp(mark).metadata();
  const decoration = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="shade" x2="0" y2="1"><stop stop-color="#0f110e" stop-opacity=".38"/><stop offset="1" stop-color="#0f110e" stop-opacity=".9"/></linearGradient><pattern id="camo" width="128" height="96" patternUnits="userSpaceOnUse"><path d="M0 0h32v16h32v16H48v16H16V32H0zM80 64h32v16h16v16H96V80H80z" fill="#ccff00" opacity=".045"/></pattern></defs><path fill="url(#shade)" d="M0 0h${width}v${height}H0z"/><path fill="url(#camo)" d="M0 0h${width}v${height}H0z"/><path stroke="#ccff00" stroke-opacity=".55" stroke-width="2" d="M${width * .1} ${height * .88}h${width * .8}"/></svg>`);
  const composed = sharp(base).composite([
    { input: decoration },
    { input: mark, left: Math.round((width - markMeta.width) / 2), top: Math.round(height * item.y) },
  ]);
  const data = item.fileName.endsWith(".png") ? await composed.png().toBuffer() : await composed.jpeg({ quality: 91, mozjpeg: true }).toBuffer();
  await save(item.fileName, data, { id: item.id, title: item.title, description: "Jezioro, dalekie góry i las oraz oryginalne logo MetodManiaka.", category: "wallpapers", format: item.fileName.endsWith(".png") ? "PNG" : "JPG" });
}
await save("metodmaniak-logo.png", logo, { id: "logo-png", title: "Logo — przezroczyste tło", description: "Oryginalny znak i napis MetodManiak w kolorze fluo.", category: "logos", format: "PNG" });
await save("metodmaniak-logo.webp", await sharp(logo).webp({ lossless: true }).toBuffer(), { id: "logo-webp", title: "Logo — wersja WebP", description: "Przezroczyste tło i lekki, bezstratny format internetowy.", category: "logos", format: "WebP" });
await save("metodmaniak-logo.jpg", await sharp(logo).flatten({ background: "#0f110e" }).jpeg({ quality: 96 }).toBuffer(), { id: "logo-jpg", title: "Logo — ciemne tło", description: "Wersja JPG do prostego wykorzystania na ciemnym tle.", category: "logos", format: "JPG" });
const appIcon = await icon(512);
await save("metodmaniak-ikona-512.png", appIcon, { id: "icon-png", title: "Ikona MetodManiaka", description: "Oryginalny symbol wycięty z dostarczonego logo, na ciemnym tle.", category: "icons", format: "PNG" });
const sizes = [16, 32, 48, 64, 256];
const pngs = await Promise.all(sizes.map(icon));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
pngs.forEach((buffer, i) => {
  const at = 6 + i * 16;
  header[at] = sizes[i] === 256 ? 0 : sizes[i]; header[at + 1] = header[at];
  header.writeUInt16LE(1, at + 4); header.writeUInt16LE(32, at + 6);
  header.writeUInt32LE(buffer.length, at + 8); header.writeUInt32LE(offset, at + 12);
  offset += buffer.length;
});
await save("metodmaniak-ikony.ico", Buffer.concat([header, ...pngs]), { id: "icon-ico", title: "Ikony — zestaw ICO", description: "Rozmiary 16, 32, 48, 64 i 256 px w jednym pliku.", category: "icons", format: "ICO", iconPreview: appIcon });
await writeFile(path.join(output, "index.json"), JSON.stringify(entries, null, 2));
console.log(`Prepared ${entries.length} downloads and PWA icons.`);
