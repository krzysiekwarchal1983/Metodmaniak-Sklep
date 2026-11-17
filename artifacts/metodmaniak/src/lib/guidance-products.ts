type CatalogProduct = {
  category: string;
  color: string;
  subcategory: string;
  stock: number;
};

export type GuidanceColor = { name: string; hex: string };

const normalize = (text: string) => text.toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/[^a-z0-9]+/g, " ").trim();

// Original engine colour identifiers are stable across its translated labels.
// Only genuine catalogue colours belong here; do not substitute a different duo.
const COLOR_FAMILIES: Record<string, string[]> = {
  "#ffffff": ["Biały"],
  "#ff6b35": ["Pomarańczowy fluo"],
  "#ffd93d": ["Żółty musztardowy", "Żółty fluo"],
  "#daa520": ["Żółty musztardowy"],
  "#ff69b4": ["Różowy"],
  "#8b4513": ["Jasny brązowy", "Ciemny brązowy"],
  "#c4a484": ["Jasny brązowy", "Ciemny brązowy"],
};

export function matchingWafters<T extends CatalogProduct>(products: readonly T[], color: GuidanceColor, tips: readonly string[] = []): T[] {
  const wafters = products.filter((p) => p.category === "waftersy");
  const exact = wafters.filter((p) => normalize(p.color) === normalize(color.name));
  const names = (COLOR_FAMILIES[color.hex.toLowerCase()] ?? []).map(normalize);
  const colors = exact.length ? exact : wafters.filter((p) => names.includes(normalize(p.color)));
  const maxSize = tips.join(" ").match(/(?:maksymalnie|maximum|max\.?)\s*(\d+(?:[.,]\d+)?)\s*mm/i)?.[1];
  return colors.filter((p) => !maxSize || Number.parseFloat(p.subcategory) <= Number(maxSize.replace(",", ".")))
    .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || normalize(a.color).localeCompare(normalize(b.color)) || Number.parseFloat(a.subcategory) - Number.parseFloat(b.subcategory));
}

export function matchingGroundbaits<T extends CatalogProduct>(products: readonly T[], fisheryType?: string, details: readonly string[] = []): T[] {
  const type = fisheryType === "commercial-lake" ? "komercyjne" : fisheryType === "wild-lake" ? "pzw" : null;
  const primary = normalize(details[0] ?? "");
  const dark = /ciem|braz|czarn|dark|brown|black/.test(primary);
  const light = /jasn|zol|bial|light|yellow|white/.test(primary);
  return products.filter((p) => {
    if (p.category !== "zanety") return false;
    if (type && normalize(p.subcategory) !== type) return false;
    const color = normalize(p.color);
    return (!dark && !light) || (dark && /ciem|braz|czarn|dark|brown|black/.test(color))
      || (light && /jasn|zol|bial|light|yellow|white/.test(color));
  });
}

export function cataloguePellets<T extends CatalogProduct>(products: readonly T[]): T[] {
  return products.filter((p) => p.category === "pellety")
    .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || Number.parseFloat(a.subcategory) - Number.parseFloat(b.subcategory));
}
