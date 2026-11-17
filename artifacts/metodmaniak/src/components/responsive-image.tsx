import type { ImgHTMLAttributes } from "react";
import manifest from "@/assets/image-variants.json";
import { asset, BASE } from "@/lib/shop";

type ImageVariants = { width: number; height: number; sources: { width: number; src: string; bytes: number }[] };
const images: Record<string, ImageVariants> = manifest;

/** Only bundled photographs have variants; uploads and remote media retain their original URLs. */
export function ResponsiveImage({ src, sizes = "100vw", ...props }: ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  if (!src) return <span className={props.className} aria-hidden="true" />;
  const key = BASE && src.startsWith(`${BASE}/images/`) ? src.slice(BASE.length) : src;
  const image = images[key];
  const fallback = <img {...props} src={src} loading={props.loading ?? "lazy"} decoding={props.decoding ?? "async"} width={props.width ?? image?.width} height={props.height ?? image?.height} />;
  if (!image) return fallback;
  return (
    <picture className="contents">
      <source type="image/webp" srcSet={image.sources.map((variant) => `${asset(variant.src)} ${variant.width}w`).join(", ")} sizes={sizes} />
      {fallback}
    </picture>
  );
}
