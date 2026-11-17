import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useSearch } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Cloud, MapPin, Wrench, Clapperboard, Download, LogOut, Shirt, Sparkles, Mail, Menu, Phone, Search, ShoppingBag, User, X } from "lucide-react";
import { SiFacebook, SiWhatsapp } from "react-icons/si";
import { Show, useClerk } from "@clerk/react";
import { BrandLink, BrandWordmarkLink } from "@/components/brand";
import { CategoryNav } from "@/components/category-nav";
import { CategoryIcon } from "@/components/category-icon";
import { CookieSettingsLink } from "@/components/cookie-preferences";
import { HeaderSearch } from "@/components/header-search";
import { CartDrawer } from "@/components/cart-drawer";
import { useCart } from "@/lib/cart";
import { BASE, NAV_CATEGORIES } from "@/lib/shop";

const MAIN = [
  { href: "/vblog", label: "Media", Icon: Clapperboard },
  { href: "/aplikacja/narzedzia", label: "Narzędzia", Icon: Wrench },
  { href: "/aplikacja/pogoda", label: "Pogoda", Icon: Cloud },
  { href: "/aplikacja/lowiska", label: "Łowiska", Icon: MapPin },
  { href: "/aplikacja/kalendarz", label: "Kalendarz zawodów", Icon: CalendarDays },
];

const EXTRA = [
  { href: "/nowosci", label: "Nowości", Icon: Sparkles },
  { href: "/merch", label: "Merch", Icon: Shirt },
  { href: "/free", label: "Free", Icon: Download },
];

export const FAMILY_NOTE = "MetodManiak to mała, rodzinna polska firma.";

