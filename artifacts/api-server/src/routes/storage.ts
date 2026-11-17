import { Router, type IRouter } from "express";
import { pipeline } from "node:stream/promises";
import { eq } from "drizzle-orm";
import { db, uploadsTable } from "@workspace/db";
import { RequestUploadUrlBody, RequestUploadUrlResponse, PublishUploadBody, PublishUploadResponse } from "@workspace/api-zod";
import { adminActorId, requireAdmin } from "../middlewares/admin";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();
const safePath = (s: string) => /^\/objects\/uploads\/[a-f0-9-]{36}$/.test(s);

router.post("/storage/uploads/request-url", requireAdmin, async (req, res): Promise<void> => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Dozwolone pliki: JPG, PNG, WebP, MP4, WebM, maksymalnie 500 MB." }); return; }
  if (parsed.data.contentType.startsWith("image/") && parsed.data.size > 20 * 1024 * 1024) {
    res.status(400).json({ error: "Zdjęcie może mieć maksymalnie 20 MB." }); return;
  }
  const uploadURL = await storage.getObjectEntityUploadURL(parsed.data.contentType);
  const objectPath = storage.normalizeObjectEntityPath(uploadURL);
  await db.insert(uploadsTable).values({ ...parsed.data, objectPath, ownerId: adminActorId(req)! });
  res.json(RequestUploadUrlResponse.parse({ uploadURL, objectPath }));
});

router.post("/storage/uploads/publish", requireAdmin, async (req, res): Promise<void> => {
  const parsed = PublishUploadBody.safeParse(req.body);
  if (!parsed.success || !safePath(parsed.data.objectPath)) { res.status(400).json({ error: "Nieprawidłowa ścieżka pliku." }); return; }
  const [upload] = await db.select().from(uploadsTable).where(eq(uploadsTable.objectPath, parsed.data.objectPath));
  if (!upload || upload.ownerId !== adminActorId(req)) { res.status(403).json({ error: "Brak dostępu do pliku." }); return; }
  const file = await storage.getObjectEntityFile(upload.objectPath);
  const [metadata] = await file.getMetadata();
  if (Number(metadata.size) !== upload.size || metadata.contentType !== upload.contentType) {
    res.status(400).json({ error: "Plik nie odpowiada deklarowanemu rozmiarowi lub formatowi." }); return;
  }
  await storage.trySetObjectEntityAclPolicy(upload.objectPath, { owner: upload.ownerId, visibility: "public" });
  await db.update(uploadsTable).set({ published: true }).where(eq(uploadsTable.objectPath, upload.objectPath));
  res.json(PublishUploadResponse.parse({ url: `/api/storage${upload.objectPath}` }));
});

router.get("/storage/objects/*path", async (req, res): Promise<void> => {
  const raw = req.params.path;
  const objectPath = `/objects/${Array.isArray(raw) ? raw.join("/") : raw}`;
  if (!safePath(objectPath)) { res.status(404).json({ error: "Plik nie istnieje." }); return; }
  const [upload] = await db.select().from(uploadsTable).where(eq(uploadsTable.objectPath, objectPath));
  if (!upload?.published) { res.status(404).json({ error: "Plik nie został opublikowany." }); return; }
  try {
    const file = await storage.getObjectEntityFile(objectPath);
    const [meta] = await file.getMetadata();
    const size = Number(meta.size);
    res.set({ "Content-Type": upload.contentType, "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" });
    if (req.headers.range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
      if (!match) { res.status(416).set("Content-Range", `bytes */${size}`).end(); return; }
      const start = Number(match[1]), end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
      if (start > end || start >= size) { res.status(416).set("Content-Range", `bytes */${size}`).end(); return; }
      res.status(206).set({ "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) });
      await pipeline(file.createReadStream({ start, end }), res);
    } else {
      res.set("Content-Length", String(size));
      await pipeline(file.createReadStream(), res);
    }
  } catch (err) {
    if (err instanceof ObjectNotFoundError) { res.status(404).json({ error: "Plik nie istnieje." }); return; }
    throw err;
  }
});

router.get("/storage/public-objects/*path", async (req, res): Promise<void> => {
  const raw = req.params.path;
  const path = Array.isArray(raw) ? raw.join("/") : raw;
  if (!path || path.includes("..") || !/^[a-zA-Z0-9/_.-]+$/.test(path)) { res.sendStatus(404); return; }
  const file = await storage.searchPublicObject(path);
  if (!file) { res.sendStatus(404); return; }
  const [meta] = await file.getMetadata();
  const size = Number(meta.size);
  res.set({ "Content-Type": String(meta.contentType || "application/octet-stream"), "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" });
  // Browsers, including mobile Safari, use byte ranges to load and loop MP4 backgrounds.
  if (req.headers.range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
    if (!match) { res.status(416).set("Content-Range", `bytes */${size}`).end(); return; }
    const start = Number(match[1]), end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
      res.status(416).set("Content-Range", `bytes */${size}`).end(); return;
    }
    res.status(206).set({ "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) });
    await pipeline(file.createReadStream({ start, end }), res);
    return;
  }
  res.set("Content-Length", String(size));
  await pipeline(file.createReadStream(), res);
});
export default router;
