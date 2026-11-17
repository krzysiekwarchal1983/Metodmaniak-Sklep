import { Router, type IRouter } from "express";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db, ordersTable as orders, orderItemsTable as items, productsTable, siteTrafficTable as traffic } from "@workspace/db";
import { GetAdminDashboardQueryParams, GetAdminDashboardResponse, RecordSitePageViewBody } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/admin";
import { allowedTrafficPath, fillDashboardDays, rankDashboardProducts, warsawDay } from "../lib/dashboard";

const router: IRouter = Router();
let windowEnds = 0, windowCount = 0;
router.post("/site/page-view", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const origin = req.get("origin");
  const host = (req.get("x-forwarded-host") ?? req.get("host") ?? "").split(",")[0].trim().toLowerCase();
  try {
    if (req.get("sec-fetch-site") === "cross-site" || (origin && new URL(origin).host.toLowerCase() !== host)) {
      res.status(403).json({ error: "Żądanie musi pochodzić z tej strony." }); return;
    }
  } catch { res.status(403).json({ error: "Nieprawidłowe źródło żądania." }); return; }
  const input = RecordSitePageViewBody.safeParse(req.body);
  if (!input.success || !allowedTrafficPath(input.data.path)) { res.status(400).json({ error: "Nieprawidłowa publiczna podstrona." }); return; }
  // Identifier-free, bounded write budget. Counting never affects a visitor's page response.
  if (Date.now() >= windowEnds) { windowEnds = Date.now() + 60_000; windowCount = 0; }
  if (++windowCount > 3000) { res.status(429).json({ error: "Przekroczono limit licznika odsłon." }); return; }
  const day = warsawDay();
  await db.insert(traffic).values({ day, path: input.data.path, views: 1 }).onConflictDoUpdate({
    target: [traffic.day, traffic.path], set: { views: sql`${traffic.views} + 1` },
  });
  res.sendStatus(204);
});

router.get("/admin/dashboard", requireAdmin, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const query = GetAdminDashboardQueryParams.safeParse(req.query);
  if (!query.success || !z.string().date().safeParse(query.data.from).success || !z.string().date().safeParse(query.data.to).success) {
    res.status(400).json({ error: "Wybierz poprawne daty od i do." }); return;
  }
  const { from, to } = query.data;
  const span = (Date.parse(to) - Date.parse(from)) / 86400000;
  if (span < 0 || span > 365) { res.status(400).json({ error: "Wybierz od 1 do 366 dni." }); return; }
  const bounds = sql`${orders.createdAt} >= (${from}::date at time zone 'Europe/Warsaw') and ${orders.createdAt} < ((${to}::date + 1) at time zone 'Europe/Warsaw')`;
  const real = and(bounds, eq(orders.isDemo, false));
  const day = sql<string>`to_char(${orders.createdAt} at time zone 'Europe/Warsaw', 'YYYY-MM-DD')`;
  const result = await db.transaction(async (tx) => {
    const [totals] = await tx.select({
      orderCount: sql<number>`count(*)`.mapWith(Number),
      orderValue: sql<number>`coalesce(sum(${orders.totalCents}), 0) / 100.0`.mapWith(Number),
      accepted: sql<number>`count(*) filter (where ${orders.status} = 'accepted')`.mapWith(Number),
      processing: sql<number>`count(*) filter (where ${orders.status} = 'processing')`.mapWith(Number),
      shipped: sql<number>`count(*) filter (where ${orders.status} = 'shipped')`.mapWith(Number),
      unitemizedOrders: sql<number>`count(*) filter (where not exists (select 1 from ${items} where ${items.orderId} = ${orders.id}))`.mapWith(Number),
    }).from(orders).where(real);
    const [demo] = await tx.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(orders).where(and(bounds, eq(orders.isDemo, true)));
    const dailyOrders = await tx.select({
      date: day,
      orderCount: sql<number>`count(*)`.mapWith(Number),
      orderValue: sql<number>`coalesce(sum(${orders.totalCents}), 0) / 100.0`.mapWith(Number),
    }).from(orders).where(real).groupBy(day);
    const sold = await tx.select({
      productId: items.productId, name: items.name, category: items.category,
      quantity: sql<number>`sum(${items.quantity})`.mapWith(Number),
      orderValue: sql<number>`sum(${items.quantity}::bigint * ${items.unitPriceCents}) / 100.0`.mapWith(Number),
    }).from(items).innerJoin(orders, eq(items.orderId, orders.id)).where(real).groupBy(items.productId, items.name, items.category);
    const dailyUnits = await tx.select({ date: day, unitsSold: sql<number>`sum(${items.quantity})`.mapWith(Number) }).from(items).innerJoin(orders, eq(items.orderId, orders.id)).where(real).groupBy(day);
    const unitMap = new Map(dailyUnits.map((d) => [d.date, d.unitsSold]));
    const catalogue = await tx.select({ id: productsTable.id, name: productsTable.name, category: productsTable.category, stock: productsTable.stock }).from(productsTable);
    const dailyTraffic = await tx.select({ day: traffic.day, views: sql<number>`sum(${traffic.views})`.mapWith(Number) }).from(traffic).where(and(gte(traffic.day, from), lte(traffic.day, to))).groupBy(traffic.day);
    const topPages = await tx.select({ path: traffic.path, views: sql<number>`sum(${traffic.views})`.mapWith(Number) }).from(traffic).where(and(gte(traffic.day, from), lte(traffic.day, to))).groupBy(traffic.path).orderBy(sql`sum(${traffic.views}) desc`, traffic.path).limit(10);
    const [started] = await tx.select({ day: sql<string | null>`min(${traffic.day})::text` }).from(traffic);
    return {
      from, to, ...totals,
      unitsSold: sold.reduce((sum, p) => sum + p.quantity, 0),
      averageOrderValue: totals.orderCount ? Math.round(totals.orderValue * 100 / totals.orderCount) / 100 : 0,
      demoOrdersExcluded: demo.count,
      pageViews: dailyTraffic.reduce((sum, d) => sum + d.views, 0),
      measurementStartedOn: started.day,
      daily: fillDashboardDays(from, to, dailyOrders.map((d) => ({ ...d, unitsSold: unitMap.get(d.date) ?? 0 })), dailyTraffic),
      ...rankDashboardProducts(catalogue, sold), topPages,
    };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
  res.json(GetAdminDashboardResponse.parse(result));
});
export default router;
