import { date, doublePrecision, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import type { z } from "zod/v4";

export const fishingEventsTable = pgTable("fishing_events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  eventDate: date("event_date", { mode: "string" }).notNull(),
  startTime: text("start_time").notNull().default(""),
  location: text("location").notNull().default(""),
  country: text("country").notNull().default("pl"),
  category: text("category").notNull().default(""),
  link: text("link").notNull().default(""),
  posterUrl: text("poster_url").notNull().default(""),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  version: integer("version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertFishingEventSchema = createInsertSchema(fishingEventsTable).omit({ id: true, version: true, createdAt: true, updatedAt: true });
export type FishingEventRow = typeof fishingEventsTable.$inferSelect;
export type InsertFishingEvent = z.infer<typeof insertFishingEventSchema>;
