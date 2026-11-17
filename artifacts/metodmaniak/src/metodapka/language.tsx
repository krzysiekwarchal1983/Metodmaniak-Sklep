import { createContext, useContext, useState, type ReactNode } from "react";
import type { Language } from "./lib/i18n";

// Adapted from the original LanguageContext. No IP lookup: language is a plain UI preference.
interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  isDetecting: boolean;
}

export const VALID_LANGUAGES: Language[] = ["pl", "en", "de", "fr", "cs", "hu", "ro"];
const KEY = "metodapka-language";

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(KEY);
      return VALID_LANGUAGES.includes(saved as Language) ? (saved as Language) : "pl";
    } catch {
      return "pl";
    }
  });
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try { localStorage.setItem(KEY, lang); } catch { /* preference only */ }
  };
  return <LanguageContext.Provider value={{ language, setLanguage, isDetecting: false }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
