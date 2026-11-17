/** AI catalogue visualizations, shared across sizes; never presented as real product photos. */
export const WAFTERS_PREVIEW_NOTICE = "Wizualizacja AI — rzeczywisty odcień produktu może się różnić.";

/** Remove only our obsolete notice; preserve every other description verbatim. */
export function withoutWaftersPreviewNotice(description: string): string {
  return description.split("\n").filter((line) => line.trim() !== WAFTERS_PREVIEW_NOTICE).join("\n");
}

export function realWaftersMedia(product: { images: string[]; description: string }, image: string) {
  return {
    image,
    images: [...new Set(product.images.map((src) =>
      src.startsWith("/api/storage/public-objects/wafters-previews/") ? image : src))],
    description: withoutWaftersPreviewNotice(product.description),
  };
}
export const WAFTERS_PREVIEW_IMAGES = {
  "Żółty musztardowy": "/api/storage/public-objects/wafters-previews/mustard-e71c2d4b3e41.webp",
  "Żółty fluo": "/api/storage/public-objects/wafters-previews/yellow-fluo-05e377aaefe4.webp",
  "Pomarańczowy fluo": "/api/storage/public-objects/wafters-previews/orange-fluo-d1b3bd18a621.webp",
  "Biały": "/api/storage/public-objects/wafters-previews/white-523001ad3724.webp",
  "Różowy wyprany": "/api/storage/public-objects/wafters-previews/pink-washout-189e6db07ca4.webp",
  "Różowy": "/api/storage/public-objects/wafters-previews/pink-88ddbc88a929.webp",
  "Jasny brązowy": "/api/storage/public-objects/wafters-previews/light-brown-dbc30a3eb7c2.webp",
  "Ciemny brązowy": "/api/storage/public-objects/wafters-previews/dark-brown-0a5294f4145d.webp",
  "Brązowy wpadający w zielony": "/api/storage/public-objects/wafters-previews/olive-brown-ba4c8679027e.webp",
  "Brązowy wpadający w żółty": "/api/storage/public-objects/wafters-previews/yellow-brown-9bef679efff6.webp",
  "Biało-różowy": "/api/storage/public-objects/wafters-previews/white-pink-744a596b8521.webp",
  "Żółty fluo z pomarańczowym": "/api/storage/public-objects/wafters-previews/yellow-orange-1cbb6e4e90f2.webp",
  "Jasny brązowy z ciemnym brązowym": "/api/storage/public-objects/wafters-previews/light-dark-brown-e341580d36ae.webp",
  "Brązowy z paskiem różowym washout": "/api/storage/public-objects/wafters-previews/brown-pink-stripe-4cbba552f61a.webp",
  "Ciemny brązowy z żółtym musztardowym": "/api/storage/public-objects/wafters-previews/dark-brown-mustard-b6d27dcd3586.webp",
} as const;
