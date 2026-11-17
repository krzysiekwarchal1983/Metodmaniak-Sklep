import { WAFTERS_PREVIEW_IMAGES, WAFTERS_PREVIEW_NOTICE } from "./wafters-images";

export const WAFTERS_SIZES = ["6mm", "8mm", "10mm"] as const;
export const WAFTERS_COLOURS = [
  "Żółty musztardowy",
  "Żółty fluo",
  "Pomarańczowy fluo",
  "Biały",
  "Różowy wyprany",
  "Różowy",
  "Jasny brązowy",
  "Ciemny brązowy",
  "Brązowy wpadający w zielony",
  "Brązowy wpadający w żółty",
  "Biało-różowy",
  "Żółty fluo z pomarańczowym",
  "Jasny brązowy z ciemnym brązowym",
  "Brązowy z paskiem różowym washout",
  "Ciemny brązowy z żółtym musztardowym",
] as const;

export function makeWaftersRange() {
  return WAFTERS_SIZES.flatMap((size) => WAFTERS_COLOURS.map((color) => ({
    name: `Wafters Dumbells ${color} ${size.replace("mm", " mm")}`,
    category: "waftersy",
    subcategory: size,
    description: `Wafters w kształcie dumbellsa. Rozmiar: ${size.replace("mm", " mm")}. Kolor: ${color.toLocaleLowerCase("pl-PL")}.\n${WAFTERS_PREVIEW_NOTICE}`,
    priceCents: 2999,
    image: WAFTERS_PREVIEW_IMAGES[color],
    images: [] as string[],
    variants: [size],
    color,
    scent: "",
    stock: 0,
    featured: false,
    badge: "",
  })));
}
