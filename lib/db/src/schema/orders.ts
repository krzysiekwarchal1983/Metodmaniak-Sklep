import { boolean, index, integer, pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import type { z } from "zod/v4";

export const orderStatus = pgEnum("order_status", ["accepted", "processing", "shipped"]);
export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerContact: text("customer_contact").notNull().default(""),
  customerId: text("customer_id"),
  details: text("details").notNull(),
  totalCents: integer("total_cents").notNull(),
  status: orderStatus("status").notNull().default("accepted"),
  trackingNumber: text("tracking_number").notNull().default(""),
  isDemo: boolean("is_demo").notNull().default(false),
  version: integer("version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [index("orders_customer_id_idx").on(table.customerId), index("orders_created_at_idx").on(table.createdAt)]);
export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, version: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderRow = typeof ordersTable.$inferSelect;
