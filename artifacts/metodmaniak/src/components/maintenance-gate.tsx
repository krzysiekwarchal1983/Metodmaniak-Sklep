import { useState, type ReactNode } from "react";
import { Lock, LogOut } from "lucide-react";
import { SignIn, useClerk, useUser } from "@clerk/react";
import { HeroBackground } from "@/components/hero-background";
import { asset } from "@/lib/shop";

const OWNER_EMAILS = new Set([
  "krzysiekwarchal@gmail.com",
  "krzysztofwarchal@gmail.com",
]);

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [showLogin, setShowLogin] = useState(false);

  if (!isLoaded) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-[#0f110e] text-[#e8eedd]">
        <img
          src={asset("/brand/symbol.png")}
          alt="MetodManiak"
          className="h-16 w-16 animate-pulse object-contain"
        />
      </div>
    );
  }

  const email = (user?.primaryEmailAddress?.emailAddress ?? "").trim().toLowerCase();
  const isOwner = Boolean(isSignedIn && email && OWNER_EMAILS.has(email));

  if (isOwner) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col justify-between overflow-hidden bg-[#0f110e] text-[#e8eedd]"
      data-testid="maintenance-gate"
    >
      <HeroBackground />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0f110e]/85 via-[#0f110e]/70 to-[#0f110e]/95" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0f110e_85%)]" />

      <header className="relative z-10 mx-auto flex w-full max-w-[1400px] items-center justify-between px-6 pt-8 md:px-10">
        <div className="flex items-center gap-3">
          <img
            src={asset("/brand/symbol.png")}
            alt="MetodManiak"
            className="h-10 w-10 object-contain"
          />
          <img
            src={asset("/brand/wordmark-topbar.png")}
            alt="MetodManiak"
            className="h-5 object-contain"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowLogin((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#0f110e]/80 px-4 py-2 text-xs font-semibold text-white/80 backdrop-blur-md transition-colors hover:border-lime/60 hover:text-lime"
          data-testid="button-owner-login-toggle"
        >
          <Lock className="h-3.5 w-3.5 text-lime" />
          {showLogin ? "Ukryj logowanie" : "Logowanie właściciela"}
        </button>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <span className="mono-label rounded-full border border-lime/30 bg-lime/10 px-4 py-1.5 !text-lime">
          Strona w przygotowaniu
        </span>

        <h1 className="mt-6 font-display text-[clamp(2.75rem,8vw,6.5rem)] font-black uppercase leading-[0.9] tracking-tight">
          MetodManiak w czasie prac...
          <span className="mt-3 block text-lime">Będziemy wkrótce.</span>
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 md:text-lg">
          Przygotowujemy nową odsłonę sklepu wędkarskiego Method Feeder, autorskich przynęt oraz aplikacji MetodApka. Zapraszamy już niedługo!
        </p>

        {isSignedIn && !isOwner && (
          <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-lime/30 bg-[#151813]/90 p-5 text-sm">
            <p className="text-white/85">
              Zalogowano jako <strong className="text-lime">{email}</strong>. Dostęp roboczy do sklepu ma obecnie wyłącznie właściciel.
            </p>
            <button
              type="button"
              onClick={() => void signOut({ redirectUrl: "/" })}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold hover:border-lime/60 hover:text-lime"
            >
              <LogOut className="h-3.5 w-3.5" /> Wyloguj i przełącz konto
            </button>
          </div>
        )}

        {showLogin && !isSignedIn && (
          <div className="mt-10 w-full flex justify-center">
            <SignIn fallbackRedirectUrl="/" />
          </div>
        )}
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-[1400px] items-center justify-center border-t border-white/10 px-6 py-6 text-xs text-white/50">
        © {new Date().getFullYear()} metodmaniak.pl · Kosz pełen emocji
      </footer>
    </div>
  );
}
