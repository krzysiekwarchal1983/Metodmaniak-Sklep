export const AI_IMAGE_NOTICE = "Wizualizacja AI — rzeczywisty odcień produktu może się różnić.";

/** Older catalogue descriptions embedded the notice; media now owns that label per image. */
export function productDescriptionWithoutImageNotice(description: string): string {
  return description.split("\n").filter((line) => line.trim() !== AI_IMAGE_NOTICE).join("\n").trim();
}

/** Keep the main photo first, support products without one, and avoid duplicate slides. */
export function getProductImages(product: { image: string; images: string[] }): string[] {
  return [...new Set([product.image, ...product.images].filter(Boolean))];
}

/** Only label our generated catalogue assets, never a later real product photo. */
export function isGeneratedWaftersImage(src: string): boolean {
  return src.startsWith("/api/storage/public-objects/wafters-previews/");
}
