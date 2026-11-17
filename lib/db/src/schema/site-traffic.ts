import { date, integer, pgTable, primaryKey, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const siteTrafficTable = pgTable("site_traffic_daily", {
  day: date("day", { mode: "string" }).notNull(),
  path: varchar("path", { length: 120 }).notNull(),
  views: integer("views").notNull().default(0),
}, (table) => [primaryKey({ columns: [table.day, table.path] })]);
export const insertSiteTrafficSchema = createInsertSchema(siteTrafficTable);
export type SiteTrafficRow = typeof siteTrafficTable.$inferSelect;
