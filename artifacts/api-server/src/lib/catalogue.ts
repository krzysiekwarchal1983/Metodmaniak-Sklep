import { type ProductRow } from "@workspace/db";

export const categories = [
  { slug: "waftersy", name: "Waftersy", subcategories: ["6mm", "8mm", "10mm"] },
  { slug: "zanety", name: "Zanęty", subcategories: ["Komercyjne", "PZW"] },
  { slug: "pellety", name: "Pellety", subcategories: ["1mm", "2mm", "4.5mm", "6mm", "8mm"] },
  { slug: "przypony", name: "Przypony", subcategories: ["10cm", "15cm", "30cm"] },
  { slug: "podajniki", name: "Podajniki Method Feeder", subcategories: ["15 g", "20 g", "30 g", "45 g", "60 g"] },
];

export function serializeProduct(row: ProductRow) {
  const { priceCents, ...rest } = row;
  return { ...rest, price: priceCents / 100 };
}

export function validCategory(category: string, subcategory: string) {
  return categories.some((c) => c.slug === category && c.subcategories.includes(subcategory));
}

export function safeImage(url: string) {
  if (url === "") return true;
  if (/^\/(?:images\/|api\/storage\/objects\/uploads\/)[a-zA-Z0-9/_.-]+$/.test(url)) return true;
  try { return new URL(url).protocol === "https:"; } catch { return false; }
}

export function safeVideo(url: string) {
  if (/^\/api\/storage\/objects\/uploads\/[a-f0-9-]+$/.test(url)) return true;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    if (u.hostname === "youtu.be") return /^\/[a-zA-Z0-9_-]{11}$/.test(u.pathname);
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(u.hostname)) {
      return (u.pathname === "/watch" && /^[a-zA-Z0-9_-]{11}$/.test(u.searchParams.get("v") || ""))
        || /^\/(?:shorts|embed)\/[a-zA-Z0-9_-]{11}$/.test(u.pathname);
    }
    return false;
  } catch { return false; }
}
