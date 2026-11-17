import { randomUUID } from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import { and, desc, eq, ilike, inArray, lt, or, sql } from "drizzle-orm";
import { db, productsTable, stockHistoryTable, uploadsTable } from "@workspace/db";
import {
  ListCategoriesResponse, ListProductsQueryParams, ListProductsResponse,
  ListProductColorsQueryParams, ListProductColorsResponse,
  GetProductParams, GetProductResponse, CreateProductBody, CreateProductResponse,
  UpdateProductParams, UpdateProductBody, UpdateProductResponse, DeleteProductParams,
  UpdateProductStocksBody, UpdateProductStocksResponse,
  ListStockHistoryResponse, ExportStockHistoryQueryParams,
  ReplaceWaftersColorPhotoBody, ReplaceWaftersColorPhotoResponse,
} from "@workspace/api-zod";
import { adminActorId, requireAdmin } from "../middlewares/admin";
import { categories, serializeProduct, validCategory, safeImage } from "../lib/catalogue";
import { realWaftersMedia } from "../lib/wafters-images";
import { parseStockHistoryFilters, stockHistoryWhere } from "../lib/stock-history-filters";
import { streamStockHistoryCsv } from "../lib/stock-history-export";

const router: IRouter = Router();

router.patch("/products/color-photo", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ReplaceWaftersColorPhotoBody.safeParse(req.body);
  if (!parsed.success || new Set(parsed.data.products.map((p) => p.id)).size !== 3) {
    res.status(400).json({ error: "Wybierz kolor, przesłane zdjęcie i potwierdź trzy produkty." }); return;
  }
  const { color, image, products } = parsed.data;
  const [upload] = await db.select().from(uploadsTable)
    .where(eq(uploadsTable.objectPath, image.slice("/api/storage".length)));
  if (!upload || upload.ownerId !== adminActorId(req)) {
    res.status(403).json({ error: "Wybierz zdjęcie przesłane przez Ciebie w panelu." }); return;
  }
  if (!upload.published || !["image/jpeg", "image/png", "image/webp"].includes(upload.contentType)) {
    res.status(400).json({ error: "Najpierw prześlij i opublikuj poprawne zdjęcie JPG, PNG lub WebP." }); return;
  }
  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(productsTable)
      .where(and(eq(productsTable.category, "waftersy"), eq(productsTable.color, color)))
      .orderBy(productsTable.id).for("update");
    if (rows.length !== 3 || !["6mm", "8mm", "10mm"].every((size) => rows.filter((p) => p.subcategory === size).length === 1)) return null;
    if (rows.some((row) => {
      const expected = products.find((p) => p.id === row.id);
      return !expected || expected.image !== row.image || JSON.stringify(expected.images) !== JSON.stringify(row.images);
    })) return null;
    const updated = [];
    for (const row of rows) {
      const [saved] = await tx.update(productsTable).set(realWaftersMedia(row, image))
        .where(eq(productsTable.id, row.id)).returning();
      updated.push(serializeProduct(saved));
    }
    return ReplaceWaftersColorPhotoResponse.parse(updated);
  });
  if (!result) {
    res.status(409).json({ error: "Lista produktów lub zdjęcia uległy zmianie. Nic nie zapisano. Sprawdź ponownie listę trzech rozmiarów i potwierdź." }); return;
  }
  res.json(result);
});

function stockActor(req: Request) {
  const actor = adminActorId(req);
  if (!actor) throw new Error("Missing administrator identity");
  // Preview actor IDs are tied to temporary sessions: never persist them.
  return actor.startsWith("preview:") ? "preview-admin" : actor;
}

router.get("/admin/stock-history", requireAdmin, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const filters = parseStockHistoryFilters(req.query);
  if (!filters) {
    res.status(400).json({ error: "Nieprawidłowe filtry lub strona historii. Sprawdź identyfikatory i zakres dat." }); return;
  }
  const { before, limit = 50 } = filters;
  const rows = await db.select().from(stockHistoryTable)
    .where(and(
      before ? lt(stockHistoryTable.id, before) : undefined,
      stockHistoryWhere(filters),
    ))
    .orderBy(desc(stockHistoryTable.id)).limit(limit + 1);
  const items = rows.slice(0, limit);
  res.json(ListStockHistoryResponse.parse({
    items: items.map((row) => ({ ...row, changedAt: row.changedAt.toISOString() })),
    nextCursor: rows.length > limit ? items[items.length - 1].id : null,
  }));
});

