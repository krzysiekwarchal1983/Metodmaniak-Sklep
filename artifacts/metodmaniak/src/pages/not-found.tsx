import { Link } from "wouter";
import { usePageMeta } from "@/lib/shop";

export default function NotFound() {
  usePageMeta("Nie znaleziono", "Ta strona nie istnieje.");
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-[1400px] flex-col justify-center px-5 md:px-8">
      <div className="mono-label mb-4">Błąd 404</div>
      <h1 className="font-display text-[clamp(4rem,14vw,12rem)] font-black uppercase leading-[.8]">Zerwany<br /><span className="text-lime">zestaw.</span></h1>
      <p className="mt-6 max-w-md text-muted-foreground">Ta strona odpłynęła. Sprawdź adres albo wróć na pewne łowisko.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn-lime px-6 py-3 text-sm" data-testid="link-404-home">Strona główna</Link>
        <Link href="/sklep" className="btn-ghost px-6 py-3 text-sm">Sklep</Link>
      </div>
    </div>
  );
}
