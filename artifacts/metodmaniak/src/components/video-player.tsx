import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { PlayableVideo } from "@/lib/channel-videos";
import { asset, formatDate, youTubeId } from "@/lib/shop";
import { useCookiePreferences } from "@/components/cookie-preferences";
import { youtubeStartSeconds } from "@/lib/youtube-start";

export function VideoFrame({ video, autoPlay = false }: { video: PlayableVideo; autoPlay?: boolean }) {
  const { externalMedia, allowMedia } = useCookiePreferences();
  const id = youTubeId(video.videoUrl);
  if (id) {
    if (!externalMedia) return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 overflow-y-auto bg-[#11140f] p-3 text-center sm:gap-4 sm:p-6" data-testid="youtube-consent-gate">
        <p className="max-w-md text-xs leading-snug text-white/80 sm:text-sm sm:leading-relaxed">Włączenie YouTube pozwoli Google otrzymać dane połączenia i korzystać z pamięci przeglądarki. Zgodę wycofasz w ustawieniach cookies.</p>
        <button type="button" onClick={allowMedia} className="btn-lime shrink-0 px-4 py-2 text-xs sm:px-5 sm:py-3 sm:text-sm" data-testid="button-allow-youtube">Zgadzam się — włącz YouTube</button>
      </div>
    );
    return (
      <iframe
        className="h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&start=${youtubeStartSeconds(video.videoUrl)}${autoPlay ? "&autoplay=1" : ""}`}
        title={video.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        data-testid="video-youtube"
      />
    );
  }
  const src = asset(video.videoUrl);
  const safe = src.startsWith("/") || src.startsWith("https://");
  if (!safe) return <div className="grid h-full place-items-center text-sm text-muted-foreground">Nieobsługiwany adres filmu.</div>;
  return <video className="h-full w-full bg-black" src={src} controls autoPlay={autoPlay} playsInline preload="metadata" data-testid="video-native" />;
}

export function VideoModal({ video, onClose }: { video: PlayableVideo | null; onClose: () => void }) {
  useEffect(() => {
    if (!video) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [video, onClose]);

  return (
    <AnimatePresence>
      {video && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog" aria-modal="true" aria-label={video.title}
        >
          <motion.div
            className="w-full max-w-5xl"
            initial={{ y: 30, scale: .96, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <div className="mono-label">{formatDate(video.createdAt)}{video.duration ? ` · ${video.duration}` : ""}</div>
                <h3 className="font-display text-3xl font-extrabold uppercase">{video.title}</h3>
              </div>
              <button onClick={onClose} className="btn-ghost h-11 w-11 shrink-0" aria-label="Zamknij" data-testid="button-close-video"><X className="h-5 w-5" /></button>
            </div>
            <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
              <VideoFrame video={video} autoPlay />
            </div>
            {video.description && <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">{video.description}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
