import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { BASE } from "@/lib/shop";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function AppInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [instructions, setInstructions] = useState(false);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    const capture = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const complete = () => { setInstalled(true); setPrompt(null); };
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || !!(navigator as Navigator & { standalone?: boolean }).standalone);
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", complete);
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register(`${BASE}/app-sw.js`, { scope: `${BASE}/` }).catch(() => setInstructions(true));
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", complete);
    };
  }, []);
  const install = async () => {
    if (!prompt) { setInstructions((value) => !value); return; }
    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      if (result.outcome === "accepted") setInstalled(true);
    } catch {
      setInstructions(true);
    } finally { setPrompt(null); }
  };
  return (
    <div>
      {installed ? <p role="status" className="text-sm text-lime">Korzystasz z zainstalowanej aplikacji.</p> :
        <button type="button" onClick={() => void install()} aria-expanded={instructions} className="btn-ghost min-h-11 px-5 py-3 text-sm" data-testid="button-install-app">
          {prompt ? <Download className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}{prompt ? "Zainstaluj aplikację" : "Jak zainstalować aplikację"}
        </button>}
      <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">Aplikacja internetowa (PWA), nie plik APK. Działa online; instalacja nie przedłuża okresu próbnego.</p>
      {instructions && <div role="status" className="mt-3 space-y-2 rounded-xl border border-white/15 p-4 text-sm text-white/80" data-testid="app-install-instructions">
        <p><strong>Android / Chrome:</strong> menu przeglądarki → „Zainstaluj aplikację” lub „Dodaj do ekranu głównego”.</p>
        <p><strong>iPhone / Safari:</strong> „Udostępnij” → „Do ekranu początkowego”.</p>
        <p><strong>Komputer:</strong> użyj ikony instalacji w pasku adresu albo opcji instalowania strony w menu Chrome lub Edge.</p>
        <p>Jeśli przeglądarka w podglądzie nie udostępnia instalacji, otwórz tę stronę bezpośrednio w nowej karcie. Możesz też korzystać z aplikacji w przeglądarce.</p>
      </div>}
    </div>
  );
}
