import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`relative overflow-hidden rounded-2xl bg-white/[.04] ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[marquee_1.6s_linear_infinite] bg-gradient-to-r from-transparent via-white/[.05] to-transparent" />
  </div>;
}

export function ProductGridSkeleton({ n = 8 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="space-y-3">
          <SkeletonBlock className="aspect-[4/5]" />
          <SkeletonBlock className="h-4 w-3/4" />
          <SkeletonBlock className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ title = "Coś nie zagrało", text = "Nie udało się pobrać danych z serwera.", onRetry }: { title?: string; text?: string; onRetry?: () => void }) {
  return (
    <div className="glass flex flex-col items-center gap-4 rounded-3xl px-6 py-14 text-center" data-testid="status-error">
      <div className="relative h-14 w-14">
        <span className="absolute inset-0 rounded-full border border-destructive/50 ripple" />
        <span className="absolute inset-3 rounded-full bg-destructive/80" />
      </div>
      <h3 className="font-display text-3xl font-extrabold uppercase">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{text}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost px-5 py-2.5 text-sm" data-testid="button-retry">
          <RotateCcw className="h-4 w-4" /> Spróbuj ponownie
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="glass relative flex flex-col items-center gap-4 overflow-hidden rounded-3xl px-6 py-16 text-center" data-testid="status-empty">
      <div className="relative h-20 w-20">
        <span className="absolute inset-0 rounded-full border border-lime/40 ripple" />
        <span className="absolute inset-0 rounded-full border border-lime/30 ripple" style={{ animationDelay: "1.1s" }} />
        <span className="absolute inset-[34%] rounded-full bg-lime bob" />
      </div>
      <h3 className="font-display text-3xl font-extrabold uppercase">{title}</h3>
      <p className="max-w-md text-sm text-muted-foreground">{text}</p>
      {children}
    </div>
  );
}

export function SectionHead({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="font-display text-5xl font-extrabold uppercase leading-[.9] md:text-6xl">{title}</h2>
      </div>
      {children}
    </div>
  );
}
