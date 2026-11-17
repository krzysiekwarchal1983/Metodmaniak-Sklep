import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { ResponsiveImage } from "@/components/responsive-image";
import { AI_IMAGE_NOTICE, getProductImages, isGeneratedWaftersImage, productDescriptionWithoutImageNotice } from "@/lib/product-media";
import { asset } from "@/lib/shop";

type ProductImageGalleryProps = {
  product: {
    name: string;
    description: string;
    subcategory: string;
    color?: string | null;
    image: string;
    images: string[];
    badge?: string | null;
  };
};

const controlClass = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/20 hover:border-lime hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime";

/** Remount for each product/variant so an open preview cannot outlive its selection. */
export function ProductImageGallery({ product: p }: ProductImageGalleryProps) {
  const gallery = getProductImages(p);
  const [selected, setSelected] = useState(p.image);
  const [open, setOpen] = useState(false);
  const [failedImage, setFailedImage] = useState("");
  const currentImage = gallery.includes(selected) ? selected : gallery[0] ?? "";
  const index = gallery.indexOf(currentImage);
  const generated = isGeneratedWaftersImage(currentImage);
  const changeImage = (offset: number) => {
    setSelected(gallery[(index + offset + gallery.length) % gallery.length]);
  };
  const thumbnails = (enlarged: boolean) => (
    <div className="mt-3 flex gap-3 overflow-x-auto pb-2" aria-label="Zdjęcia produktu">
      {gallery.map((src, i) => (
        <button key={src} type="button" onClick={() => setSelected(src)}
          aria-label={`Pokaż zdjęcie ${i + 1}: ${p.name}`} aria-pressed={currentImage === src}
          className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime sm:h-20 sm:w-20 ${currentImage === src ? "border-lime" : "border-transparent opacity-60 hover:opacity-100"}`}
          data-testid={enlarged ? "button-preview-thumb" : "button-gallery-thumb"}>
          <ResponsiveImage src={asset(src)} sizes="80px" alt="" className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <div>
        <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-white/[.07] bg-[#121411]">
          {currentImage ? (
            <Dialog.Trigger asChild>
              <button type="button" className="group block h-full w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime"
                aria-label={`Powiększ zdjęcie: ${p.name}`} data-testid="button-product-zoom">
                <ResponsiveImage key={currentImage} src={asset(currentImage)} sizes="(min-width: 768px) 55vw, 100vw" loading="eager" fetchPriority="high" alt={p.name} className="rise h-full w-full object-cover" data-testid="img-product" />
                <span className="pointer-events-none absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-xs text-white group-hover:text-lime"><Expand className="h-4 w-4" /> Powiększ</span>
              </button>
            </Dialog.Trigger>
          ) : <div className="grid h-full place-items-center p-8 text-center text-sm text-muted-foreground">Zdjęcie w przygotowaniu</div>}
          {p.badge && <span className="pointer-events-none absolute left-5 top-5 rounded-full bg-lime px-3 py-1.5 text-xs font-extrabold uppercase text-[#0f110e]">{p.badge}</span>}
        </div>
        {generated && <p className="mt-2 px-1 text-xs leading-relaxed text-muted-foreground">{AI_IMAGE_NOTICE}</p>}
        {gallery.length > 1 && thumbnails(false)}
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/85"
          onPointerDown={(event) => {
            // Handle even an immediate click after opening, before Radix's
            // deferred document-level outside listener has been attached.
            if (event.button === 0 && event.target === event.currentTarget) setOpen(false);
          }} />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 max-h-[92dvh] w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/15 bg-[#121411] p-4 shadow-2xl focus:outline-none sm:p-6"
          onKeyDown={(event) => {
            if (gallery.length < 2 || event.altKey || event.ctrlKey || event.metaKey) return;
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              changeImage(event.key === "ArrowLeft" ? -1 : 1);
            }
          }}
          data-testid="product-image-preview">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="font-poppins break-words text-lg sm:text-2xl">{p.name}</Dialog.Title>
              <p className="mt-1 text-sm text-lime">{[p.subcategory, p.color].filter(Boolean).join(" · ")}</p>
            </div>
            <Dialog.Close className={`${controlClass} shrink-0`} aria-label="Zamknij powiększenie" data-testid="button-close-preview"><X className="h-5 w-5" /></Dialog.Close>
          </div>
          {failedImage === currentImage ? (
            <div className="grid min-h-48 place-items-center gap-3 py-8 text-center text-sm" role="status">
              <p>Nie udało się wczytać zdjęcia.</p>
              <button type="button" className={`${controlClass} px-4`} onClick={() => setFailedImage("")}>Spróbuj ponownie</button>
            </div>
          ) : (
            <ResponsiveImage key={currentImage} src={asset(currentImage)} sizes="(min-width: 1056px) 1008px, calc(100vw - 64px)" loading="eager"
              alt={`${p.name} — zdjęcie ${index + 1}`} className="mt-4 h-auto max-h-[56dvh] w-full object-contain"
              onError={() => setFailedImage(currentImage)} data-testid="img-product-preview" />
          )}
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs leading-relaxed text-white/75" aria-live="polite">
              {generated ? AI_IMAGE_NOTICE : "Podgląd zdjęcia produktu."}
            </p>
            {gallery.length > 1 && (
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" className={controlClass} onClick={() => changeImage(-1)} aria-label="Poprzednie zdjęcie"><ChevronLeft className="h-5 w-5" /></button>
                <span className="text-xs text-white/75" aria-live="polite">{index + 1} / {gallery.length}</span>
                <button type="button" className={controlClass} onClick={() => changeImage(1)} aria-label="Następne zdjęcie"><ChevronRight className="h-5 w-5" /></button>
              </div>
            )}
          </div>
          {gallery.length > 1 && thumbnails(true)}
          <Dialog.Description className="mt-4 whitespace-pre-line text-sm leading-relaxed text-white/75">
            {productDescriptionWithoutImageNotice(p.description) || `Powiększenie zdjęcia produktu ${p.name}.`}
          </Dialog.Description>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
