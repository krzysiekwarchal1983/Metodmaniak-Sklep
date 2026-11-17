import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, type User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const FIREBASE_CONFIG = {
  projectId: "metodmaniak-sklep-internetowy",
  appId: "1:963777341779:web:37f6a4c3c4dad5ca49d9a6",
  storageBucket: "metodmaniak-sklep-internetowy.firebasestorage.app",
  apiKey: "AIzaSyBDsywdkiTUdOw5wwGZ4k6azXiXACAfnMw",
  authDomain: "metodmaniak-sklep-internetowy.firebaseapp.com",
  messagingSenderId: "963777341779",
  measurementId: "G-E5TQXP7NRT",
} as const;

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(FIREBASE_CONFIG);
export const firebaseAuth = getAuth(firebaseApp);
export const firestoreDb = getFirestore(firebaseApp);

export const ADMIN_EMAILS = new Set([
  "krzysiekwarchal@gmail.com",
  "krzysztofwarchal@gmail.com",
]);

export async function isFirebaseUserAdmin(user: User | null): Promise<boolean> {
  if (!user) return false;
  const email = (user.email ?? "").trim().toLowerCase();
  if (email && ADMIN_EMAILS.has(email) && user.emailVerified) {
    return true;
  }
  try {
    const tokenResult = await user.getIdTokenResult();
    if (tokenResult.claims.role === "admin" || tokenResult.claims.admin === true) {
      return true;
    }
  } catch {
    // Ignore token parsing error
  }
  return false;
}

export const WAFTERS_PREVIEW_NOTICE = "Wizualizacja AI — rzeczywisty odcień produktu może się różnić.";

export const WAFTERS_PREVIEW_IMAGES: Record<string, string> = {
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
};

const WAFTERS_SIZES = ["6mm", "8mm", "10mm"] as const;
const WAFTERS_COLOURS = Object.keys(WAFTERS_PREVIEW_IMAGES);
const WAFTERS_SCENTS = ["Ananas", "Truskawka", "Kryl", "Czosnek", "Wanilia"];

export type FirestoreProductRow = {
  id: number;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  priceCents: number;
  image: string;
  images: string[];
  variants: string[];
  color: string;
  scent: string;
  stock: number;
  featured: boolean;
  badge: string;
};

export function buildInitialProducts(): FirestoreProductRow[] {
  let nextId = 1;
  const wafters: FirestoreProductRow[] = WAFTERS_SIZES.flatMap((size) =>
    WAFTERS_COLOURS.map((color, idx) => {
      const id = nextId++;
      const scent = WAFTERS_SCENTS[idx % WAFTERS_SCENTS.length];
      return {
        id,
        name: `Wafters Dumbells ${color} ${size.replace("mm", " mm")}`,
        category: "waftersy",
        subcategory: size,
        description: `Wafters w kształcie dumbellsa. Rozmiar: ${size.replace("mm", " mm")}. Kolor: ${color.toLocaleLowerCase("pl-PL")}.\n${WAFTERS_PREVIEW_NOTICE}`,
        priceCents: 2999,
        image: WAFTERS_PREVIEW_IMAGES[color],
        images: [WAFTERS_PREVIEW_IMAGES[color]],
        variants: [size],
        color,
        scent,
        stock: 25,
        featured: size === "8mm" && idx < 4,
        badge: size === "8mm" && idx === 0 ? "Bestseller" : "",
      };
    }),
  );

  const others: FirestoreProductRow[] = [
    ...["1mm", "2mm", "4.5mm", "6mm", "8mm"].map((size) => ({
      id: nextId++,
      name: `Pellet Method ${size}`,
      category: "pellety",
      subcategory: size,
      priceCents: 1990,
      image: "/images/pellet.png",
      images: ["/images/pellet.png"],
      description: `Przykładowy pellet do method feeder, granulacja ${size}, opakowanie 800 g. Namaczanie dostosuj do temperatury wody. Produkt demonstracyjny.`,
      variants: ["800 g"],
      color: "Brązowy",
      scent: "Halibut",
      stock: 32,
      featured: size === "2mm",
      badge: size === "2mm" ? "Polecany" : "",
    })),
    ...["Komercyjne", "PZW"].map((type) => ({
      id: nextId++,
      name: `Zanęta Method ${type}`,
      category: "zanety",
      subcategory: type,
      priceCents: 2290,
      image: "/images/groundbait.png",
      images: ["/images/groundbait.png"],
      description: `Przykładowa mieszanka do łowisk ${type === "PZW" ? "naturalnych" : "komercyjnych"}, opakowanie 1 kg. Stopniowo dowilżaj i przetrzyj przez sito. Produkt demonstracyjny.`,
      variants: ["1 kg"],
      color: "Brązowy",
      scent: "Kryl",
      stock: 32,
      featured: type === "Komercyjne",
      badge: "",
    })),
    ...["10cm", "15cm", "30cm"].map((length) => ({
      id: nextId++,
      name: `Przypon Method ${length}`,
      category: "przypony",
      subcategory: length,
      priceCents: 1490,
      image: "/images/hooks.png",
      images: ["/images/hooks.png"],
      description: `Przykładowy przypon o długości ${length}, zestaw 3 sztuk. Wybierz rozmiar haka. Specyfikację sprawdź przed docelowym udostępnieniem produktu do sprzedaży.`,
      variants: ["Hak #10", "Hak #12", "Hak #14"],
      color: "",
      scent: "",
      stock: 32,
      featured: length === "10cm",
      badge: "",
    })),
    ...["15 g", "20 g", "30 g", "45 g", "60 g"].map((weight) => ({
      id: nextId++,
      name: `Podajnik Method Feeder ${weight}`,
      category: "podajniki",
      subcategory: weight,
      priceCents: 1690,
      image: "/images/editorial-hands.png",
      images: ["/images/editorial-hands.png"],
      description: `Podajnik do metody o gramaturze ${weight}, stabilny lot i równomierne uwalnianie mieszanki na dnie.`,
      variants: [weight],
      color: "",
      scent: "",
      stock: 20,
      featured: weight === "30 g",
      badge: weight === "30 g" ? "Nowość" : "",
    })),
  ];

  return [...wafters, ...others];
}

