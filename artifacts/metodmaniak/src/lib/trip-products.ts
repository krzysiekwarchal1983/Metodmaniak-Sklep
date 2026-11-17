type TripProduct = { id: number; category: string; featured: boolean; stock: number };

/** Keep featured, available products first, then fill four places with category variety. */
export function selectTripProducts<T extends TripProduct>(products: readonly T[]): T[] {
  const available = products.filter((product) => product.stock > 0);
  const ranked = [...available.filter((product) => product.featured), ...available.filter((product) => !product.featured)];
  const selected = ranked.filter((product) => product.featured).slice(0, 4);
  for (const product of ranked) {
    if (selected.length === 4) break;
    if (!selected.some((item) => item.category === product.category)) selected.push(product);
  }
  for (const product of ranked) {
    if (selected.length === 4) break;
    if (!selected.some((item) => item.id === product.id)) selected.push(product);
  }
  return selected;
}