router.get("/admin/stock-history/export", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
}, requireAdmin, async (req, res): Promise<void> => {
  const contract = ExportStockHistoryQueryParams.strict().safeParse(req.query);
  const filters = contract.success ? parseStockHistoryFilters(req.query) : null;
  if (!filters) {
    res.status(400).json({ error: "Nieprawidłowe filtry eksportu. Sprawdź identyfikatory i zakres dat." }); return;
  }
  const download = new AbortController();
  const disconnected = () => { if (!res.writableFinished) download.abort(); };
  res.once("close", disconnected);
  if (res.destroyed) download.abort();
  try {
    await streamStockHistoryCsv(filters, res, download.signal, () => {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="historia-magazynu.csv"');
    });
  } catch (error) {
    if (download.signal.aborted) return;
    // Never append JSON to a partial CSV or report a truncated file as success.
    if (res.headersSent || res.destroyed) {
      req.log.error({ err: error }, "Stock history download failed");
      res.destroy();
      return;
    }
    throw error;
  } finally {
    res.removeListener("close", disconnected);
  }
});

router.patch("/products/stock", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateProductStocksBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Wybierz od 1 do 500 produktów i podaj całkowite stany od 0 do 100000." }); return;
  }
  const items = [...parsed.data.items].sort((a, b) => a.id - b.id);
  const ids = items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    res.status(400).json({ error: "Produkt może wystąpić w zestawieniu tylko raz." }); return;
  }
  const actorId = stockActor(req);
  const operationId = randomUUID();
  // Lock in a consistent order. Validate the entire batch before changing any row.
  const result = await db.transaction(async (tx) => {
    const rows = await tx.select().from(productsTable)
      .where(inArray(productsTable.id, ids)).orderBy(productsTable.id).for("update");
    if (rows.length !== ids.length) return { status: 404 as const };
    if (rows.some((row, index) => row.stock !== items[index].expectedStock)) return { status: 409 as const };
    const updated = [];
    for (const [index, item] of items.entries()) {
      const [row] = await tx.update(productsTable).set({ stock: item.stock })
        .where(eq(productsTable.id, item.id)).returning();
      updated.push(serializeProduct(row));
      const previous = rows[index];
      if (previous.stock !== row.stock) {
        await tx.insert(stockHistoryTable).values({
          operationId, actorId, source: "bulk", productId: row.id,
          productName: row.name, subcategory: row.subcategory, color: row.color,
          oldStock: previous.stock, newStock: row.stock,
        });
      }
    }
    // Parse inside the transaction so a response validation failure also rolls back.
    return { status: 200 as const, data: UpdateProductStocksResponse.parse(updated) };
  });
  if (result.status === 404) {
    res.status(404).json({ error: "Co najmniej jeden produkt został usunięty. Nic nie zapisano. Wróć do edycji i odśwież stany." }); return;
  }
  if (result.status === 409) {
    res.status(409).json({ error: "Stan co najmniej jednego produktu uległ zmianie. Nic nie zapisano. Wróć do edycji i odśwież stany przed ponownym podsumowaniem." }); return;
  }
  res.json(result.data);
});

router.get("/categories", async (_req, res): Promise<void> => {
  const rows = await db.select({ category: productsTable.category }).from(productsTable);
  res.json(ListCategoriesResponse.parse(categories.map((c) => ({
    ...c, count: rows.filter((p) => p.category === c.slug).length,
  }))));
});

router.get("/product-colors", async (req, res): Promise<void> => {
  const parsed = ListProductColorsQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Nieprawidłowe filtry." }); return; }
  const rows = await db.selectDistinct({ color: productsTable.color }).from(productsTable)
    .where(parsed.data.category ? eq(productsTable.category, parsed.data.category) : undefined);
  const colors = rows.map((row) => row.color).filter((color) => color.trim().length > 0)
    .sort((a, b) => a.localeCompare(b, "pl"));
  res.json(ListProductColorsResponse.parse(colors));
});

