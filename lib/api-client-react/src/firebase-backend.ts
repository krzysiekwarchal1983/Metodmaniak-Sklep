import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
} from "firebase/firestore";
import {
  buildInitialProducts,
  firebaseAuth,
  firestoreDb,
  INITIAL_EVENTS,
  INITIAL_FISHERIES,
  isFirebaseUserAdmin,
  WAFTERS_PREVIEW_NOTICE,
  type FirestoreProductRow,
} from "./firebase-config";
import { getFishingWeather, searchWeatherPlaces } from "./engine/weather";
import { GuidanceWeatherUnavailable, methodGuidance } from "./engine/metodapka";

const CATEGORIES = [
  { slug: "waftersy", name: "Waftersy", subcategories: ["6mm", "8mm", "10mm"] },
  { slug: "zanety", name: "Zanęty", subcategories: ["Komercyjne", "PZW"] },
  { slug: "pellety", name: "Pellety", subcategories: ["1mm", "2mm", "4.5mm", "6mm", "8mm"] },
  { slug: "przypony", name: "Przypony", subcategories: ["10cm", "15cm", "30cm"] },
  { slug: "podajniki", name: "Podajniki Method Feeder", subcategories: ["15 g", "20 g", "30 g", "45 g", "60 g"] },
];

const PAYMENT_METHODS = [
  { id: "payu", name: "PayU" },
  { id: "przelewy24", name: "Przelewy24" },
  { id: "blik", name: "BLIK" },
  { id: "autopay", name: "AutoPay" },
].map((p) => ({
  ...p,
  enabled: false,
  message: "Płatności nieaktywne — operator nie został jeszcze podłączony.",
}));

const FREE_SHIPPING_THRESHOLD_CENTS = 20000;
const APP_TRIAL_MS = 7 * 24 * 60 * 60 * 1000;
const PREVIEW_STORAGE_KEY = "metodmaniak_preview_admin_session";

function shippingCostCents(subtotalCents: number): number {
  return subtotalCents === 0 || subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : 1499;
}

function serializeProduct(row: FirestoreProductRow) {
  const { priceCents, ...rest } = row;
  return { ...rest, price: priceCents / 100 };
}

function validCategory(category: string, subcategory: string) {
  return CATEGORIES.some((c) => c.slug === category && c.subcategories.includes(subcategory));
}

function safeImage(url: string) {
  if (url === "") return true;
  if (url.startsWith("data:image/")) return true;
  if (/^\/(?:images\/|api\/storage\/(?:objects\/uploads\/|public-objects\/))[a-zA-Z0-9/_.-]+$/.test(url)) return true;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function safeVideo(url: string) {
  if (/^\/api\/storage\/objects\/uploads\/[a-f0-9-]+$/.test(url) || url.startsWith("data:video/")) return true;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    if (u.hostname === "youtu.be") return /^\/[a-zA-Z0-9_-]{11}$/.test(u.pathname);
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(u.hostname)) {
      return (
        (u.pathname === "/watch" && /^[a-zA-Z0-9_-]{11}$/.test(u.searchParams.get("v") || "")) ||
        /^\/(?:shorts|embed)\/[a-zA-Z0-9_-]{11}$/.test(u.pathname)
      );
    }
    return false;
  } catch {
    return false;
  }
}

const warsawDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const warsawDay = (instant = new Date()) => warsawDate.format(instant);

function previewAllowed(): boolean {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]";
}

function getPreviewActor(): string | null {
  if (!previewAllowed()) return null;
  try {
    const raw = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { actorId: string; expires: number };
    if (parsed.expires <= Date.now()) {
      sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
      return null;
    }
    return parsed.actorId;
  } catch {
    return null;
  }
}

async function getAdminState() {
  const previewAccessAvailable = previewAllowed();
  const previewActor = getPreviewActor();
  if (previewActor) {
    return {
      authenticated: true,
      isAdmin: true,
      previewMode: true,
      previewAccessAvailable,
      actorId: "preview-admin",
      message: "Tymczasowy dostęp administratora w wersji roboczej. Sesja wygasa po godzinie.",
    };
  }
  const user = firebaseAuth.currentUser;
  if (!user) {
    return {
      authenticated: false,
      isAdmin: false,
      previewMode: false,
      previewAccessAvailable,
      actorId: null,
      message: "Zaloguj się, aby otworzyć panel administracyjny.",
    };
  }
  let isAdmin = await isFirebaseUserAdmin(user);
  if (!isAdmin) {
    try {
      const adminDoc = await getDoc(doc(firestoreDb, "admins", user.uid));
      if (adminDoc.exists()) isAdmin = true;
    } catch {
      // ignore
    }
  }
  return {
    authenticated: true,
    isAdmin,
    previewMode: false,
    previewAccessAvailable,
    actorId: user.email || user.uid,
    message: isAdmin
      ? "Dostęp administratora aktywny."
      : "Konto nie ma uprawnień administratora. Poproś właściciela sklepu o nadanie dostępu.",
  };
}

async function nextSequenceId(counterName: string, fallbackStart = 100): Promise<number> {
  const counterRef = doc(firestoreDb, "counters", counterName);
  return runTransaction(firestoreDb, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? Number(snap.data().seq ?? fallbackStart) : fallbackStart;
    const next = current + 1;
    tx.set(counterRef, { seq: next });
    return next;
  });
}

async function fetchProductsFromFirestore(): Promise<FirestoreProductRow[]> {
  try {
    const snap = await getDocs(collection(firestoreDb, "products"));
    if (snap.empty) return buildInitialProducts();
    const rows = snap.docs.map((d) => d.data() as FirestoreProductRow);
    return rows.sort((a, b) => a.id - b.id);
  } catch {
    return buildInitialProducts();
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  if (status === 204) {
    return new Response(null, { status: 204 });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(body: string, status = 200, contentType = "text/plain; charset=utf-8"): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": contentType },
  });
}

