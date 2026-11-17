import { pgTable, serial, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import type { z } from "zod/v4";

// Deliberately no product FK: deleting a product must not erase its audit trail.
export const stockHistoryTable = pgTable("stock_history", {
  id: serial("id").primaryKey(),
  operationId: uuid("operation_id").notNull(),
  actorId: text("actor_id").notNull(),
  source: text("source").$type<"bulk" | "single">().notNull(),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  subcategory: text("subcategory").notNull(),
  color: text("color").notNull(),
  oldStock: integer("old_stock").notNull(),
  newStock: integer("new_stock").notNull(),
});

export const insertStockHistorySchema = createInsertSchema(stockHistoryTable).omit({ id: true, changedAt: true });
export type InsertStockHistory = z.infer<typeof insertStockHistorySchema>;
export type StockHistoryRow = typeof stockHistoryTable.$inferSelect;