export const INITIAL_FISHERIES = [
  {
    id: 1,
    name: "Łowisko Karpiowe Grodzisko",
    description: "Kameralne łowisko komercyjne w Małopolsce, doskonałe pod method feeder. Liczne karpie, amury i jesiotry.",
    location: "Grodzisko k. Zatora",
    country: "pl",
    voivodeship: "małopolskie",
    fisheryType: "commercial",
    maxDepth: "3.5 m",
    phone: "+48 531 660 877",
    link: "https://www.youtube.com/@LaLigaOswiecim",
    googleMapsLink: "https://maps.google.com/?q=50.005,19.435",
    latitude: 50.005,
    longitude: 19.435,
    images: ["/api/storage/public-objects/hero/znad-wody-59a7c6032229.jpg"],
    version: 0,
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
  },
  {
    id: 2,
    name: "Sportex Lake Krzanowice",
    description: "Zbiornik sportowy z czystą wodą i zróżnicowanym dnem, wymagający precyzyjnego klipsowania.",
    location: "Krzanowice",
    country: "pl",
    voivodeship: "śląskie",
    fisheryType: "commercial",
    maxDepth: "6.0 m",
    phone: "",
    link: "",
    googleMapsLink: "https://maps.google.com/?q=50.02,18.13",
    latitude: 50.02,
    longitude: 18.13,
    images: ["/api/storage/public-objects/channel/channel-uqyhFSbTziY-7e876d4e38d8.jpg"],
    version: 0,
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
  },
  {
    id: 3,
    name: "Łowisko Rajsko — Żwirownia",
    description: "Woda w okolicach Oświęcimia / Rajska. Spady, twarde blaty i wymagające ryby.",
    location: "Rajsko k. Oświęcimia",
    country: "pl",
    voivodeship: "małopolskie",
    fisheryType: "wild",
    maxDepth: "5.0 m",
    phone: "",
    link: "",
    googleMapsLink: "https://maps.google.com/?q=50.015,19.205",
    latitude: 50.015,
    longitude: 19.205,
    images: [],
    version: 0,
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
  },
];

export const INITIAL_EVENTS = [
  {
    id: 1,
    name: "Method Feeder Puchar Jesieni — Rajsko",
    description: "Towarzyskie zawody method feeder na jedną wędkę. Zbiórka o 6:30, losowanie stanowisk o 7:00.",
    eventDate: "2026-11-28",
    startTime: "07:00",
    location: "Rajsko k. Oświęcimia",
    country: "pl",
    category: "Method Feeder",
    link: "https://www.facebook.com/profile.php?id=61584197146857",
    posterUrl: "/api/storage/public-objects/hero/znad-wody-59a7c6032229.jpg",
    latitude: 50.015,
    longitude: 19.205,
    version: 0,
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
  },
  {
    id: 2,
    name: "Fishing Open Grodzisko",
    description: "Otwarte zawody feederowe na łowisku Grodzisko.",
    eventDate: "2026-12-06",
    startTime: "07:30",
    location: "Grodzisko",
    country: "pl",
    category: "Komercja",
    link: "",
    posterUrl: "",
    latitude: 50.005,
    longitude: 19.435,
    version: 0,
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
  },
];
