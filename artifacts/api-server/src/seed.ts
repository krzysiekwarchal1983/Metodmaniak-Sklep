import { db, pool, productsTable } from "@workspace/db";
import { logger } from "./lib/logger";
import { makeWaftersRange } from "./lib/wafters-range";

async function seed() {
  const existing = await db.select({ id: productsTable.id }).from(productsTable).limit(1);
  if (existing.length) { logger.info("Catalogue already populated; no changes made."); return; }
  const wafters = makeWaftersRange();
  const others = [
    ...["1mm", "2mm", "4.5mm", "6mm", "8mm"].map((size) => ({
      name: `Pellet Method ${size}`, category: "pellety", subcategory: size, priceCents: 1990, image: "/images/pellet.png",
      description: `Przykładowy pellet do method feeder, granulacja ${size}, opakowanie 800 g. Namaczanie dostosuj do temperatury wody. Produkt demonstracyjny.`,
      variants: ["800 g"], color: "Brązowy", scent: "Halibut",
    })),
    ...["Komercyjne", "PZW"].map((type) => ({
      name: `Zanęta Method ${type}`, category: "zanety", subcategory: type, priceCents: 2290, image: "/images/groundbait.png",
      description: `Przykładowa mieszanka do łowisk ${type === "PZW" ? "naturalnych" : "komercyjnych"}, opakowanie 1 kg. Stopniowo dowilżaj i przetrzyj przez sito. Produkt demonstracyjny.`,
      variants: ["1 kg"], color: "Brązowy", scent: "Kryl",
    })),
    ...["10cm", "15cm", "30cm"].map((length) => ({
      name: `Przypon Method ${length}`, category: "przypony", subcategory: length, priceCents: 1490, image: "/images/hooks.png",
      description: `Przykładowy przypon o długości ${length}, zestaw 3 sztuk. Wybierz rozmiar haka. Specyfikację sprawdź przed docelowym udostępnieniem produktu do sprzedaży.`,
      variants: ["Hak #10", "Hak #12", "Hak #14"], color: "", scent: "",
    })),
  ].map((p) => ({ ...p, images: [p.image], stock: 32, featured: p.subcategory === "2mm", badge: "" }));
  await db.insert(productsTable).values([...wafters, ...others]);
  logger.info({ count: wafters.length + others.length }, "Demonstration catalogue seeded");
}
seed().catch((err) => { logger.error({ err }, "Seeding failed"); process.exitCode = 1; }).finally(() => pool.end());
