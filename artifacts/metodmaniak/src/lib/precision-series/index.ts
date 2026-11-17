import type { Product } from "@workspace/api-client-react";
import { FOUNDATIONS } from "./foundations";
import { TACTICS } from "./tactics";

export type ProductChoice = {
  category: Product["category"];
  subcategory?: string;
  color?: string;
  why: string;
};

export type PrecisionEpisode = {
  number: number;
  slug: string;
  title: string;
  topic: string;
  lead: string;
  goal: string;
  chapters: { title: string; points: string[] }[];
  productNote?: string;
  products: [ProductChoice, ProductChoice, ProductChoice];
};

export const SERIES_TITLE = "Sztuka precyzji z Metodmaniak.pl";
export const PRECISION_EPISODES: readonly PrecisionEpisode[] = [...FOUNDATIONS, ...TACTICS];
export const episodeHref = (episode: PrecisionEpisode) => `/vblog/sztuka-precyzji/${episode.slug}`;
export const findEpisode = (slug: string) => PRECISION_EPISODES.find((episode) => episode.slug === slug);

/** No unrelated fillers or stale copies of prices/stock: always resolve against the live catalogue. */
export function episodeProducts(episode: PrecisionEpisode, catalogue: readonly Product[]) {
  const used = new Set<number>();
  return episode.products.map((choice) => {
    const product = catalogue.find((p) =>
      !used.has(p.id) &&
      p.category === choice.category &&
      (!choice.subcategory || p.subcategory === choice.subcategory) &&
      (!choice.color || p.color === choice.color));
    if (product) used.add(product.id);
    return { product, why: choice.why };
  });
}