function csvCell(value: string | number) {
  const text = String(value);
  const safe =
    /^[\s\u0000-\u001f]*[=+\-@]/u.test(text) || /^[\t\r\n]/u.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function handleFirebaseApiRequest(
  rawUrl: string,
  method: string,
  rawBody?: unknown,
): Promise<Response | null> {
  const parsedUrl = new URL(rawUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  const path = parsedUrl.pathname.replace(/^\/api(?=\/|$)/, "") || "/";
  const query = Object.fromEntries(parsedUrl.searchParams.entries());
  const body =
    typeof rawBody === "string" && rawBody.trim().length > 0
      ? JSON.parse(rawBody)
      : rawBody && typeof rawBody === "object"
        ? rawBody
        : {};

  // 1. Health check
  if (method === "GET" && path === "/healthz") {
    return jsonResponse({ status: "ok" });
  }

  // 2. App access (7-day trial)
  if (method === "GET" && path === "/app-access") {
    const user = firebaseAuth.currentUser;
    const nowMs = Date.now();
    if (!user) {
      return jsonResponse({
        status: "signed_out",
        registeredAt: null,
        expiresAt: null,
        remainingSeconds: 0,
        serverNow: new Date(nowMs).toISOString(),
      });
    }
    const createdMs = user.metadata.creationTime ? Date.parse(user.metadata.creationTime) : nowMs;
    const registeredAtMs = Number.isFinite(createdMs) && createdMs <= nowMs ? createdMs : nowMs;
    const expiresAtMs = registeredAtMs + APP_TRIAL_MS;
    return jsonResponse({
      status: nowMs < expiresAtMs ? "active" : "expired",
      registeredAt: new Date(registeredAtMs).toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
      remainingSeconds: Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000)),
      serverNow: new Date(nowMs).toISOString(),
    });
  }

  // 3. Categories
  if (method === "GET" && path === "/categories") {
    const rows = await fetchProductsFromFirestore();
    return jsonResponse(
      CATEGORIES.map((c) => ({
        ...c,
        count: rows.filter((p) => p.category === c.slug).length,
      })),
    );
  }

  // 4. Product colors
  if (method === "GET" && path === "/product-colors") {
    const rows = await fetchProductsFromFirestore();
    const filtered = query.category ? rows.filter((r) => r.category === query.category) : rows;
    const colors = [...new Set(filtered.map((r) => r.color).filter((c) => c && c.trim().length > 0))].sort(
      (a, b) => a.localeCompare(b, "pl"),
    );
    return jsonResponse(colors);
  }

  // 5. List products
  if (method === "GET" && path === "/products") {
    let rows = await fetchProductsFromFirestore();
    if (query.category) rows = rows.filter((r) => r.category === query.category);
    if (query.subcategory) rows = rows.filter((r) => r.subcategory === query.subcategory);
    if (query.color) rows = rows.filter((r) => r.color === query.color);
    if (query.featured === "true" || query.featured === "false") {
      const want = query.featured === "true";
      rows = rows.filter((r) => Boolean(r.featured) === want);
    }
    if (query.search?.trim()) {
      const term = query.search.trim().toLowerCase();
      rows = rows.filter(
        (r) => r.name.toLowerCase().includes(term) || (r.scent ?? "").toLowerCase().includes(term),
      );
    }
    return jsonResponse(rows.map(serializeProduct));
  }

  // 6. Get single product
  const productMatch = /^\/products\/(\d+)$/.exec(path);
  if (method === "GET" && productMatch) {
    const id = Number(productMatch[1]);
    try {
      const snap = await getDoc(doc(firestoreDb, "products", String(id)));
      if (snap.exists()) {
        return jsonResponse(serializeProduct(snap.data() as FirestoreProductRow));
      }
    } catch {
      // fallback
    }
    const rows = await fetchProductsFromFirestore();
    const found = rows.find((r) => r.id === id);
    if (!found) return jsonResponse({ error: "Produkt nie istnieje." }, 404);
    return jsonResponse(serializeProduct(found));
  }

  // 7. Create product (Admin)
  if (method === "POST" && path === "/products") {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const data = body as Record<string, unknown>;
    const name = String(data.name ?? "").trim();
    const category = String(data.category ?? "");
    const subcategory = String(data.subcategory ?? "");
    const price = Number(data.price ?? 0);
    const image = String(data.image ?? "");
    const images = Array.isArray(data.images) ? data.images.map(String) : [];
    if (!name || !validCategory(category, subcategory) || ![image, ...images].every(safeImage)) {
      return jsonResponse({ error: "Nieprawidłowa kategoria, nazwa lub adres zdjęcia." }, 400);
    }
    const id = await nextSequenceId("products", 60);
    const row: FirestoreProductRow = {
      id,
      name,
      category,
      subcategory,
      description: String(data.description ?? ""),
      priceCents: Math.round(price * 100),
      image,
      images,
      variants: Array.isArray(data.variants) ? data.variants.map(String) : [],
      color: String(data.color ?? ""),
      scent: String(data.scent ?? ""),
      stock: Math.max(0, Math.floor(Number(data.stock ?? 0))),
      featured: Boolean(data.featured),
      badge: String(data.badge ?? ""),
    };
    await setDoc(doc(firestoreDb, "products", String(id)), row);
    return jsonResponse(serializeProduct(row), 201);
  }

  // 8. Update product (Admin)
  if (method === "PUT" && productMatch) {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const id = Number(productMatch[1]);
    const data = body as Record<string, unknown>;
    const name = String(data.name ?? "").trim();
    const category = String(data.category ?? "");
    const subcategory = String(data.subcategory ?? "");
    const price = Number(data.price ?? 0);
    const image = String(data.image ?? "");
    const images = Array.isArray(data.images) ? data.images.map(String) : [];
    if (!name || !validCategory(category, subcategory) || ![image, ...images].every(safeImage)) {
      return jsonResponse({ error: "Nieprawidłowa kategoria, nazwa lub adres zdjęcia." }, 400);
    }
    const prodRef = doc(firestoreDb, "products", String(id));
    const snap = await getDoc(prodRef);
    if (!snap.exists()) return jsonResponse({ error: "Produkt nie istnieje." }, 404);
    const previous = snap.data() as FirestoreProductRow;
    const updated: FirestoreProductRow = {
      id,
      name,
      category,
      subcategory,
      description: String(data.description ?? ""),
      priceCents: Math.round(price * 100),
      image,
      images,
      variants: Array.isArray(data.variants) ? data.variants.map(String) : [],
      color: String(data.color ?? ""),
      scent: String(data.scent ?? ""),
      stock: Math.max(0, Math.floor(Number(data.stock ?? 0))),
      featured: Boolean(data.featured),
      badge: String(data.badge ?? ""),
    };
    await setDoc(prodRef, updated);
    if (previous.stock !== updated.stock) {
      const histId = await nextSequenceId("stock_history", 0);
      await setDoc(doc(firestoreDb, "stock_history", String(histId)), {
        id: histId,
        operationId: crypto.randomUUID(),
        actorId: state.actorId ?? "admin",
        source: "single",
        changedAt: new Date().toISOString(),
        productId: id,
        productName: updated.name,
        subcategory: updated.subcategory,
        color: updated.color,
        oldStock: previous.stock,
        newStock: updated.stock,
      });
    }
    return jsonResponse(serializeProduct(updated));
  }

  // 9. Delete product (Admin)
  if (method === "DELETE" && productMatch) {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const id = Number(productMatch[1]);
    await deleteDoc(doc(firestoreDb, "products", String(id)));
    return jsonResponse(null, 204);
  }

  // 10. Bulk stock update (Admin)
  if (method === "PATCH" && path === "/products/stock") {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const rawItems = Array.isArray((body as { items?: unknown[] }).items)
      ? ((body as { items: Array<{ id: number; stock: number; expectedStock: number }> }).items)
      : [];
    if (!rawItems.length) {
      return jsonResponse({ error: "Wybierz od 1 do 500 produktów i podaj całkowite stany od 0 do 100000." }, 400);
    }
    const items = [...rawItems].sort((a, b) => a.id - b.id);
    const operationId = crypto.randomUUID();
    const updatedProducts: FirestoreProductRow[] = [];
    for (const item of items) {
      const ref = doc(firestoreDb, "products", String(item.id));
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        return jsonResponse({ error: "Co najmniej jeden produkt został usunięty. Nic nie zapisano." }, 404);
      }
      const current = snap.data() as FirestoreProductRow;
      if (current.stock !== item.expectedStock) {
        return jsonResponse({ error: "Stan co najmniej jednego produktu uległ zmianie. Odśwież stany." }, 409);
      }
      const nextRow: FirestoreProductRow = { ...current, stock: item.stock };
      await setDoc(ref, nextRow);
      updatedProducts.push(nextRow);
      if (current.stock !== item.stock) {
        const histId = await nextSequenceId("stock_history", 0);
        await setDoc(doc(firestoreDb, "stock_history", String(histId)), {
          id: histId,
          operationId,
          actorId: state.actorId ?? "admin",
          source: "bulk",
          changedAt: new Date().toISOString(),
          productId: nextRow.id,
          productName: nextRow.name,
          subcategory: nextRow.subcategory,
          color: nextRow.color,
          oldStock: current.stock,
          newStock: nextRow.stock,
        });
      }
    }
    return jsonResponse(updatedProducts.map(serializeProduct));
  }

  // 11. Replace wafters color photo across 3 sizes (Admin)
  if (method === "PATCH" && path === "/products/color-photo") {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const { color, image, products: expectedProducts } = body as {
      color: string;
      image: string;
      products: Array<{ id: number; image: string; images: string[] }>;
    };
    if (!color || !image || !Array.isArray(expectedProducts) || expectedProducts.length !== 3) {
      return jsonResponse({ error: "Wybierz kolor, przesłane zdjęcie i potwierdź trzy produkty." }, 400);
    }
    const all = await fetchProductsFromFirestore();
    const matching = all.filter((p) => p.category === "waftersy" && p.color === color);
    if (matching.length !== 3) {
      return jsonResponse({ error: "Lista produktów uległa zmianie." }, 409);
    }
    const updated: FirestoreProductRow[] = [];
    for (const row of matching) {
      const nextRow: FirestoreProductRow = {
        ...row,
        image,
        images: [
          ...new Set(
            (row.images.length ? row.images : [image]).map((src) =>
              src.startsWith("/api/storage/public-objects/wafters-previews/") ? image : src,
            ),
          ),
        ],
        description: row.description
          .split("\n")
          .filter((l) => l.trim() !== WAFTERS_PREVIEW_NOTICE)
          .join("\n"),
      };
      await setDoc(doc(firestoreDb, "products", String(row.id)), nextRow);
      updated.push(nextRow);
    }
    return jsonResponse(updated.map(serializeProduct));
  }

  // 12. Stock history list & CSV export (Admin)
  if (method === "GET" && (path === "/admin/stock-history" || path === "/admin/stock-history/export")) {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const snap = await getDocs(collection(firestoreDb, "stock_history"));
    type StockEntry = {
      id: number;
      operationId: string;
      actorId: string;
      source: "bulk" | "single";
      changedAt: string;
      productId: number;
      productName: string;
      subcategory: string;
      color: string;
      oldStock: number;
      newStock: number;
    };
    let rows = snap.docs.map((d) => d.data() as StockEntry).sort((a, b) => b.id - a.id);
    if (query.productId) {
      const pid = Number(query.productId);
      rows = rows.filter((r) => r.productId === pid);
    }
    if (query.actorId) {
      rows = rows.filter((r) => r.actorId === query.actorId);
    }
    if (query.dateFrom) {
      rows = rows.filter((r) => warsawDay(new Date(r.changedAt)) >= query.dateFrom);
    }
    if (query.dateTo) {
      rows = rows.filter((r) => warsawDay(new Date(r.changedAt)) <= query.dateTo);
    }
    if (path === "/admin/stock-history/export") {
      const header = [
        "ID wpisu",
        "Data (UTC)",
        "Autor",
        "ID produktu",
        "Nazwa produktu",
        "Rozmiar / podkategoria",
        "Kolor",
        "Stan przed",
        "Stan po",
        "Sposób",
        "ID operacji",
      ];
      const csvLines = [
        "\uFEFF" + header.map(csvCell).join(",") + "\r\n",
        ...rows.map(
          (row) =>
            [
              row.id,
              row.changedAt,
              row.actorId,
              row.productId,
              row.productName,
              row.subcategory,
              row.color,
              row.oldStock,
              row.newStock,
              row.source === "bulk" ? "Zmiana zbiorcza" : "Edycja produktu",
              row.operationId,
            ]
              .map(csvCell)
              .join(",") + "\r\n",
        ),
      ];
      return textResponse(csvLines.join(""), 200, "text/csv; charset=utf-8");
    }
    const before = query.before ? Number(query.before) : undefined;
    const limit = query.limit ? Number(query.limit) : 50;
    if (before) rows = rows.filter((r) => r.id < before);
    const items = rows.slice(0, limit);
    return jsonResponse({
      items,
      nextCursor: rows.length > limit ? items[items.length - 1].id : null,
    });
  }

  // 13. Videos CRUD
  if (method === "GET" && path === "/videos") {
    try {
      const snap = await getDocs(collection(firestoreDb, "videos"));
      const videos = snap.docs
        .map((d) => d.data() as Record<string, unknown>)
        .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
      return jsonResponse(videos);
    } catch {
      return jsonResponse([]);
    }
  }

  if (method === "POST" && path === "/videos") {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const data = body as Record<string, unknown>;
    const title = String(data.title ?? "").trim();
    const videoUrl = String(data.videoUrl ?? "");
    const thumbnail = String(data.thumbnail ?? "");
    if (!title || !safeVideo(videoUrl) || !safeImage(thumbnail)) {
      return jsonResponse({ error: "Podaj poprawny link YouTube lub wgraj plik wideo." }, 400);
    }
    const seriesEpisodeNumber =
      data.seriesEpisodeNumber !== null && data.seriesEpisodeNumber !== undefined
        ? Number(data.seriesEpisodeNumber)
        : null;
    if (seriesEpisodeNumber !== null) {
      const existing = await getDocs(collection(firestoreDb, "videos"));
      if (existing.docs.some((d) => d.data().seriesEpisodeNumber === seriesEpisodeNumber)) {
        return jsonResponse(
          { error: "Ten odcinek ma już przypisany film. Edytuj istniejący film lub najpierw odłącz go od odcinka." },
          409,
        );
      }
    }
    const id = await nextSequenceId("videos", 0);
    const row = {
      id,
      title,
      description: String(data.description ?? ""),
      videoUrl,
      thumbnail,
      duration: String(data.duration ?? ""),
      seriesEpisodeNumber,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(firestoreDb, "videos", String(id)), row);
    return jsonResponse(row, 201);
  }

  const videoMatch = /^\/videos\/(\d+)$/.exec(path);
  if (method === "PUT" && videoMatch) {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const id = Number(videoMatch[1]);
    const data = body as Record<string, unknown>;
    const title = String(data.title ?? "").trim();
    const videoUrl = String(data.videoUrl ?? "");
    const thumbnail = String(data.thumbnail ?? "");
    if (!title || !safeVideo(videoUrl) || !safeImage(thumbnail)) {
      return jsonResponse({ error: "Podaj poprawny link YouTube lub wgraj plik wideo." }, 400);
    }
    const ref = doc(firestoreDb, "videos", String(id));
    const snap = await getDoc(ref);
    if (!snap.exists()) return jsonResponse({ error: "Film nie istnieje." }, 404);
    const seriesEpisodeNumber =
      data.seriesEpisodeNumber !== null && data.seriesEpisodeNumber !== undefined
        ? Number(data.seriesEpisodeNumber)
        : null;
    if (seriesEpisodeNumber !== null) {
      const existing = await getDocs(collection(firestoreDb, "videos"));
      if (existing.docs.some((d) => Number(d.id) !== id && d.data().seriesEpisodeNumber === seriesEpisodeNumber)) {
        return jsonResponse(
          { error: "Ten odcinek ma już przypisany film. Edytuj istniejący film lub najpierw odłącz go od odcinka." },
          409,
        );
      }
    }
    const updated = {
      ...snap.data(),
      id,
      title,
      description: String(data.description ?? ""),
      videoUrl,
      thumbnail,
      duration: String(data.duration ?? ""),
      seriesEpisodeNumber,
    };
    await setDoc(ref, updated);
    return jsonResponse(updated);
  }

  if (method === "DELETE" && videoMatch) {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const id = Number(videoMatch[1]);
    await deleteDoc(doc(firestoreDb, "videos", String(id)));
    return jsonResponse(null, 204);
  }

  // 14. Recommendations
  if (method === "POST" && path === "/recommendations") {
    const { season, water, fish } = body as {
      season: "wiosna" | "lato" | "jesien" | "zima";
      water: "czysta" | "lekko_metna" | "metna";
      fish: "karp" | "leszcz" | "karas" | "lin";
    };
    const cold = season === "zima" || season === "jesien";
    const colors =
      water === "metna"
        ? ["Różowy", "Pomarańczowy fluo", "Żółty fluo"]
        : water === "czysta"
          ? ["Żółty musztardowy", "Biały", "Jasny brązowy"]
          : ["Żółty fluo", "Różowy", "Biało-różowy"];
    const scents = cold
      ? ["Kryl", "Czosnek"]
      : fish === "karp"
        ? ["Ananas", "Truskawka"]
        : fish === "leszcz"
          ? ["Wanilia", "Czosnek"]
          : ["Truskawka", "Wanilia"];
    const all = (await fetchProductsFromFirestore()).filter((p) => p.category === "waftersy");
    const matched = all.filter((p) => p.stock > 0 && colors.includes(p.color) && scents.includes(p.scent));
    const fallback = matched.length ? matched : all.filter((p) => p.stock > 0 && colors.includes(p.color));
    const fishNames = { karp: "karpia", leszcz: "leszcza", karas: "karasia", lin: "lina" };
    const explanation = [
      water === "metna"
        ? "W mętnej wodzie wyraziste kolory pomagają wyróżnić przynętę."
        : water === "czysta"
          ? "W czystej wodzie zacznij od stonowanego żółtego lub białego waftersa."
          : "W lekko mętnej wodzie warto porównać żółty z kontrastowym różowym.",
      cold
        ? "W chłodniejszych porach roku sprawdź wyraziste nuty kryla i czosnku oraz oszczędne nęcenie."
        : `Na ${fishNames[fish] ?? "ryby"} proponujemy ${scents.join(" lub ").toLowerCase()}.`,
      "To wskazówki oparte na prostych regułach, nie gwarancja brań. Dopasuj rozmiar do haka i sprawdź zachowanie przynęty w wodzie.",
    ].join(" ");
    return jsonResponse({
      colors,
      scents,
      explanation,
      products: fallback.slice(0, 6).map(serializeProduct),
    });
  }

  // 15. Cart & Checkout
  if (method === "POST" && path === "/cart/quote") {
    const items = Array.isArray((body as { items?: unknown[] }).items)
      ? ((body as { items: Array<{ productId: number; quantity: number; variant: string }> }).items)
      : [];
    const allProducts = await fetchProductsFromFirestore();
    const ids = [...new Set(items.map((i) => i.productId))];
    const rows = allProducts.filter((p) => ids.includes(p.id));
    if (rows.length !== ids.length) {
      return jsonResponse(
        { error: "Produkt z koszyka nie jest już dostępny. Usuń go i spróbuj ponownie." },
        409,
      );
    }
    const totals = new Map<number, number>();
    items.forEach((i) => totals.set(i.productId, (totals.get(i.productId) || 0) + i.quantity));
    let subtotalCents = 0;
    const lines = items.map((i) => {
      const p = rows.find((r) => r.id === i.productId)!;
      const available =
        (totals.get(p.id) || 0) <= p.stock &&
        (p.variants.length ? p.variants.includes(i.variant) : i.variant === "");
      const lineCents = p.priceCents * i.quantity;
      subtotalCents += lineCents;
      return {
        product: serializeProduct(p),
        quantity: i.quantity,
        variant: i.variant,
        available,
        lineTotal: lineCents / 100,
      };
    });
    const shippingCents = shippingCostCents(subtotalCents);
    return jsonResponse({
      items: lines,
      subtotal: subtotalCents / 100,
      shipping: shippingCents / 100,
      total: (subtotalCents + shippingCents) / 100,
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD_CENTS / 100,
      remainingForFreeShipping: Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents) / 100,
      canCheckout: lines.length > 0 && lines.every((l) => l.available),
    });
  }

  if (method === "GET" && path === "/payment-methods") {
    return jsonResponse(PAYMENT_METHODS);
  }

  if (method === "POST" && path === "/checkout") {
    return jsonResponse(
      { error: "Płatności online nie są jeszcze uruchomione. Nie utworzono zamówienia i nie pobrano środków." },
      503,
    );
  }

  // 16. Admin session & summary
  if (method === "GET" && path === "/admin/session") {
    const state = await getAdminState();
    return jsonResponse({
      authenticated: state.authenticated,
      isAdmin: state.isAdmin,
      previewMode: state.previewMode,
      previewAccessAvailable: state.previewAccessAvailable,
      message: state.message,
    });
  }

  if (method === "POST" && path === "/admin/preview-session") {
    if (!previewAllowed()) {
      return jsonResponse(
        { error: "Wejście robocze jest wyłączone poza podglądem deweloperskim." },
        403,
      );
    }
    sessionStorage.setItem(
      PREVIEW_STORAGE_KEY,
      JSON.stringify({ actorId: "preview-admin", expires: Date.now() + 3600_000 }),
    );
    return jsonResponse({
      authenticated: true,
      isAdmin: true,
      previewMode: true,
      previewAccessAvailable: true,
      message: "Robocza sesja administratora aktywna przez godzinę.",
    });
  }

  if (method === "DELETE" && path === "/admin/preview-session") {
    sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
    return jsonResponse(null, 204);
  }

  if (method === "GET" && path === "/admin/summary") {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const [products, videosSnap] = await Promise.all([
      fetchProductsFromFirestore(),
      getDocs(collection(firestoreDb, "videos")).catch(() => ({ size: 0 })),
    ]);
    return jsonResponse({
      productCount: products.length,
      videoCount: videosSnap.size,
      lowStockCount: products.filter((p) => p.stock <= 5).length,
      inventoryValue: products.reduce((sum, p) => sum + p.priceCents * p.stock, 0) / 100,
    });
  }

  // 17. Site traffic & Admin Dashboard
  if (method === "POST" && path === "/site/page-view") {
    const visitedPath = String((body as { path?: string }).path ?? "");
    if (visitedPath && visitedPath.startsWith("/") && visitedPath.length <= 120) {
      const day = warsawDay();
      const docId = `${day}__${encodeURIComponent(visitedPath)}`;
      const ref = doc(firestoreDb, "site_traffic_daily", docId);
      try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const prevViews = Number(snap.data().views ?? 0);
          await setDoc(ref, { day, path: visitedPath, views: prevViews + 1 });
        } else {
          await setDoc(ref, { day, path: visitedPath, views: 1 });
        }
      } catch {
        // non-blocking
      }
    }
    return jsonResponse(null, 204);
  }

  if (method === "GET" && path === "/admin/dashboard") {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const { from, to } = query;
    if (!from || !to) return jsonResponse({ error: "Wybierz poprawne daty od i do." }, 400);
    const [ordersSnap, trafficSnap, catalogue] = await Promise.all([
      getDocs(collection(firestoreDb, "orders")).catch(() => ({ docs: [] })),
      getDocs(collection(firestoreDb, "site_traffic_daily")).catch(() => ({ docs: [] })),
      fetchProductsFromFirestore(),
    ]);
    type OrderDoc = {
      id: number;
      totalCents: number;
      status: "accepted" | "processing" | "shipped";
      isDemo: boolean;
      createdAt: string;
      items?: Array<{ productId: number | null; name: string; category: string; quantity: number; unitPriceCents: number }>;
    };
    const allOrders = ordersSnap.docs.map((d) => d.data() as OrderDoc);
    const inRange = allOrders.filter((o) => {
      const d = warsawDay(new Date(o.createdAt));
      return d >= from && d <= to;
    });
    const realOrders = inRange.filter((o) => !o.isDemo);
    const demoOrdersExcluded = inRange.filter((o) => o.isDemo).length;
    const orderCount = realOrders.length;
    const orderValue = realOrders.reduce((s, o) => s + o.totalCents, 0) / 100;
    const accepted = realOrders.filter((o) => o.status === "accepted").length;
    const processing = realOrders.filter((o) => o.status === "processing").length;
    const shipped = realOrders.filter((o) => o.status === "shipped").length;
    const unitemizedOrders = realOrders.filter((o) => !o.items || o.items.length === 0).length;

    const dailySales = new Map<string, { orderCount: number; orderValue: number; unitsSold: number }>();
    const prodSales = new Map<string, { productId: number | null; name: string; category: string; stock: number | null; quantity: number; orderValue: number }>();
    for (const p of catalogue) {
      prodSales.set(String(p.id), {
        productId: p.id,
        name: p.name,
        category: p.category,
        stock: p.stock,
        quantity: 0,
        orderValue: 0,
      });
    }
    let unitsSold = 0;
    for (const o of realOrders) {
      const d = warsawDay(new Date(o.createdAt));
      const cur = dailySales.get(d) ?? { orderCount: 0, orderValue: 0, unitsSold: 0 };
      cur.orderCount += 1;
      cur.orderValue = Math.round((cur.orderValue + o.totalCents / 100) * 100) / 100;
      for (const item of o.items ?? []) {
        cur.unitsSold += item.quantity;
        unitsSold += item.quantity;
        const key = item.productId === null ? `removed:${item.name}` : String(item.productId);
        const pEntry = prodSales.get(key) ?? {
          productId: item.productId,
          name: item.name,
          category: item.category,
          stock: null,
          quantity: 0,
          orderValue: 0,
        };
        pEntry.quantity += item.quantity;
        pEntry.orderValue = Math.round((pEntry.orderValue + (item.quantity * item.unitPriceCents) / 100) * 100) / 100;
        prodSales.set(key, pEntry);
      }
      dailySales.set(d, cur);
    }

    type TrafficDoc = { day: string; path: string; views: number };
    const allTraffic = trafficSnap.docs.map((d) => d.data() as TrafficDoc);
    const measurementStartedOn = allTraffic.length
      ? allTraffic.map((t) => t.day).sort()[0]
      : null;
    const rangeTraffic = allTraffic.filter((t) => t.day >= from && t.day <= to);
    const dailyViews = new Map<string, number>();
    const pageMap = new Map<string, number>();
    let pageViews = 0;
    for (const t of rangeTraffic) {
      dailyViews.set(t.day, (dailyViews.get(t.day) ?? 0) + t.views);
      pageMap.set(t.path, (pageMap.get(t.path) ?? 0) + t.views);
      pageViews += t.views;
    }

    const daily = [];
    const endMs = Date.parse(`${to}T00:00:00Z`);
    for (let time = Date.parse(`${from}T00:00:00Z`); time <= endMs; time += 86400000) {
      const date = new Date(time).toISOString().slice(0, 10);
      const s = dailySales.get(date);
      daily.push({
        date,
        orderCount: s?.orderCount ?? 0,
        orderValue: s?.orderValue ?? 0,
        unitsSold: s?.unitsSold ?? 0,
        pageViews: dailyViews.get(date) ?? 0,
      });
    }

    const allRanked = [...prodSales.values()];
    const bestProducts = allRanked
      .filter((p) => p.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity || b.orderValue - a.orderValue || a.name.localeCompare(b.name, "pl"))
      .slice(0, 5);
    const worstProducts = allRanked
      .filter((p) => p.productId !== null)
      .sort((a, b) => a.quantity - b.quantity || a.orderValue - b.orderValue || a.name.localeCompare(b.name, "pl"))
      .slice(0, 5);
    const topPages = [...pageMap.entries()]
      .map(([p, views]) => ({ path: p, views }))
      .sort((a, b) => b.views - a.views || a.path.localeCompare(b.path))
      .slice(0, 10);

    return jsonResponse({
      from,
      to,
      orderCount,
      orderValue,
      accepted,
      processing,
      shipped,
      unitemizedOrders,
      unitsSold,
      averageOrderValue: orderCount ? Math.round((orderValue * 100) / orderCount) / 100 : 0,
      demoOrdersExcluded,
      pageViews,
      measurementStartedOn,
      daily,
      bestProducts,
      worstProducts,
      topPages,
    });
  }

  // 18. Admin Orders CRUD
  if (method === "GET" && path === "/admin/orders") {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const snap = await getDocs(collection(firestoreDb, "orders"));
    let rows = snap.docs
      .map((d) => d.data() as Record<string, unknown>)
      .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")) || Number(b.id) - Number(a.id));
    if (query.status) rows = rows.filter((r) => r.status === query.status);
    return jsonResponse(
      rows.map((row) => ({
        id: row.id,
        number: `MM-${String(row.id).padStart(6, "0")}`,
        customerName: row.customerName,
        customerContact: row.customerContact ?? "",
        details: row.details,
        customerId: row.customerId ?? null,
        total: Number(row.totalCents ?? 0) / 100,
        status: row.status,
        trackingNumber: row.trackingNumber ?? "",
        isDemo: Boolean(row.isDemo),
        version: Number(row.version ?? 0),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        items: Array.isArray(row.items)
          ? (row.items as Array<Record<string, unknown>>).map((item) => ({
              productId: item.productId ?? null,
              name: item.name,
              category: item.category,
              quantity: item.quantity,
              unitPrice: Number(item.unitPriceCents ?? 0) / 100,
            }))
          : [],
      })),
    );
  }

  if (method === "POST" && path === "/admin/orders") {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const data = body as {
      customerName: string;
      customerContact?: string;
      customerId?: string | null;
      details: string;
      total: number;
      items?: Array<{ productId: number; quantity: number; unitPrice: number }>;
    };
    const customerName = String(data.customerName ?? "").trim();
    const details = String(data.details ?? "").trim();
    const totalCents = Math.round(Number(data.total ?? 0) * 100);
    if (!customerName || !details) {
      return jsonResponse({ error: "Wpisz nazwę odbiorcy i opis zamówienia." }, 400);
    }
    const catalogue = await fetchProductsFromFirestore();
    const inputs = data.items ?? [];
    const lines = inputs.map((item) => {
      const product = catalogue.find((p) => p.id === item.productId);
      if (!product) throw new Error("Jeden z produktów już nie istnieje.");
      return {
        productId: product.id,
        name: product.name,
        category: product.category,
        quantity: item.quantity,
        unitPriceCents: Math.round(item.unitPrice * 100),
      };
    });
    if (lines.length && lines.reduce((s, l) => s + l.quantity * l.unitPriceCents, 0) !== totalCents) {
      return jsonResponse({ error: "Kwota zamówienia musi odpowiadać sumie pozycji produktowych." }, 400);
    }
    const id = await nextSequenceId("orders", 0);
    const now = new Date().toISOString();
    const row = {
      id,
      customerName,
      customerContact: String(data.customerContact ?? "").trim(),
      customerId: data.customerId ?? null,
      details,
      totalCents,
      status: "accepted" as const,
      trackingNumber: "",
      isDemo: false,
      version: 0,
      createdAt: now,
      updatedAt: now,
      items: lines,
    };
    await setDoc(doc(firestoreDb, "orders", String(id)), row);
    return jsonResponse(
      {
        ...row,
        number: `MM-${String(id).padStart(6, "0")}`,
        total: totalCents / 100,
        items: lines.map((l) => ({ ...l, unitPrice: l.unitPriceCents / 100 })),
      },
      201,
    );
  }

  const orderMatch = /^\/admin\/orders\/(\d+)$/.exec(path);
  if (method === "PATCH" && orderMatch) {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const id = Number(orderMatch[1]);
    const ref = doc(firestoreDb, "orders", String(id));
    const snap = await getDoc(ref);
    if (!snap.exists()) return jsonResponse({ error: "Nie znaleziono zamówienia." }, 404);
    const existing = snap.data() as Record<string, unknown>;
    const data = body as { status: string; trackingNumber: string; version: number; customerId?: string | null };
    if (Number(existing.version ?? 0) !== Number(data.version)) {
      return jsonResponse({ error: "Zamówienie zmieniono w innej sesji. Wczytaj aktualne dane." }, 409);
    }
    const updated: Record<string, unknown> = {
      ...existing,
      status: data.status,
      trackingNumber: String(data.trackingNumber ?? "").trim(),
      version: Number(existing.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
      ...(data.customerId !== undefined ? { customerId: data.customerId } : {}),
    };
    await setDoc(ref, updated);
    const items = Array.isArray(updated.items) ? (updated.items as Array<Record<string, unknown>>) : [];
    return jsonResponse({
      id: updated.id,
      number: `MM-${String(updated.id).padStart(6, "0")}`,
      customerName: updated.customerName,
      customerContact: updated.customerContact ?? "",
      details: updated.details,
      customerId: updated.customerId ?? null,
      total: Number(updated.totalCents ?? 0) / 100,
      status: updated.status,
      trackingNumber: updated.trackingNumber ?? "",
      isDemo: Boolean(updated.isDemo),
      version: updated.version,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      items: items.map((item) => ({
        productId: item.productId ?? null,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unitPrice: Number(item.unitPriceCents ?? 0) / 100,
      })),
    });
  }

  // 19. Admin Customers
  if (method === "GET" && path === "/admin/customers") {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const offset = query.offset ? Number(query.offset) : 0;
    const limit = query.limit ? Number(query.limit) : 20;
    const search = (query.search ?? "").trim().toLowerCase();
    const [usersSnap, ordersSnap] = await Promise.all([
      getDocs(collection(firestoreDb, "users")).catch(() => ({ docs: [] })),
      getDocs(collection(firestoreDb, "orders")).catch(() => ({ docs: [] })),
    ]);
    const orders = ordersSnap.docs.map((d) => d.data() as Record<string, unknown>);
    let users = usersSnap.docs.map((d) => d.data() as Record<string, unknown>);
    if (search) {
      users = users.filter((u) =>
        [u.firstName, u.lastName, u.username, u.email, u.phone, u.id]
          .map((v) => String(v ?? "").toLowerCase())
          .some((v) => v.includes(search)),
      );
    }
    users.sort((a, b) => String(b.registeredAt ?? "").localeCompare(String(a.registeredAt ?? "")));
    const total = users.length;
    const paged = users.slice(offset, offset + limit).map((u) => {
      const userOrders = orders.filter((o) => o.customerId === u.id && !o.isDemo);
      return {
        id: String(u.id),
        firstName: String(u.firstName ?? ""),
        lastName: String(u.lastName ?? ""),
        username: String(u.username ?? ""),
        email: String(u.email ?? ""),
        phone: String(u.phone ?? ""),
        emailVerified: Boolean(u.emailVerified),
        registeredAt: String(u.registeredAt ?? new Date().toISOString()),
        lastSignInAt: u.lastSignInAt ? String(u.lastSignInAt) : null,
        orderCount: userOrders.length,
        totalOrderValue: userOrders.reduce((s, o) => s + Number(o.totalCents ?? 0), 0) / 100,
      };
    });
    return jsonResponse({ customers: paged, total, offset, limit });
  }

  if (method === "GET" && path === "/admin/customer") {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const id = query.id;
    const offset = query.offset ? Number(query.offset) : 0;
    const limit = query.limit ? Number(query.limit) : 20;
    if (!id) return jsonResponse({ error: "Nieprawidłowe konto klienta." }, 400);
    const userSnap = await getDoc(doc(firestoreDb, "users", id));
    if (!userSnap.exists()) return jsonResponse({ error: "Nie znaleziono konta klienta." }, 404);
    const u = userSnap.data() as Record<string, unknown>;
    const ordersSnap = await getDocs(collection(firestoreDb, "orders"));
    const userOrders = ordersSnap.docs
      .map((d) => d.data() as Record<string, unknown>)
      .filter((o) => o.customerId === id && !o.isDemo)
      .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    return jsonResponse({
      customer: {
        id: String(u.id),
        firstName: String(u.firstName ?? ""),
        lastName: String(u.lastName ?? ""),
        username: String(u.username ?? ""),
        email: String(u.email ?? ""),
        phone: String(u.phone ?? ""),
        emailVerified: Boolean(u.emailVerified),
        registeredAt: String(u.registeredAt ?? new Date().toISOString()),
        lastSignInAt: u.lastSignInAt ? String(u.lastSignInAt) : null,
        orderCount: userOrders.length,
        totalOrderValue: userOrders.reduce((s, o) => s + Number(o.totalCents ?? 0), 0) / 100,
      },
      orders: userOrders.slice(offset, offset + limit).map((row) => ({
        id: row.id,
        number: `MM-${String(row.id).padStart(6, "0")}`,
        customerName: row.customerName,
        customerContact: row.customerContact ?? "",
        details: row.details,
        customerId: row.customerId ?? null,
        total: Number(row.totalCents ?? 0) / 100,
        status: row.status,
        trackingNumber: row.trackingNumber ?? "",
        isDemo: Boolean(row.isDemo),
        version: Number(row.version ?? 0),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        items: Array.isArray(row.items)
          ? (row.items as Array<Record<string, unknown>>).map((item) => ({
              productId: item.productId ?? null,
              name: item.name,
              category: item.category,
              quantity: item.quantity,
              unitPrice: Number(item.unitPriceCents ?? 0) / 100,
            }))
          : [],
      })),
      offset,
      limit,
    });
  }

  // 20. Fisheries CRUD
  if (method === "GET" && path === "/app/fisheries") {
    try {
      const snap = await getDocs(collection(firestoreDb, "fisheries"));
      if (snap.empty) return jsonResponse(INITIAL_FISHERIES);
      const rows = snap.docs
        .map((d) => d.data() as Record<string, unknown>)
        .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""), "pl") || Number(a.id) - Number(b.id));
      return jsonResponse(rows);
    } catch {
      return jsonResponse(INITIAL_FISHERIES);
    }
  }

  if (method === "POST" && path === "/app/fisheries") {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const data = body as Record<string, unknown>;
    const name = String(data.name ?? "").trim();
    if (!name) return jsonResponse({ error: "Podaj nazwę." }, 400);
    const id = await nextSequenceId("fisheries", 3);
    const now = new Date().toISOString();
    const row = {
      id,
      name,
      description: String(data.description ?? "").trim(),
      location: String(data.location ?? "").trim(),
      country: String(data.country ?? "pl").trim().toLowerCase(),
      voivodeship: String(data.voivodeship ?? "").trim(),
      fisheryType: String(data.fisheryType ?? "wild"),
      maxDepth: String(data.maxDepth ?? "").trim(),
      phone: String(data.phone ?? "").trim(),
      link: String(data.link ?? "").trim(),
      googleMapsLink: String(data.googleMapsLink ?? "").trim(),
      latitude: data.latitude !== null && data.latitude !== undefined ? Number(data.latitude) : null,
      longitude: data.longitude !== null && data.longitude !== undefined ? Number(data.longitude) : null,
      images: Array.isArray(data.images) ? data.images.map(String) : [],
      version: 0,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(firestoreDb, "fisheries", String(id)), row);
    return jsonResponse(row, 201);
  }

  const fisheryMatch = /^\/app\/fisheries\/(\d+)$/.exec(path);
  if (method === "PUT" && fisheryMatch) {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const id = Number(fisheryMatch[1]);
    const ref = doc(firestoreDb, "fisheries", String(id));
    const snap = await getDoc(ref);
    if (!snap.exists()) return jsonResponse({ error: "Łowisko już nie istnieje." }, 404);
    const existing = snap.data() as Record<string, unknown>;
    const data = body as Record<string, unknown>;
    if (Number(existing.version ?? 0) !== Number(data.version ?? 0)) {
      return jsonResponse({ error: "Łowisko zmieniono w innej sesji. Odśwież listę." }, 409);
    }
    const updated = {
      ...existing,
      id,
      name: String(data.name ?? "").trim(),
      description: String(data.description ?? "").trim(),
      location: String(data.location ?? "").trim(),
      country: String(data.country ?? "pl").trim().toLowerCase(),
      voivodeship: String(data.voivodeship ?? "").trim(),
      fisheryType: String(data.fisheryType ?? "wild"),
      maxDepth: String(data.maxDepth ?? "").trim(),
      phone: String(data.phone ?? "").trim(),
      link: String(data.link ?? "").trim(),
      googleMapsLink: String(data.googleMapsLink ?? "").trim(),
      latitude: data.latitude !== null && data.latitude !== undefined ? Number(data.latitude) : null,
      longitude: data.longitude !== null && data.longitude !== undefined ? Number(data.longitude) : null,
      images: Array.isArray(data.images) ? data.images.map(String) : [],
      version: Number(existing.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(ref, updated);
    return jsonResponse(updated);
  }

  if (method === "DELETE" && fisheryMatch) {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const id = Number(fisheryMatch[1]);
    await deleteDoc(doc(firestoreDb, "fisheries", String(id)));
    return jsonResponse(null, 204);
  }

  // 21. Fishing Events CRUD & Import
  if (method === "GET" && path === "/app/events") {
    try {
      const snap = await getDocs(collection(firestoreDb, "fishing_events"));
      if (snap.empty) return jsonResponse(INITIAL_EVENTS);
      const rows = snap.docs
        .map((d) => d.data() as Record<string, unknown>)
        .sort(
          (a, b) =>
            String(a.eventDate ?? "").localeCompare(String(b.eventDate ?? "")) ||
            String(a.startTime ?? "").localeCompare(String(b.startTime ?? "")) ||
            Number(a.id) - Number(b.id),
        );
      return jsonResponse(rows);
    } catch {
      return jsonResponse(INITIAL_EVENTS);
    }
  }

  if (method === "POST" && path === "/app/events") {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const data = body as Record<string, unknown>;
    const name = String(data.name ?? "").trim();
    if (!name) return jsonResponse({ error: "Podaj nazwę." }, 400);
    const id = await nextSequenceId("fishing_events", 2);
    const now = new Date().toISOString();
    const row = {
      id,
      name,
      description: String(data.description ?? "").trim(),
      eventDate: String(data.eventDate ?? ""),
      startTime: String(data.startTime ?? ""),
      location: String(data.location ?? "").trim(),
      country: String(data.country ?? "pl").trim().toLowerCase(),
      category: String(data.category ?? "").trim(),
      link: String(data.link ?? "").trim(),
      posterUrl: String(data.posterUrl ?? "").trim(),
      latitude: data.latitude !== null && data.latitude !== undefined ? Number(data.latitude) : null,
      longitude: data.longitude !== null && data.longitude !== undefined ? Number(data.longitude) : null,
      version: 0,
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(doc(firestoreDb, "fishing_events", String(id)), row);
    return jsonResponse(row, 201);
  }

  if (method === "POST" && path === "/app/events/import") {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const incoming = Array.isArray((body as { events?: unknown[] }).events)
      ? ((body as { events: Array<Record<string, unknown>> }).events)
      : [];
    const existingSnap = await getDocs(collection(firestoreDb, "fishing_events"));
    const keyOf = (e: Record<string, unknown>) =>
      `${String(e.name ?? "").trim().toLowerCase()}|${String(e.eventDate ?? "")}|${String(e.startTime ?? "")}|${String(e.location ?? "").trim().toLowerCase()}`;
    const seen = new Set(existingSnap.docs.map((d) => keyOf(d.data() as Record<string, unknown>)));
    let created = 0;
    const now = new Date().toISOString();
    for (const ev of incoming) {
      const k = keyOf(ev);
      if (seen.has(k)) continue;
      seen.add(k);
      const id = await nextSequenceId("fishing_events", 2);
      await setDoc(doc(firestoreDb, "fishing_events", String(id)), {
        id,
        name: String(ev.name ?? "").trim(),
        description: String(ev.description ?? "").trim(),
        eventDate: String(ev.eventDate ?? ""),
        startTime: String(ev.startTime ?? ""),
        location: String(ev.location ?? "").trim(),
        country: String(ev.country ?? "pl").trim().toLowerCase(),
        category: String(ev.category ?? "").trim(),
        link: String(ev.link ?? "").trim(),
        posterUrl: String(ev.posterUrl ?? "").trim(),
        latitude: ev.latitude !== null && ev.latitude !== undefined ? Number(ev.latitude) : null,
        longitude: ev.longitude !== null && ev.longitude !== undefined ? Number(ev.longitude) : null,
        version: 0,
        createdAt: now,
        updatedAt: now,
      });
      created++;
    }
    return jsonResponse({ created, skipped: incoming.length - created }, 201);
  }

  const eventMatch = /^\/app\/events\/(\d+)$/.exec(path);
  if (method === "PUT" && eventMatch) {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const id = Number(eventMatch[1]);
    const ref = doc(firestoreDb, "fishing_events", String(id));
    const snap = await getDoc(ref);
    if (!snap.exists()) return jsonResponse({ error: "Wydarzenie już nie istnieje." }, 404);
    const existing = snap.data() as Record<string, unknown>;
    const data = body as Record<string, unknown>;
    if (Number(existing.version ?? 0) !== Number(data.version ?? 0)) {
      return jsonResponse({ error: "Wydarzenie zmieniono w innej sesji. Odśwież listę." }, 409);
    }
    const updated = {
      ...existing,
      id,
      name: String(data.name ?? "").trim(),
      description: String(data.description ?? "").trim(),
      eventDate: String(data.eventDate ?? ""),
      startTime: String(data.startTime ?? ""),
      location: String(data.location ?? "").trim(),
      country: String(data.country ?? "pl").trim().toLowerCase(),
      category: String(data.category ?? "").trim(),
      link: String(data.link ?? "").trim(),
      posterUrl: String(data.posterUrl ?? "").trim(),
      latitude: data.latitude !== null && data.latitude !== undefined ? Number(data.latitude) : null,
      longitude: data.longitude !== null && data.longitude !== undefined ? Number(data.longitude) : null,
      version: Number(existing.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(ref, updated);
    return jsonResponse(updated);
  }

  if (method === "DELETE" && eventMatch) {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const id = Number(eventMatch[1]);
    await deleteDoc(doc(firestoreDb, "fishing_events", String(id)));
    return jsonResponse(null, 204);
  }

  // 22. Weather & MetodApka Guidance
  if (method === "GET" && path === "/weather/places") {
    const name = (query.name ?? "").trim();
    if (name.length < 2 || name.length > 100) {
      return jsonResponse({ error: "Nazwa miejscowości musi mieć od 2 do 100 znaków." }, 400);
    }
    try {
      return jsonResponse(await searchWeatherPlaces(name));
    } catch {
      return jsonResponse({ error: "Nie udało się wyszukać miejscowości. Spróbuj ponownie za chwilę." }, 503);
    }
  }

  if (method === "GET" && path === "/weather") {
    const lat = Number(query.latitude);
    const lon = Number(query.longitude);
    if (!query.latitude || !query.longitude || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return jsonResponse({ error: "Wybierz miejscowość lub udostępnij lokalizację." }, 400);
    }
    try {
      return jsonResponse(await getFishingWeather(lat, lon));
    } catch {
      return jsonResponse({ error: "Dane pogodowe są chwilowo niedostępne." }, 503);
    }
  }

  if (method === "POST" && path === "/app/guidance") {
    const input = body as {
      latitude: number;
      longitude: number;
      fisheryType: "commercial-lake" | "wild-lake";
      castingDistance?: number | null;
      language: "pl" | "en" | "de" | "fr" | "cs" | "hu" | "ro";
    };
    try {
      const report = await getFishingWeather(Number(input.latitude), Number(input.longitude));
      return jsonResponse(methodGuidance(input, report));
    } catch (error) {
      return jsonResponse(
        {
          error:
            error instanceof GuidanceWeatherUnavailable
              ? error.message
              : "Nie udało się pobrać pełnej pogody lub wygenerować zaleceń. Spróbuj ponownie.",
        },
        503,
      );
    }
  }

  // 23. Storage uploads
  if (method === "POST" && path === "/storage/uploads/request-url") {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const id = crypto.randomUUID();
    const objectPath = `/objects/uploads/${id}`;
    await setDoc(doc(firestoreDb, "uploads", id), {
      objectPath,
      ownerId: state.actorId ?? "admin",
      name: String((body as { name?: string }).name ?? "upload"),
      size: Number((body as { size?: number }).size ?? 0),
      contentType: String((body as { contentType?: string }).contentType ?? "image/webp"),
      published: true,
      createdAt: new Date().toISOString(),
    });
    return jsonResponse({ uploadURL: `/api/storage/uploads/put/${id}`, objectPath });
  }

  if (method === "POST" && path === "/storage/uploads/publish") {
    const state = await getAdminState();
    if (!state.isAdmin) return jsonResponse({ error: state.message }, state.authenticated ? 403 : 401);
    const objectPath = String((body as { objectPath?: string }).objectPath ?? "");
    return jsonResponse({ url: `/api/storage${objectPath}` });
  }

  return null;
}
