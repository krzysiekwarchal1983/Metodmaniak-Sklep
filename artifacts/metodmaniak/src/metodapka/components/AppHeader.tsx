import { useEffect, useState } from "react";
import { Navigation, X, Calendar, Cloud, Home, MapPin, Wrench, User, Languages } from "lucide-react";
import { Link } from "wouter";
import { UserButton, useUser } from "@clerk/react";
import { LocationPicker } from "@/components/weather/location-picker";
import { useWeatherLocation } from "@/components/weather/weather-location";
import { useLanguage, VALID_LANGUAGES } from "../language";
import { useTranslations, type Language } from "../lib/i18n";

export type AppSection = "home" | "pogoda" | "kalendarz" | "lowiska" | "narzedzia";

const L = (lang: Language, m: Record<string, string>) => m[lang] ?? m.en;
const LANG_NAMES: Record<Language, string> = { pl: "Polski", en: "English", de: "Deutsch", fr: "Français", cs: "Čeština", hu: "Magyar", ro: "Română" };

/** Location and navigation for the embedded application. */
export default function AppHeader({ section }: { section: AppSection }) {
  const { language, setLanguage } = useLanguage();
  const t = useTranslations(language);
  const { loc, geo, locate, pick, selectionVersion } = useWeatherLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [selectionVersion]);
  const { isSignedIn, user } = useUser();
  const cur = (s: AppSection) => (section === s ? "page" : undefined);

  return (
    <header className="mm-header rounded-2xl border border-border" data-testid="metodapka-header">
      <div className="mx-auto max-w-4xl px-4 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex justify-center">
            <div className="w-full max-w-sm space-y-1">
              <div className="flex items-center justify-center gap-2 text-base font-medium">
                <MapPin className="h-4 w-4" />
                {t.header.selectLocation}
              </div>
              <div className="flex gap-2">
                <div className="flex min-h-10 flex-1 flex-col justify-center rounded-md border border-border bg-background/60 px-3 py-1.5 text-sm" data-testid="text-app-location">
                  {loc ? <><span className="font-bold leading-tight">{loc.label}</span><span className="text-xs text-muted-foreground">{loc.latitude.toFixed(2)}, {loc.longitude.toFixed(2)}</span></> : <span className="text-muted-foreground">{t.header.selectCity}</span>}
                </div>
                <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mm-nav-btn" data-testid="button-change-location">
                  {open ? <X className="h-4 w-4" /> : <Navigation className="h-4 w-4" />}<span className="sr-only sm:not-sr-only">{open ? "Zamknij" : loc ? "Zmień" : "Wybierz"}</span>
                </button>
              </div>
            </div>
          </div>
          {open && <div data-testid="panel-location-picker"><LocationPicker geoStatus={geo} onLocate={locate} onPick={pick} compact /></div>}

          <div className="flex flex-col items-center gap-2">
            <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="MetodApka">
              <Link href="/aplikacja" className="mm-nav-btn mm-nav-icon" aria-current={cur("home")} aria-label={L(language, { pl: "Start aplikacji", en: "App home", de: "Startseite", fr: "Accueil", cs: "Domů", hu: "Főoldal", ro: "Acasă" })} data-testid="button-home">
                <Home className="h-4 w-4" />
              </Link>
              <Link href="/aplikacja/narzedzia" className="mm-nav-btn" aria-current={cur("narzedzia")} data-testid="button-tools">
                <Wrench className="h-4 w-4" strokeWidth={2.5} />
                <span>{L(language, { pl: "Narzędzia", en: "Tools", de: "Werkzeuge", fr: "Outils", cs: "Nástroje", hu: "Eszközök", ro: "Instrumente" })}</span>
              </Link>
              <Link href="/aplikacja/pogoda" className="mm-nav-btn" aria-current={cur("pogoda")} data-testid="button-weather">
                <Cloud className="h-4 w-4" />
                <span>{t.weather.title}</span>
              </Link>
              <Link href="/aplikacja/kalendarz" className="mm-nav-btn" aria-current={cur("kalendarz")} data-testid="button-calendar">
                <Calendar className="h-4 w-4" />
                <span>{L(language, { pl: "Terminarz", en: "Calendar", de: "Kalender", fr: "Calendrier", cs: "Kalendář", hu: "Naptár", ro: "Calendar" })}</span>
              </Link>
              <Link href="/aplikacja/lowiska" className="mm-nav-btn" aria-current={cur("lowiska")} data-testid="button-fisheries">
                <MapPin className="h-4 w-4" />
                <span>{L(language, { pl: "Łowiska", en: "Fisheries", de: "Gewässer", fr: "Pêcheries", cs: "Revíry", hu: "Horgászhelyek", ro: "Bălți" })}</span>
              </Link>
              {isSignedIn ? (
                <span className="grid h-10 w-10 place-items-center" data-testid="button-account"><UserButton /></span>
              ) : (
                <Link href="/sign-in?returnTo=app" className="mm-nav-btn" data-testid="button-login">
                  <User className="h-4 w-4" />
                  <span>{L(language, { pl: "Zaloguj", en: "Sign in", de: "Anmelden", fr: "Connexion", cs: "Přihlásit", hu: "Belépés", ro: "Autentificare" })}</span>
                </Link>
              )}
              <label className="mm-nav-btn relative cursor-pointer" title="Język / Language">
                <Languages className="h-4 w-4" />
                <span className="sr-only">Język</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="cursor-pointer bg-transparent text-sm font-semibold uppercase outline-none"
                  data-testid="select-language"
                >
                  {VALID_LANGUAGES.map((l) => <option key={l} value={l} className="bg-card text-foreground">{LANG_NAMES[l]}</option>)}
                </select>
              </label>
            </nav>
            {isSignedIn && user?.firstName && (
              <div className="text-center font-medium text-lime-400" data-testid="greeting-user">
                {L(language, { pl: "Cześć", en: "Hi", de: "Hallo", fr: "Salut", cs: "Ahoj", hu: "Szia", ro: "Salut" })}, {user.firstName}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
