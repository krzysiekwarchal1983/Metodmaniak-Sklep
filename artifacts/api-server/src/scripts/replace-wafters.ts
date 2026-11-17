import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { eq, sql } from "drizzle-orm";
import { db, pool, productsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { makeWaftersRange } from "../lib/wafters-range";

const oldDemoNames = new Set([
  "Wafters Ananas 6mm", "Wafters Truskawka 8mm", "Wafters Kryl 6mm",
  "Wafters Czosnek 10mm", "Wafters Wanilia 8mm", "Wafters Ananas Orange 8mm",
  "Wafters Kryl Pink Maggots", "Wafters Czosnek Yellow 6mm", "Wafters Wanilia Pink 8mm",
  "Wafters Truskawka White 6mm", "Wafters Wanilia Orange 10mm",
]);

async function replace() {
  if (!process.argv.includes("--confirm-replace")) {
    throw new Error("Requires --confirm-replace. Only the approved eleven demo wafters will be replaced.");
  }
  const result = await db.transaction(async (tx) => {
    // Reads keep working, but concurrent catalogue writes cannot be lost during replacement.
    await tx.execute(sql`LOCK TABLE ${productsTable} IN SHARE ROW EXCLUSIVE MODE`);
    const before = await tx.select().from(productsTable).orderBy(productsTable.id);
    const current = before.filter((p) => p.category === "waftersy");
    const target = makeWaftersRange();
    const targetNames = new Set(target.map((p) => p.name));
    if (current.length === target.length && new Set(current.map((p) => p.name)).size === target.length && current.every((p) => targetNames.has(p.name))) {
      return { skipped: true, count: current.length }; // Preserve later admin edits and stable IDs.
    }
    if (current.length !== oldDemoNames.size || current.some((p) => !oldDemoNames.has(p.name) || p.priceCents !== 2490)) {
      throw new Error("Catalogue differs from the approved demo range. No products were changed; review it manually.");
    }
    const backupDir = new URL("../../../../generated-artifacts/catalogue/", import.meta.url);
    await mkdir(backupDir, { recursive: true });
    const backup = new URL(`wafters-before-replacement-${Date.now()}.json`, backupDir);
    await writeFile(backup, JSON.stringify(current, null, 2), { flag: "wx" });
    await tx.delete(productsTable).where(eq(productsTable.category, "waftersy"));
    const inserted = await tx.insert(productsTable).values(target).returning();
    const after = await tx.select().from(productsTable).orderBy(productsTable.id);
    if (inserted.length !== 45 || JSON.stringify(before.filter((p) => p.category !== "waftersy")) !== JSON.stringify(after.filter((p) => p.category !== "waftersy"))) {
      throw new Error("Replacement verification failed; transaction rolled back.");
    }
    return { skipped: false, removed: current.length, inserted: inserted.length, otherProductsUnchanged: true, backup: fileURLToPath(backup) };
  });
  logger.info(result, "Approved wafters range replacement completed");
}

replace().catch((err) => { logger.error({ err }, "Wafters replacement failed"); process.exitCode = 1; }).finally(() => pool.end());
