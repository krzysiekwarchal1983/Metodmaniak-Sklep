import { Link } from "wouter";
import { Lock, Loader2, RefreshCw } from "lucide-react";
import { useAppAccess } from "@/hooks/use-app-access";

/** Inline access status. Never replaces the interface; just explains why actions are disabled. */
export function AccessNotice({ what }: { what: string }) {
  const access = useAppAccess();
  const s = access.data?.status;
  if (s === "active" && !access.isError) return null;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-lime-400/40 bg-lime-400/5 p-4 text-sm sm:flex-row sm:items-center sm:justify-between" role="status" data-testid="status-access-notice">
      <div className="flex items-start gap-3">
        {access.isLoading ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" /> : <Lock className="mt-0.5 h-4 w-4 shrink-0 text-lime-400" />}
        <p>
          {access.isError ? `Nie udało się sprawdzić dostępu — ${what} jest chwilowo zablokowane.`
            : access.isLoading || !s ? "Sprawdzamy dostęp…"
            : s === "signed_out" ? `${what[0].toUpperCase()}${what.slice(1)} wymaga konta. Nowe konto ma 7 dni darmowego dostępu liczonych od rejestracji.`
            : `Twój 7-dniowy dostęp zakończył się — ${what} jest wyłączone. Pogoda, terminarz i łowiska pozostają dostępne.`}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {access.isError && <button type="button" onClick={() => void access.refetch()} className="mm-nav-btn" data-testid="button-retry-access"><RefreshCw className="h-4 w-4" /> Ponów</button>}
        {s === "signed_out" && <>
          <Link href="/sign-up" className="mm-nav-btn bg-lime-400 font-bold text-black" data-testid="link-access-sign-up">Załóż konto</Link>
          <Link href="/sign-in?returnTo=app" className="mm-nav-btn" data-testid="link-access-sign-in">Zaloguj się</Link>
        </>}
        {s === "expired" && <a href="mailto:krzysztofwarchal@gmail.com?subject=Dost%C4%99p%20do%20aplikacji%20MetodManiak" className="mm-nav-btn" data-testid="link-access-contact">Napisz do nas</a>}
      </div>
    </div>
  );
}
