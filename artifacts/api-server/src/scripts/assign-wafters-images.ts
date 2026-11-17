import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { makeWaftersRange } from "../lib/wafters-range";
import { WAFTERS_PREVIEW_IMAGES, WAFTERS_PREVIEW_NOTICE } from "../lib/wafters-images";

async function main() {
  if (!process.argv.includes("--apply")) throw new Error("Use --apply to assign generated previews to the existing wafters catalogue.");
  const expected = makeWaftersRange();
  const result = await db.transaction(async (tx) => {
    const before = await tx.select().from(productsTable).where(eq(productsTable.category, "waftersy")).orderBy(productsTable.id).for("update");
    assert.equal(before.length, expected.length, "Unexpected catalogue size; no images changed.");
    assert.deepEqual(before.map((p) => p.name).sort(), expected.map((p) => p.name).sort(), "Unexpected product names; no images changed.");
    const backupDir = path.resolve(import.meta.dirname, "../../../../generated-artifacts/catalogue");
    await mkdir(backupDir, { recursive: true });
    await writeFile(path.join(backupDir, `wafters-images-before-${Date.now()}.json`), JSON.stringify(before.map(({ id, image, description }) => ({ id, image, description })), null, 2));
    let updated = 0;
    let realPhotosPreserved = 0;
    for (const product of before) {
      if (product.image && !product.image.startsWith("/api/storage/public-objects/wafters-previews/")) { realPhotosPreserved++; continue; }
      const image = WAFTERS_PREVIEW_IMAGES[product.color as keyof typeof WAFTERS_PREVIEW_IMAGES];
      assert.ok(image, `No preview for colour ${product.color}`);
      let description = product.description.replace(/\n?Zdjęcie produktu w przygotowaniu\./g, "");
      if (!description.includes(WAFTERS_PREVIEW_NOTICE)) description += `\n${WAFTERS_PREVIEW_NOTICE}`;
      if (image === product.image && description === product.description) continue;
      await tx.update(productsTable).set({ image, description }).where(eq(productsTable.id, product.id));
      updated++;
    }
    const after = await tx.select().from(productsTable).where(eq(productsTable.category, "waftersy")).orderBy(productsTable.id);
    const untouched = ({ image: _image, description: _description, ...rest }: typeof before[number]) => rest;
    assert.deepEqual(after.map(untouched), before.map(untouched), "Non-image product data changed; rolling back.");
    return { updated, realPhotosPreserved, total: after.length };
  });
  console.log(JSON.stringify(result));
}

main().then(() => process.exit(0), (error: unknown) => { console.error(error instanceof Error ? error.message : "Image assignment failed."); process.exit(1); });
