import { Link } from "wouter";
import { ArrowRight, Sparkles } from "lucide-react";
import { AppInstall } from "@/components/app-install";

export function AppTrialCard() {
  return (
    <section className="my-8 rounded-3xl border border-lime/25 bg-lime/[.04] p-6 md:p-8" aria-labelledby="app-trial-title" data-testid="section-app-trial">
      <div className="mb-3 flex items-center gap-2 text-lime"><Sparkles className="h-5 w-5" /><span className="mono-label">Bez logowania</span></div>
      <h2 id="app-trial-title" className="font-display text-4xl font-bold uppercase md:text-5xl">Metod Trener <span className="text-lime">i narzędzia.</span></h2>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Korzystaj z zaleceń, pogody i narzędzi strony bez konta. Wybierz miejscowość oraz typ łowiska, aby przygotować zestaw na wyjazd.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href="/?strefa=trener#metodapka" className="btn-lime min-h-11 px-5 py-3 text-sm" data-testid="link-trial-open">Otwórz Metod Trener <ArrowRight className="h-4 w-4" /></Link>
        <Link href="/aplikacja/narzedzia" className="btn-ghost min-h-11 px-5 py-3 text-sm">Otwórz narzędzia</Link>
      </div>
      <div className="mt-4"><AppInstall /></div>
    </section>
  );
}
