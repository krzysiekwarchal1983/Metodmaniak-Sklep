import { Router, type IRouter } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, productsTable } from "@workspace/db";
import {
  CreateAdminOrderBody, CreateAdminOrderResponse, ListAdminOrdersQueryParams, ListAdminOrdersResponse,
  UpdateAdminOrderBody, UpdateAdminOrderParams, UpdateAdminOrderResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/admin";
import { manualOrderValues, normalizeTrackingNumber, orderTotalCents, OrderInputError, serializeOrder } from "../lib/orders";
import { CustomerLookupError, requireCustomer } from "../lib/customers";

const router: IRouter = Router();
router.use("/admin/orders", requireAdmin, (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
router.get("/admin/orders", async (req, res): Promise<void> => {
  const parsed = ListAdminOrdersQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "Nieprawidłowy filtr statusu." }); return; }
  const rows = await db.select().from(ordersTable)
    .where(parsed.data.status ? eq(ordersTable.status, parsed.data.status) : undefined)
    .orderBy(desc(ordersTable.createdAt), desc(ordersTable.id));
  const items = rows.length ? await db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, rows.map((row) => row.id))) : [];
  const grouped = new Map<number, typeof items>();
  for (const item of items) { const group = grouped.get(item.orderId) ?? []; group.push(item); grouped.set(item.orderId, group); }
  res.json(ListAdminOrdersResponse.parse(rows.map((row) => serializeOrder(row, grouped.get(row.id)))));
});
router.post("/admin/orders", async (req, res): Promise<void> => {
  const parsed = CreateAdminOrderBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Sprawdź nazwę odbiorcy, opis i kwotę zamówienia." }); return; }
  try {
    if (parsed.data.customerId) await requireCustomer(parsed.data.customerId);
    const values = manualOrderValues(parsed.data);
    const result = await db.transaction(async (tx) => {
      const inputs = parsed.data.items ?? [];
      const ids = inputs.map((item) => item.productId);
      if (new Set(ids).size !== ids.length) throw new OrderInputError("Produkt występuje kilka razy. Połącz jego ilości w jednej pozycji.");
      const products = ids.length ? await tx.select().from(productsTable).where(inArray(productsTable.id, ids)).for("share") : [];
      if (products.length !== ids.length) throw new OrderInputError("Jeden z produktów już nie istnieje. Odśwież listę.");
      const lines = inputs.map((item) => {
        const product = products.find((p) => p.id === item.productId)!;
        return { productId: product.id, name: product.name, category: product.category, quantity: item.quantity, unitPriceCents: orderTotalCents(item.unitPrice) };
      });
      if (lines.length && lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0) !== values.totalCents) {
        throw new OrderInputError("Kwota zamówienia musi odpowiadać sumie pozycji produktowych.");
      }
      const [row] = await tx.insert(ordersTable).values({ ...values, customerId: parsed.data.customerId ?? null }).returning();
      const items = lines.length ? await tx.insert(orderItemsTable).values(lines.map((line) => ({ ...line, orderId: row.id }))).returning() : [];
      return serializeOrder(row, items);
    });
    res.status(201).json(CreateAdminOrderResponse.parse(result));
  } catch (error) {
    if (error instanceof CustomerLookupError) { res.status(error.status === 404 ? 400 : error.status).json({ error: error.message }); return; }
    if (error instanceof OrderInputError) { res.status(400).json({ error: error.message }); return; }
    throw error;
  }
});
router.patch("/admin/orders/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminOrderParams.safeParse(req.params);
  const body = UpdateAdminOrderBody.safeParse(req.body);
  if (!params.success || !body.success) { res.status(400).json({ error: "Nieprawidłowy status, numer listu lub wersja zamówienia." }); return; }
  let trackingNumber: string;
  if (body.data.customerId) {
    const [existing] = await db.select({ customerId: ordersTable.customerId }).from(ordersTable).where(eq(ordersTable.id, params.data.id));
    try { if (existing && existing.customerId !== body.data.customerId) await requireCustomer(body.data.customerId); }
    catch (error) {
      if (error instanceof CustomerLookupError) { res.status(error.status === 404 ? 400 : error.status).json({ error: error.message }); return; }
      throw error;
    }
  }
  try { trackingNumber = normalizeTrackingNumber(body.data.trackingNumber); } catch (error) {
    if (error instanceof OrderInputError) { res.status(400).json({ error: error.message }); return; }
    throw error;
  }
  const [row] = await db.update(ordersTable).set({
    status: body.data.status, trackingNumber, version: sql`${ordersTable.version} + 1`, updatedAt: new Date(),
    ...(body.data.customerId !== undefined ? { customerId: body.data.customerId } : {}),
  }).where(and(eq(ordersTable.id, params.data.id), eq(ordersTable.version, body.data.version))).returning();
  if (!row) {
    const [existing] = await db.select({ id: ordersTable.id }).from(ordersTable).where(eq(ordersTable.id, params.data.id));
    res.status(existing ? 409 : 404).json({ error: existing ? "Zamówienie zmieniono w innej sesji. Wczytaj aktualne dane przed ponownym zapisem." : "Nie znaleziono zamówienia." });
    return;
  }
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, row.id));
  res.json(UpdateAdminOrderResponse.parse(serializeOrder(row, items)));
});
export default router;
