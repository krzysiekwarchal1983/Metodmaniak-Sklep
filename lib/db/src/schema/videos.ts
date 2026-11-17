import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const videosTable = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnail: text("thumbnail").notNull(),
  duration: text("duration").notNull().default(""),
  seriesEpisodeNumber: integer("series_episode_number").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertVideoSchema = createInsertSchema(videosTable).omit({ id: true, createdAt: true });
