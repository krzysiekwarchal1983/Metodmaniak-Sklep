import { pgTable, serial, text, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory").notNull(),
  description: text("description").notNull(),
  priceCents: integer("price_cents").notNull(),
  image: text("image").notNull(),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  variants: jsonb("variants").$type<string[]>().notNull().default([]),
  color: text("color").notNull().default(""),
  scent: text("scent").notNull().default(""),
  stock: integer("stock").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  badge: text("badge").notNull().default(""),
});
export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true });
export type ProductRow = typeof productsTable.$inferSelect;
