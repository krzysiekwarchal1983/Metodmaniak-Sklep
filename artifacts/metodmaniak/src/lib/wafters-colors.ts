type ColorProduct = { id: number; category: string; subcategory: string; color: string };
export const WAFTERS_SIZES = ["6mm", "8mm", "10mm"] as const;

/** Include unavailable colours for browsing, but never navigate to a different size. */
export function waftersColorOptions<T extends ColorProduct>(current: T, products: readonly T[]): T[] {
  if (current.category !== "waftersy") return [];
  const options = products.filter((product) => product.category === "waftersy" && product.subcategory === current.subcategory && product.color);
  return options.some((product) => product.id === current.id) ? options : [current, ...options];
}

/** A size change navigates to its own stock-tracked product, keeping the colour. */
export function waftersSizeOptions<T extends ColorProduct>(current: T, products: readonly T[]): T[] {
  if (current.category !== "waftersy") return [];
  const matching = products.filter((product) => product.category === "waftersy" && product.color === current.color);
  if (!matching.some((product) => product.id === current.id)) matching.push(current);
  return WAFTERS_SIZES.flatMap((size) => {
    const product = matching.find((item) => item.subcategory === size);
    return product ? [product] : [];
  });
}
