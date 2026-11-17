import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Cookie, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const KEY = "metodmaniak-cookie-preferences";
const VERSION = 1;
const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
type Preferences = { version: number; essential: true; externalMedia: boolean; analytics: false; marketing: false; savedAt: number };
function read(): Preferences | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null") as Preferences | null;
    return value?.version === VERSION && value.essential === true && typeof value.externalMedia === "boolean" &&
      typeof value.savedAt === "number" && value.savedAt <= Date.now() && Date.now() - value.savedAt < MAX_AGE
      ? value : null;
  } catch { return null; }
}
const Context = createContext<{ externalMedia: boolean; openSettings: () => void; allowMedia: () => void } | null>(null);
export function useCookiePreferences() {
  const value = useContext(Context);
  if (!value) throw new Error("CookiePreferencesProvider is required.");
  return value;
}
export function CookieSettingsLink() {
  const { openSettings } = useCookiePreferences();
  return <button type="button" onClick={openSettings} className="text-left hover:text-lime" data-testid="button-cookie-settings">Ustawienia cookies</button>;
}

export function CookiePreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences | null>(read);
  const [settings, setSettings] = useState(false);
  const [mediaChoice, setMediaChoice] = useState(preferences?.externalMedia ?? false);
  const [storageWarning, setStorageWarning] = useState(false);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== KEY && event.key !== null) return;
      const value = read();
      setPreferences(value);
      setMediaChoice(value?.externalMedia ?? false);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const save = (externalMedia: boolean) => {
    const value: Preferences = { version: VERSION, essential: true, externalMedia, analytics: false, marketing: false, savedAt: Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(value)); setStorageWarning(false); }
    catch { setStorageWarning(true); }
    setPreferences(value);
    setMediaChoice(externalMedia);
    setSettings(false);
  };
  const openSettings = () => { setMediaChoice(preferences?.externalMedia ?? false); setSettings(true); };
  return (
    <Context.Provider value={{ externalMedia: preferences?.externalMedia ?? false, openSettings, allowMedia: () => save(true) }}>
      {children}
      {!preferences && (
        <section aria-label="Informacja o cookies" className="fixed inset-x-3 bottom-[max(.75rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-5xl rounded-2xl border border-lime/25 bg-[#11140f]/[.98] p-3 shadow-2xl backdrop-blur-xl sm:inset-x-5 sm:p-5" data-testid="cookie-banner">
          <h2 className="flex items-center gap-2 text-sm font-bold sm:text-base"><Cookie aria-hidden="true" className="h-4 w-4 text-lime" /> Twoja prywatność</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/80 sm:text-sm">Używamy niezbędnych cookies. YouTube tylko za zgodą.<span className="hidden sm:inline"> Odsłony zliczamy anonimowo, bez identyfikatorów i reklam. Ustawienia zmienisz w stopce.</span></p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button type="button" onClick={() => save(false)} className="btn-ghost min-h-11 px-3 py-2 text-xs" data-testid="button-cookies-necessary">Tylko niezbędne</button>
            <button type="button" onClick={() => save(true)} className="btn-ghost min-h-11 px-3 py-2 text-xs" data-testid="button-cookies-all">Akceptuj wszystkie</button>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-[11px]">
            <button type="button" onClick={openSettings} className="min-h-8 rounded px-1 text-lime underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime" data-testid="button-cookies-customize">Ustawienia</button>
            <Link href="/polityka-cookies" className="inline-flex min-h-8 items-center text-lime underline underline-offset-4">Polityka cookies</Link>
            <Link href="/polityka-prywatnosci" className="inline-flex min-h-8 items-center text-lime underline underline-offset-4">Prywatność</Link>
          </div>
        </section>
      )}
      {storageWarning && <p role="status" className="fixed bottom-3 right-3 z-40 max-w-sm rounded-xl border border-lime/30 bg-[#11140f] p-3 text-xs">Przeglądarka zablokowała zapis ustawień. Twój wybór działa tylko do ponownego otwarcia strony.</p>}
      <Dialog open={settings} onOpenChange={setSettings}>
        <DialogContent className="rounded-2xl border-lime/25 bg-[#11140f]">
          <DialogHeader><DialogTitle>Ustawienia prywatności</DialogTitle><DialogDescription>Opcjonalne usługi są domyślnie wyłączone. Wybór możesz zmienić w stopce strony.</DialogDescription></DialogHeader>
          <div className="rounded-xl border border-white/10 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-lime" /> Niezbędne — zawsze aktywne</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Sesja logowania, bezpieczeństwo, koszyk i zapamiętanie ustawień. Nie służą do reklamy.</p>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 p-4">
            <input type="checkbox" checked={mediaChoice} onChange={(event) => setMediaChoice(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-lime" data-testid="checkbox-external-media" />
            <span><span className="text-sm font-semibold">Zewnętrzne multimedia · YouTube</span><span className="mt-2 block text-xs leading-relaxed text-muted-foreground">Pozwól na osadzony odtwarzacz YouTube. Może przekazywać dane urządzenia do Google i korzystać z pamięci przeglądarki. Bez zgody nadal możesz przeglądać serwis.</span></span>
          </label>
          <p className="text-xs text-muted-foreground">Nie stosujemy analitycznych ani reklamowych cookies. Anonimowy licznik zapisuje tylko dzień, publiczną podstronę i liczbę odsłon — bez adresu IP, identyfikatora użytkownika i fraz wyszukiwania. Respektujemy sygnały Do Not Track i Global Privacy Control. Wybór zapisujemy na 180 dni.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => save(false)} className="btn-ghost px-4 py-2.5 text-xs">Odrzuć opcjonalne</button>
            <button type="button" onClick={() => save(mediaChoice)} className="btn-lime px-4 py-2.5 text-xs" data-testid="button-cookies-save">Zapisz wybrane</button>
          </div>
        </DialogContent>
      </Dialog>
    </Context.Provider>
  );
}
