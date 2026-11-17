import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, videosTable } from "@workspace/db";
import { ListVideosResponse, CreateVideoBody, CreateVideoResponse, UpdateVideoParams, UpdateVideoBody, UpdateVideoResponse, DeleteVideoParams } from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/admin";
import { safeVideo, safeImage } from "../lib/catalogue";

const router: IRouter = Router();
const serialize = (v: typeof videosTable.$inferSelect) => ({ ...v, createdAt: v.createdAt.toISOString() });
function episodeConflict(error: unknown) {
  const cause = error instanceof Error && error.cause ? error.cause : error;
  return typeof cause === "object" && cause !== null &&
    "code" in cause && cause.code === "23505" &&
    "constraint" in cause && cause.constraint === "videos_series_episode_number_unique";
}
router.get("/videos", async (_req, res): Promise<void> => {
  const videos = await db.select().from(videosTable).orderBy(desc(videosTable.createdAt), desc(videosTable.id));
  res.json(ListVideosResponse.parse(videos.map(serialize)));
});
router.post("/videos", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateVideoBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Sprawdź dane filmu." }); return; }
  if (!parsed.data.title.trim() || !safeVideo(parsed.data.videoUrl) || !safeImage(parsed.data.thumbnail)) {
    res.status(400).json({ error: "Podaj poprawny link YouTube lub wgraj plik wideo." }); return;
  }
  try {
    const [row] = await db.insert(videosTable).values(parsed.data).returning();
    res.status(201).json(CreateVideoResponse.parse(serialize(row)));
  } catch (error) {
    if (!episodeConflict(error)) throw error;
    res.status(409).json({ error: "Ten odcinek ma już przypisany film. Edytuj istniejący film lub najpierw odłącz go od odcinka." });
  }
});
router.put("/videos/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateVideoParams.safeParse(req.params);
  const parsed = UpdateVideoBody.safeParse(req.body);
  if (!params.success || !parsed.success) { res.status(400).json({ error: "Sprawdź dane filmu." }); return; }
  if (!parsed.data.title.trim() || !safeVideo(parsed.data.videoUrl) || !safeImage(parsed.data.thumbnail)) {
    res.status(400).json({ error: "Podaj poprawny link YouTube lub wgraj plik wideo." }); return;
  }
  try {
    const [row] = await db.update(videosTable).set(parsed.data).where(eq(videosTable.id, params.data.id)).returning();
    if (!row) { res.status(404).json({ error: "Film nie istnieje." }); return; }
    res.json(UpdateVideoResponse.parse(serialize(row)));
  } catch (error) {
    if (!episodeConflict(error)) throw error;
    res.status(409).json({ error: "Ten odcinek ma już przypisany film. Edytuj istniejący film lub najpierw odłącz go od odcinka." });
  }
});
router.delete("/videos/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteVideoParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Nieprawidłowy film." }); return; }
  const rows = await db.delete(videosTable).where(eq(videosTable.id, params.data.id)).returning({ id: videosTable.id });
  if (!rows.length) { res.status(404).json({ error: "Film nie istnieje." }); return; }
  res.sendStatus(204);
});
export default router;
