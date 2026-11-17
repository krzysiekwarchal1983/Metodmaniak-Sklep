import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { test } from "node:test";
import { eq, inArray } from "drizzle-orm";
import { db, pool, productsTable, uploadsTable } from "@workspace/db";
import { RequestUploadUrlResponse, ReplaceWaftersColorPhotoResponse, GetProductResponse } from "@workspace/api-zod";
import { WAFTERS_PREVIEW_IMAGES, WAFTERS_PREVIEW_NOTICE, withoutWaftersPreviewNotice } from "../lib/wafters-images";
import app from "../app";

test("one color photo changes only confirmed media, atomically", async (t) => {
  assert.equal(process.env.NODE_ENV, "development");
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}/api`;
  const ids: number[] = [];
  const paths: string[] = [];
  const originalTransaction = db.transaction;
  let cookie = "";
  const request = async (path: string, method: string, body?: unknown, auth = true) => {
    const res = await fetch(`${base}${path}`, { method, headers: {
      "Content-Type": "application/json", ...(auth ? { Cookie: cookie } : {}),
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { res, data: await res.json() };
  };
  const color = `TEST-${randomUUID()}`;
  const rows = () => db.select().from(productsTable).where(inArray(productsTable.id, ids)).orderBy(productsTable.id);
  try {
    const session = await request("/admin/preview-session", "POST");
    assert.equal(session.res.status, 200);
    cookie = session.res.headers.get("set-cookie")!.split(";")[0];
    // Obtain the current actor through existing protected upload flow, without
    // uploading bytes or assigning fake files to any real catalogue products.
    const upload = await request("/storage/uploads/request-url", "POST", { name: "test.webp", size: 32, contentType: "image/webp" });
    assert.equal(upload.res.status, 200);
    const { objectPath } = RequestUploadUrlResponse.parse(upload.data);
    paths.push(objectPath);
    await db.update(uploadsTable).set({ published: true }).where(eq(uploadsTable.objectPath, objectPath));
    const image = `/api/storage${objectPath}`;
    for (let i = 0; i < 5; i++) {
      const [p] = await db.insert(productsTable).values({
        name: `${color} ${i}`, category: i === 4 ? "pellety" : "waftersy",
        subcategory: ["6mm", "8mm", "10mm", "6mm", "6mm"][i],
        color: i === 3 ? `${color}-other` : color, description: i === 1 ? "  Własny opis\nDruga linia  " : `Opis ${i}\n${WAFTERS_PREVIEW_NOTICE}\nDalszy opis`,
        priceCents: 1100 + i, stock: 5 + i, variants: ["A", "B"], scent: "Test",
        image: WAFTERS_PREVIEW_IMAGES.Biały, images: [WAFTERS_PREVIEW_IMAGES.Biały, "/images/test-detail.webp"],
        badge: "Zachowaj", featured: true,
      }).returning();
      ids.push(p.id);
    }
    const initial = await rows();
    const products = initial.slice(0, 3).map(({ id, image, images }) => ({ id, image, images }));
    const body = { color, image, products };
    const patch = (body: unknown, auth = true) => request("/products/color-photo", "PATCH", body, auth);
    await t.test("rejects unauthorized, foreign, unpublished and non-image uploads", async () => {
      assert.equal((await patch(body, false)).res.status, 401);
      assert.equal((await patch({ ...body, image: "/images/local.webp" })).res.status, 400);
      assert.equal((await patch({ ...body, image: `/api/storage/objects/uploads/${randomUUID()}` })).res.status, 403);
      await db.update(uploadsTable).set({ published: false }).where(eq(uploadsTable.objectPath, objectPath));
      assert.equal((await patch(body)).res.status, 400);
      await db.update(uploadsTable).set({ published: true, contentType: "video/mp4" }).where(eq(uploadsTable.objectPath, objectPath));
      assert.equal((await patch(body)).res.status, 400);
      await db.update(uploadsTable).set({ contentType: "image/webp" }).where(eq(uploadsTable.objectPath, objectPath));
      assert.deepEqual(await rows(), initial);
    });
    await t.test("rejects duplicate IDs, incomplete sizes, wrong color and stale media", async () => {
      assert.equal((await patch({ ...body, products: [products[0], products[0], products[2]] })).res.status, 400);
      assert.equal((await patch({ ...body, color: `${color}-other` })).res.status, 409);
      assert.equal((await patch({ ...body, products: products.map((p, i) => i === 1 ? { ...p, image: "stale" } : p) })).res.status, 409);
      await db.update(productsTable).set({ subcategory: "6mm" }).where(eq(productsTable.id, ids[2]));
      assert.equal((await patch(body)).res.status, 409);
      await db.update(productsTable).set({ subcategory: "10mm" }).where(eq(productsTable.id, ids[2]));
      assert.deepEqual(await rows(), initial);
    });
    await t.test("rolls back earlier rows when a later update fails", async () => {
      db.transaction = ((fn: Parameters<typeof originalTransaction>[0]) =>
        originalTransaction.call(db, async (tx) => {
          let updates = 0;
          const wrapped = new Proxy(tx, { get(target, prop) {
            if (prop === "update") return (...args: Parameters<typeof tx.update>) => {
              if (++updates === 2) throw new Error("Intentional test rollback");
              return target.update(...args);
            };
            const value = Reflect.get(target, prop);
            return typeof value === "function" ? value.bind(target) : value;
          } });
          return fn(wrapped);
        })) as typeof db.transaction;
      try { assert.equal((await patch(body)).res.status, 500); }
      finally { db.transaction = originalTransaction; }
      assert.deepEqual(await rows(), initial);
    });
    await t.test("persists only selected color media; keeps other data and custom descriptions", async () => {
      const result = await patch(body);
      assert.equal(result.res.status, 200);
      assert.equal(ReplaceWaftersColorPhotoResponse.parse(result.data).length, 3);
      const after = await rows();
      for (let i = 0; i < 3; i++) {
        assert.deepEqual(after[i], { ...initial[i], image,
          images: [image, "/images/test-detail.webp"],
          description: withoutWaftersPreviewNotice(initial[i].description),
        });
        const fresh = await request(`/products/${ids[i]}`, "GET");
        const product = GetProductResponse.parse(fresh.data);
        assert.equal(product.image, image);
        assert(!product.description.includes(WAFTERS_PREVIEW_NOTICE));
      }
      assert.deepEqual(after.slice(3), initial.slice(3));
      assert.equal((await patch(body)).res.status, 409, "old confirmation cannot overwrite later media");
    });
  } finally {
    db.transaction = originalTransaction;
    if (ids.length) await db.delete(productsTable).where(inArray(productsTable.id, ids));
    if (paths.length) await db.delete(uploadsTable).where(inArray(uploadsTable.objectPath, paths));
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await pool.end();
  }
});
