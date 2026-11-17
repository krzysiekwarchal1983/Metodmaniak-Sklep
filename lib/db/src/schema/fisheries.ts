import { doublePrecision, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import type { z } from "zod/v4";

export const fisheriesTable = pgTable("fisheries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  location: text("location").notNull().default(""),
  country: text("country").notNull().default("pl"),
  voivodeship: text("voivodeship").notNull().default(""),
  fisheryType: text("fishery_type").notNull().default("wild"),
  maxDepth: text("max_depth").notNull().default(""),
  phone: text("phone").notNull().default(""),
  link: text("link").notNull().default(""),
  googleMapsLink: text("google_maps_link").notNull().default(""),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  images: text("images").array().notNull().default([]),
  version: integer("version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertFisherySchema = createInsertSchema(fisheriesTable).omit({ id: true, version: true, createdAt: true, updatedAt: true });
export type FisheryRow = typeof fisheriesTable.$inferSelect;
export type InsertFishery = z.infer<typeof insertFisherySchema>;