function CartButton() {
  const { count, setOpen, pulse } = useCart();
  return (
    <button onClick={() => setOpen(true)} className="relative grid h-11 w-11 place-items-center rounded-full border border-white/10 transition-colors hover:border-lime/60" aria-label="Otwórz koszyk" data-testid="button-open-cart">
      <ShoppingBag className="h-[18px] w-[18px]" />
      <AnimatePresence>
        {count > 0 && (
          <motion.span key={pulse} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}
            className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-lime px-1 font-mono text-[10px] font-bold text-[#0f110e]" data-testid="text-cart-count">
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

function AccountButton() {
  const { signOut } = useClerk();
  return (
    <>
      <Show when="signed-out">
        <Link href="/sign-in" className="hidden h-11 items-center gap-2 rounded-full border border-white/10 px-4 text-sm font-semibold transition-colors hover:border-lime/60 sm:flex" data-testid="link-sign-in">
          <User className="h-4 w-4" /> Zaloguj
        </Link>
      </Show>
      <Show when="signed-in">
        <Link href="/admin" className="hidden h-11 items-center rounded-full border border-white/10 px-4 text-sm font-semibold transition-colors hover:border-lime/60 sm:flex" data-testid="link-admin">Panel</Link>
        <button onClick={() => signOut({ redirectUrl: BASE || "/" })} className="hidden h-11 w-11 place-items-center rounded-full border border-white/10 transition-colors hover:border-lime/60 sm:grid" aria-label="Wyloguj" data-testid="button-sign-out">
          <LogOut className="h-4 w-4" />
        </button>
      </Show>
    </>
  );
}

export function Header() {
  const [loc] = useLocation();
  const search = useSearch();
  const selectedCategory = loc === "/sklep" ? new URLSearchParams(search).get("kategoria") : null;
  const selectedSubcategory = loc === "/sklep" ? new URLSearchParams(search).get("pod") : null;
  const [mobile, setMobile] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const shortcutRoot = useRef<HTMLDivElement>(null);
  const searchRoot = useRef<HTMLDivElement>(null);
  const mobileDialog = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const f = () => {
      setScrolled(window.scrollY > 12);
      setMobileSearch(false);
      if (searchRoot.current?.contains(document.activeElement)) (document.activeElement as HTMLElement)?.blur();
    };
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  useEffect(() => { setMobile(false); setMobileSearch(false); setShortcutsOpen(false); }, [loc, search]);
  useEffect(() => {
    if (!shortcutsOpen) return;
    const outside = (event: PointerEvent) => {
      if (!shortcutRoot.current?.contains(event.target as Node)) setShortcutsOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [shortcutsOpen]);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1280px)");
    const changed = () => { if (desktop.matches) { setMobile(false); setMobileSearch(false); } };
    desktop.addEventListener("change", changed);
    return () => desktop.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    if (!mobileSearch) return;
    searchRoot.current?.querySelector("input")?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (!searchRoot.current?.contains(event.target as Node)) setMobileSearch(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileSearch(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [mobileSearch]);
  useEffect(() => {
    if (!mobile) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    mobileDialog.current?.querySelector<HTMLButtonElement>('[data-testid="button-close-mobile"]')?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMobile(false); return; }
      if (event.key !== "Tab") return;
      const controls = Array.from(mobileDialog.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled])") ?? []);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keyboard);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [mobile]);

  return (
    <header className={`relative z-50 transition-colors duration-500 xl:sticky xl:top-0 ${scrolled ? "border-b border-white/[.06] bg-[#0f110e]/75 backdrop-blur-xl" : "bg-transparent"}`}>
      <div className="border-b border-lime/15 bg-[#0f110e]" data-testid="contact-topbar">
        <div className="mx-auto flex h-9 max-w-[1400px] items-center justify-between gap-3 px-5 md:px-8">
          <BrandWordmarkLink />
          <div className="flex shrink-0 items-center gap-2">
            <a href="tel:+48531660877" aria-label="Zadzwoń: 531 660 877" title="531 660 877" className="inline-flex h-7 items-center gap-1.5 rounded-full border border-lime/20 px-2.5 text-xs font-semibold transition-colors hover:border-lime hover:text-lime" data-testid="link-topbar-phone">
              <Phone className="h-3 w-3 text-lime" aria-hidden="true" /><span className="hidden min-[360px]:inline">531 660 877</span>
            </a>
            <a href="https://wa.me/48531660877" target="_blank" rel="noopener noreferrer" aria-label="Napisz na WhatsApp pod numer 531 660 877" className="inline-flex h-7 items-center gap-1.5 rounded-full border border-lime/30 px-2 text-lime transition-colors hover:bg-lime/10 sm:px-2.5" data-testid="link-topbar-whatsapp">
              <SiWhatsapp className="h-4 w-4" aria-hidden="true" /><span className="hidden text-xs font-semibold sm:inline">WhatsApp</span>
            </a>
            <a href="https://www.facebook.com/profile.php?id=61584197146857" target="_blank" rel="noopener noreferrer" aria-label="MetodManiak na Facebooku" title="Facebook"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-lime/30 text-lime transition-colors hover:bg-lime/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime" data-testid="link-topbar-facebook">
              <SiFacebook className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-end gap-4 px-5 md:px-8">
        <nav className="hidden shrink-0 items-center gap-1 xl:flex" aria-label="Menu główne">
          <Link href="/nowosci" className={`relative whitespace-nowrap rounded-full border px-3 py-2 text-sm font-semibold transition-colors hover:border-lime/60 hover:text-lime ${loc.startsWith("/nowosci") ? "border-lime/60 bg-lime/10 text-lime" : "border-white/15"}`} aria-current={loc.startsWith("/nowosci") ? "page" : undefined} data-testid="link-nav-nowosci">
            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-lime" aria-hidden="true" />Nowości</span>
          </Link>
          {NAV_CATEGORIES.map((c) => (
            <CategoryNav key={`${c.slug}-${loc}-${search}`} category={c} active={selectedCategory === c.slug} subcategory={selectedSubcategory} />
          ))}
          {EXTRA.filter((item) => item.href === "/merch").map((m) => {
            const active = loc.startsWith(m.href);
            return (
              <Link key={m.href} href={m.href} className={`relative whitespace-nowrap rounded-full border px-3 py-2 text-sm font-semibold transition-colors hover:border-lime/60 hover:text-lime ${active ? "border-lime/60 bg-lime/10 text-lime" : "border-white/15"}`} aria-current={active ? "page" : undefined} data-testid={`link-nav-${m.href.slice(1)}`}>
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><m.Icon className="h-3.5 w-3.5 shrink-0 text-lime" aria-hidden="true" />{m.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex min-w-0 flex-1 justify-center xl:px-2">
          <div className="hidden w-full justify-center sm:flex"><HeaderSearch /></div>
          <div ref={searchRoot} className="mr-auto sm:hidden">
            <button type="button" onClick={() => { setMobile(false); setMobileSearch((value) => !value); }} aria-label={mobileSearch ? "Zamknij wyszukiwanie" : "Otwórz wyszukiwanie"} aria-expanded={mobileSearch} aria-controls="mobile-header-search" className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-lime" data-testid="button-mobile-search">
              {mobileSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
            {mobileSearch && <div id="mobile-header-search" className="absolute inset-x-0 top-full z-[60] flex justify-center border-b border-white/15 bg-[#0f110e] px-5 py-4" data-testid="panel-mobile-search"><HeaderSearch onSearched={() => setMobileSearch(false)} /></div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AccountButton />
          <CartButton />
          <button onClick={() => { setMobileSearch(false); setMobile(true); }} className="grid h-11 w-11 place-items-center rounded-full border border-white/10 xl:hidden" aria-label="Menu" aria-expanded={mobile} data-testid="button-mobile-menu"><Menu className="h-5 w-5" /></button>
        </div>
      </div>
      <nav className="pointer-events-none absolute left-0 right-0 top-full hidden xl:block" aria-label="Media i Metod Trener">
        <div className="mx-auto flex max-w-[1400px] justify-end px-5 pt-4 md:px-8">
          <div ref={shortcutRoot} className="pointer-events-auto flex w-32 flex-col gap-2" onKeyDown={(event) => {
            if (event.key === "Escape") {
              setShortcutsOpen(false);
              shortcutRoot.current?.querySelector<HTMLButtonElement>("button")?.focus();
            }
          }}>
          {loc !== "/" && (
            <button type="button" onClick={() => setShortcutsOpen((open) => !open)}
              aria-expanded={shortcutsOpen} aria-controls="desktop-shortcut-links"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-[#0f110e]/90 px-4 py-2 text-sm font-semibold backdrop-blur-md hover:border-lime/60 hover:text-lime"
              data-testid="button-shortcuts">
              {shortcutsOpen ? <X className="h-4 w-4 text-lime" /> : <Menu className="h-4 w-4 text-lime" />}
              Skróty
            </button>
          )}
          <div id="desktop-shortcut-links" className={loc === "/" || shortcutsOpen ? "flex flex-col gap-2" : "hidden"}>
          {[...MAIN, ...EXTRA.filter((item) => item.href === "/free")].map(({ href, label, Icon }) => {
            const active = href.startsWith("/?") ? loc === "/" && search === href.split("?")[1].split("#")[0] : loc.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} data-testid={`link-nav-${href.slice(1)}`}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold backdrop-blur-md transition-colors hover:border-lime/60 hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime ${active ? "border-lime/60 bg-lime/10 text-lime" : "border-white/15 bg-[#0f110e]/70"}`}>
                <Icon className="h-3.5 w-3.5 shrink-0 text-lime" aria-hidden="true" />{label}
              </Link>
            );
          })}
          </div>
          </div>
        </div>
      </nav>

      {createPortal(<AnimatePresence>
        {mobile && (
          <motion.div ref={mobileDialog} role="dialog" aria-modal="true" aria-label="Menu główne" className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-[#0d0f0c] px-6 pb-10 pt-5 xl:hidden" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex items-center justify-between">
              <BrandLink />
              <button onClick={() => setMobile(false)} className="btn-ghost h-11 w-11" aria-label="Zamknij menu" data-testid="button-close-mobile"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-6"><HeaderSearch onSearched={() => setMobile(false)} /></div>
            <nav className="mt-6 grid gap-3" aria-label="Kategorie sklepu">
              <Link href="/nowosci" onClick={() => setMobile(false)} className="flex items-center gap-3 rounded-2xl border border-white/15 px-5 py-4 text-2xl font-bold hover:text-lime" data-testid="link-mobile-nowosci">
                <Sparkles className="h-5 w-5 text-lime" aria-hidden="true" />Nowości
              </Link>
              {NAV_CATEGORIES.map((c) => (
                <div key={c.slug} className={`rounded-2xl border px-5 py-4 ${selectedCategory === c.slug ? "border-lime/60 bg-lime/5" : "border-white/15"}`}>
                  <Link href={`/sklep?kategoria=${c.slug}`} onClick={() => setMobile(false)}
                    className="flex items-center gap-3 text-2xl font-bold transition-colors hover:text-lime"
                    aria-current={selectedCategory === c.slug && !selectedSubcategory ? "page" : undefined} data-testid={`link-mobile-cat-${c.slug}`}>
                    <CategoryIcon slug={c.slug} className="h-5 w-5 shrink-0 text-lime" />{c.name}
                  </Link>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.subs.map((sub) => (
                      <Link key={sub} href={`/sklep?kategoria=${c.slug}&pod=${encodeURIComponent(sub)}`} onClick={() => setMobile(false)}
                        className={`rounded-full border px-3 py-2 text-sm transition-colors hover:border-lime hover:text-lime ${selectedCategory === c.slug && selectedSubcategory === sub ? "border-lime/60 text-lime" : "border-white/15 text-muted-foreground"}`}
                        aria-current={selectedCategory === c.slug && selectedSubcategory === sub ? "page" : undefined}
                        data-testid={`link-mobile-${c.slug}-${sub}`}>
                        {sub}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
            <div className="mt-8 grid gap-2">
              {MAIN.map((m) => <Link key={m.href} href={m.href} onClick={() => setMobile(false)} className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-2xl font-bold transition-colors hover:border-lime/60 hover:text-lime ${loc.startsWith(m.href) ? "border-lime/60 bg-lime/10 text-lime" : "border-white/15"}`} aria-current={loc.startsWith(m.href) ? "page" : undefined}><m.Icon className="h-5 w-5 shrink-0 text-lime" aria-hidden="true" />{m.label}</Link>)}
              {EXTRA.filter((item) => item.href !== "/nowosci").map(({ href, label, Icon }) => <Link key={href} href={href} onClick={() => setMobile(false)} className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-2xl font-bold transition-colors hover:border-lime/60 hover:text-lime ${loc.startsWith(href) ? "border-lime/60 bg-lime/10 text-lime" : "border-white/15"}`} aria-current={loc.startsWith(href) ? "page" : undefined} data-testid={`link-mobile-${href.slice(1)}`}><Icon className="h-5 w-5 shrink-0 text-lime" aria-hidden="true" />{label}</Link>)}
              <Show when="signed-out"><Link href="/sign-in" className="mt-4 btn-ghost py-3">Zaloguj się</Link></Show>
              <Show when="signed-in"><Link href="/admin" className="mt-4 btn-ghost py-3">Panel administracyjny</Link></Show>
            </div>
          </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </header>
  );
}

export function Footer({ compactSpacing = false }: { compactSpacing?: boolean }) {
  return (
    <footer className={`relative border-t border-white/[.06] ${compactSpacing ? "mt-0" : "mt-24"}`}>
      <div className="lime-line absolute left-0 right-0 top-0 h-px opacity-40" />
      <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-8">
        <div>
          <BrandLink />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">Method feeder to precyzja podania i tempo łowienia. Przynęty, zanęty i zestawy dobierane do warunków, żeby szybko reagować na brania.</p>
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground" data-testid="text-footer-family">{FAMILY_NOTE}</p>
          <section className="mt-6" aria-labelledby="footer-contact-heading">
            <h2 id="footer-contact-heading" className="mono-label mb-3">Kontakt</h2>
            <address className="space-y-3 text-sm not-italic" data-testid="footer-contact">
              <a href="mailto:krzysztofwarchal@gmail.com" className="flex w-fit max-w-full items-start gap-2.5 rounded-sm transition-colors hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime" data-testid="link-contact-email">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-lime" aria-hidden="true" />
                <span className="break-all">krzysztofwarchal@gmail.com</span>
              </a>
              <a href="tel:+48531660877" className="flex w-fit items-center gap-2.5 rounded-sm transition-colors hover:text-lime focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime" data-testid="link-contact-phone">
                <Phone className="h-4 w-4 shrink-0 text-lime" aria-hidden="true" />
                <span>+48 531 660 877</span>
              </a>
            </address>
          </section>
        </div>
        <div>
          <div className="mono-label mb-4">Sklep</div>
          <ul className="space-y-2 text-sm">{NAV_CATEGORIES.map((c) => <li key={c.slug}><Link href={`/sklep?kategoria=${c.slug}`} className="hover:text-lime">{c.name}</Link></li>)}</ul>
        </div>
        <div>
          <div className="mono-label mb-4">Nad wodą</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/vblog" className="hover:text-lime">Media</Link></li>
            <li><Link href="/aplikacja" className="hover:text-lime">Co wybrać?</Link></li>
            {EXTRA.map(({ href, label }) => <li key={href}><Link href={href} className="hover:text-lime" data-testid={`link-footer-${href.slice(1)}`}>{label}</Link></li>)}
          </ul>
        </div>
        <div>
          <div className="mono-label mb-4">Konto</div>
          <ul className="space-y-2 text-sm">
            <li><Link href="/sign-in" className="hover:text-lime">Logowanie</Link></li>
            <li><Link href="/sign-up" className="hover:text-lime">Rejestracja</Link></li>
            <li><Link href="/admin" className="hover:text-lime">Panel</Link></li>
            <li><Link href="/regulamin" className="hover:text-lime">Regulamin</Link></li>
            <li><Link href="/polityka-prywatnosci" className="hover:text-lime">Polityka prywatności</Link></li>
            <li><Link href="/polityka-cookies" className="hover:text-lime">Polityka cookies</Link></li>
            <li><CookieSettingsLink /></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-2 border-t border-white/[.05] px-5 py-6 text-[11px] text-muted-foreground md:flex-row md:justify-between md:px-8">
        <span>© {new Date().getFullYear()} metodmaniak.pl</span>
        <span data-testid="text-demo-notice">Katalog prezentowany w sklepie ma charakter demonstracyjny. Płatności online nie są jeszcze aktywne.</span>
      </div>
    </footer>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [loc]);
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Header />
      <motion.main key={loc} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }} className="flex-1">
        {children}
      </motion.main>
      <Footer compactSpacing={loc === "/aplikacja/narzedzia" || loc === "/aplikacja/pogoda" || loc === "/aplikacja/lowiska" || loc === "/aplikacja/kalendarz"} />
      <CartDrawer />
    </div>
  );
}
