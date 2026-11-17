type CatalogCategory = { slug: string; subs: readonly string[] };
type FilterValues = { category: string; sub: string; color: string };

/** Never copy URL parameters or search text into an analytics payload. */
export function catalogAnalyticsData(
  filters: FilterValues,
  categories: readonly CatalogCategory[],
  colors: readonly string[],
) {
  const category = categories.find((entry) => entry.slug === filters.category);
  return {
    category: category?.slug ?? (filters.category ? "unknown" : "all"),
    size: filters.sub
      ? category?.subs.includes(filters.sub) ? filters.sub : "unknown"
      : "all",
    color: filters.color
      ? colors.includes(filters.color) ? filters.color : "unknown"
      : "all",
  };
}