router.get("/products", async (req, res): Promise<void> => {
  // Zod's coerce.boolean treats "false" as true; normalize HTTP booleans before validation.
  if (req.query.featured !== undefined && !["true", "false"].includes(String(req.query.featured))) {
    res.status(400).json({ error: "Nieprawidłowy filtr produktów." }); return;
  }
  const parsed = ListProductsQueryParams.safeParse({
    ...req.query,
    ...(req.query.featured === undefined ? {} : { featured: req.query.featured === "true" }),
  });
  if (!parsed.success) { res.status(400).json({ error: "Nieprawidłowe filtry." }); return; }
  const { category, subcategory, color, search, featured } = parsed.data;
  const conditions = [];
  if (category) conditions.push(eq(productsTable.category, category));
  if (subcategory) conditions.push(eq(productsTable.subcategory, subcategory));
  if (color) conditions.push(eq(productsTable.color, color));
  if (typeof featured === "boolean") conditions.push(eq(productsTable.featured, featured));
  if (search?.trim()) {
    const term = `%${search.trim().slice(0, 150)}%`;
    conditions.push(or(ilike(productsTable.name, term), ilike(productsTable.scent, term)));
  }
  const rows = await db.select().from(productsTable).where(and(...conditions)).orderBy(productsTable.id);
  res.json(ListProductsResponse.parse(rows.map(serializeProduct)));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Nieprawidłowy produkt." }); return; }
  const [row] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!row) { res.status(404).json({ error: "Produkt nie istnieje." }); return; }
  res.json(GetProductResponse.parse(serializeProduct(row)));
});

router.post("/products", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Sprawdź dane produktu.", details: parsed.error.flatten() }); return; }
  const { price, ...data } = parsed.data;
  if (!data.name.trim() || !validCategory(data.category, data.subcategory) || ![data.image, ...data.images].every(safeImage)) {
    res.status(400).json({ error: "Nieprawidłowa kategoria, nazwa lub adres zdjęcia." }); return;
  }
  const [row] = await db.insert(productsTable).values({ ...data, name: data.name.trim(), priceCents: Math.round(price * 100) }).returning();
  res.status(201).json(CreateProductResponse.parse(serializeProduct(row)));
});

router.put("/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!params.success || !parsed.success) { res.status(400).json({ error: "Sprawdź dane produktu." }); return; }
  const { price, ...data } = parsed.data;
  if (!data.name.trim() || !validCategory(data.category, data.subcategory) || ![data.image, ...data.images].every(safeImage)) {
    res.status(400).json({ error: "Nieprawidłowa kategoria, nazwa lub adres zdjęcia." }); return;
  }
  const actorId = stockActor(req);
  const result = await db.transaction(async (tx) => {
    const [previous] = await tx.select().from(productsTable)
      .where(eq(productsTable.id, params.data.id)).for("update");
    if (!previous) return null;
    const [row] = await tx.update(productsTable)
      .set({ ...data, name: data.name.trim(), priceCents: Math.round(price * 100) })
      .where(eq(productsTable.id, params.data.id)).returning();
    if (previous.stock !== row.stock) {
      await tx.insert(stockHistoryTable).values({
        operationId: randomUUID(), actorId, source: "single", productId: row.id,
        productName: row.name, subcategory: row.subcategory, color: row.color,
        oldStock: previous.stock, newStock: row.stock,
      });
    }
    return UpdateProductResponse.parse(serializeProduct(row));
  });
  if (!result) { res.status(404).json({ error: "Produkt nie istnieje." }); return; }
  res.json(result);
});

router.delete("/products/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Nieprawidłowy produkt." }); return; }
  const rows = await db.delete(productsTable).where(eq(productsTable.id, params.data.id)).returning({ id: productsTable.id });
  if (!rows.length) { res.status(404).json({ error: "Produkt nie istnieje." }); return; }
  res.sendStatus(204);
});

export default router;
