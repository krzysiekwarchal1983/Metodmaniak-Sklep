import { Router, type IRouter } from "express";
import { clerkClient } from "@clerk/express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, orderItemsTable, ordersTable } from "@workspace/db";
import { GetAdminCustomerQueryParams, GetAdminCustomerResponse, ListAdminCustomersQueryParams, ListAdminCustomersResponse } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/admin";
import { customerProfile, CustomerLookupError, requireCustomer } from "../lib/customers";
import { serializeOrder } from "../lib/orders";

const router: IRouter = Router();
router.use(["/admin/customers", "/admin/customer"], (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, private");
  next();
}, requireAdmin);

router.get("/admin/customers", async (req, res): Promise<void> => {
  const query = ListAdminCustomersQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: "Nieprawidłowe wyszukiwanie lub numer strony." }); return; }
  const { offset = 0, limit = 20 } = query.data;
  const raw = query.data.search?.trim() ?? "";
  const search = /^[+\d\s().-]+$/.test(raw) ? raw.replace(/[\s().-]/g, "") : raw;
  let users: Awaited<ReturnType<typeof clerkClient.users.getUserList>>;
  try { users = await clerkClient.users.getUserList({ query: search || undefined, offset, limit, orderBy: "-created_at" }); }
  catch {
    req.log.warn("Customer account directory unavailable");
    res.status(503).json({ error: "Nie można pobrać bazy kont. Spróbuj ponownie." }); return;
  }
  const ids = users.data.map((u) => u.id);
  const sums = ids.length ? await db.select({
    id: ordersTable.customerId,
    orderCount: sql<number>`count(*)`.mapWith(Number),
    totalOrderValue: sql<number>`sum(${ordersTable.totalCents}) / 100.0`.mapWith(Number),
  }).from(ordersTable).where(and(inArray(ordersTable.customerId, ids), eq(ordersTable.isDemo, false))).groupBy(ordersTable.customerId) : [];
  const totals = new Map(sums.map((s) => [s.id, s]));
  res.json(ListAdminCustomersResponse.parse({ customers: users.data.map((u) => customerProfile(u, totals.get(u.id))), total: users.totalCount, offset, limit }));
});

router.get("/admin/customer", async (req, res): Promise<void> => {
  const query = GetAdminCustomerQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: "Nieprawidłowe konto klienta lub numer strony." }); return; }
  const { id, offset = 0, limit = 20 } = query.data;
  try {
    const user = await requireCustomer(id);
    const result = await db.transaction(async (tx) => {
      const filter = and(eq(ordersTable.customerId, id), eq(ordersTable.isDemo, false));
      const [totals] = await tx.select({
        orderCount: sql<number>`count(*)`.mapWith(Number),
        totalOrderValue: sql<number>`coalesce(sum(${ordersTable.totalCents}), 0) / 100.0`.mapWith(Number),
      }).from(ordersTable).where(filter);
      const orders = await tx.select().from(ordersTable).where(filter).orderBy(desc(ordersTable.createdAt), desc(ordersTable.id)).limit(limit).offset(offset);
      const lines = orders.length ? await tx.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, orders.map((o) => o.id))) : [];
      const grouped = new Map<number, typeof lines>();
      for (const line of lines) { const group = grouped.get(line.orderId) ?? []; group.push(line); grouped.set(line.orderId, group); }
      return { customer: customerProfile(user, totals), orders: orders.map((o) => serializeOrder(o, grouped.get(o.id))), offset, limit };
    }, { isolationLevel: "repeatable read", accessMode: "read only" });
    res.json(GetAdminCustomerResponse.parse(result));
  } catch (error) {
    if (error instanceof CustomerLookupError) { res.status(error.status).json({ error: error.message }); return; }
    throw error;
  }
});
export default router;
