import sharp from "sharp";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourceDir = path.join(root, "public/images");
const outputDir = path.join(sourceDir, "optimized");
await mkdir(outputDir, { recursive: true });
await mkdir(path.join(root, "src/assets"), { recursive: true });
const manifest = {};
for (const file of (await readdir(sourceDir)).filter((name) => name.endsWith(".png")).sort()) {
  const input = path.join(sourceDir, file);
  const metadata = await sharp(input).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Missing image dimensions: ${file}`);
  const widths = [...new Set([320, 640, 1280, metadata.width].map((w) => Math.min(w, metadata.width)))].sort((a, b) => a - b);
  const sources = [];
  for (const width of widths) {
    const name = `${path.parse(file).name}-${width}.webp`;
    const result = await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(path.join(outputDir, name));
    sources.push({ width: result.width, src: `/images/optimized/${name}`, bytes: result.size });
  }
  const originalBytes = (await stat(input)).size;
  manifest[`/images/${file}`] = { width: metadata.width, height: metadata.height, originalBytes, sources };
  const largest = sources.at(-1);
  console.log(`${file}: ${originalBytes} → ${largest.bytes} bytes (${Math.round(100 * (1 - largest.bytes / originalBytes))}% smaller, largest version)`);
}
await writeFile(path.join(root, "src/assets/image-variants.json"), `${JSON.stringify(manifest, null, 2)}\n`);
