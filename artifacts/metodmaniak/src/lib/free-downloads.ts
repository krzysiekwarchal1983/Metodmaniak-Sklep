export type FreeDownload = {
  id: string;
  title: string;
  description: string;
  category: "wallpapers" | "logos" | "icons";
  src: string;
  previewSrc: string;
  fileName: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
};

export const FREE_DOWNLOADS: readonly FreeDownload[] = [
  {
    id: "facebook", title: "Okładka na Facebooka", description: "Jezioro, góry i las oraz oryginalne logo MetodManiaka.",
    category: "wallpapers", format: "JPG", width: 1640, height: 624, bytes: 87348,
    fileName: "metodmaniak-facebook-1640x624.jpg",
    src: "/api/storage/public-objects/free/e007f1578550-metodmaniak-facebook-1640x624.jpg",
    previewSrc: "/api/storage/public-objects/free/eb61fa484ee6-metodmaniak-facebook-1640x624-preview.webp",
  },
  {
    id: "phone", title: "Tapeta na telefon", description: "Wędkarski klimat i logo fluo w pionowym kadrze na telefon.",
    category: "wallpapers", format: "PNG", width: 1080, height: 2400, bytes: 940556,
    fileName: "metodmaniak-telefon-1080x2400.png",
    src: "/api/storage/public-objects/free/4b0d44e6765d-metodmaniak-telefon-1080x2400.png",
    previewSrc: "/api/storage/public-objects/free/96677ea1e684-metodmaniak-telefon-1080x2400-preview.webp",
  },
  {
    id: "desktop", title: "Tapeta na komputer", description: "Szeroki kadr znad wody z logo MetodManiaka.",
    category: "wallpapers", format: "JPG", width: 2560, height: 1440, bytes: 212118,
    fileName: "metodmaniak-komputer-2560x1440.jpg",
    src: "/api/storage/public-objects/free/81fc457bb3b9-metodmaniak-komputer-2560x1440.jpg",
    previewSrc: "/api/storage/public-objects/free/3324acf3d34b-metodmaniak-komputer-2560x1440-preview.webp",
  },
  {
    id: "logo-png", title: "Logo — przezroczyste tło", description: "Oryginalny znak i napis MetodManiaka w kolorze fluo.",
    category: "logos", format: "PNG", width: 1987, height: 210, bytes: 32489,
    fileName: "metodmaniak-logo.png",
    src: "/api/storage/public-objects/free/1359bcc93df7-metodmaniak-logo.png",
    previewSrc: "/api/storage/public-objects/free/f0a51c5197f9-metodmaniak-logo-preview.webp",
  },
  {
    id: "logo-webp", title: "Logo — wersja WebP", description: "Przezroczyste tło i bezstratny format internetowy.",
    category: "logos", format: "WebP", width: 1987, height: 210, bytes: 14166,
    fileName: "metodmaniak-logo.webp",
    src: "/api/storage/public-objects/free/f109825f1661-metodmaniak-logo.webp",
    previewSrc: "/api/storage/public-objects/free/f0a51c5197f9-metodmaniak-logo-preview.webp",
  },
  {
    id: "logo-jpg", title: "Logo — ciemne tło", description: "Wersja JPG na ciemnym tle.",
    category: "logos", format: "JPG", width: 1987, height: 210, bytes: 54867,
    fileName: "metodmaniak-logo.jpg",
    src: "/api/storage/public-objects/free/ff3744211615-metodmaniak-logo.jpg",
    previewSrc: "/api/storage/public-objects/free/f0a51c5197f9-metodmaniak-logo-preview.webp",
  },
  {
    id: "icon-png", title: "Ikona MetodManiaka", description: "Symbol z dostarczonego logo na ciemnym tle.",
    category: "icons", format: "PNG", width: 512, height: 512, bytes: 24049,
    fileName: "metodmaniak-ikona-512.png",
    src: "/api/storage/public-objects/free/bdf0599791ee-metodmaniak-ikona-512.png",
    previewSrc: "/api/storage/public-objects/free/cb3c1e4655fd-metodmaniak-ikona-512-preview.webp",
  },
  {
    id: "icon-ico", title: "Ikony — zestaw ICO", description: "Rozmiary 16, 32, 48, 64 i 256 px w jednym pliku.",
    category: "icons", format: "ICO", bytes: 11814, fileName: "metodmaniak-ikony.ico",
    src: "/api/storage/public-objects/free/e2b12555146a-metodmaniak-ikony.ico",
    previewSrc: "/api/storage/public-objects/free/cb3c1e4655fd-metodmaniak-ikony-preview.webp",
  },
];

export const FREE_PACK: { src: string; fileName: string; bytes: number } | null = {
  src: "/api/storage/public-objects/free/9b4edc3a9397-metodmaniak-free-pack.zip",
  fileName: "metodmaniak-free-pack.zip",
  bytes: 1352708,
};
