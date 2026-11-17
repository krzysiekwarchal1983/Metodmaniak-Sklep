import type { ComponentType, ReactNode } from "react";
import { Mail } from "lucide-react";

export const OWNER_EMAIL = "krzysztofwarchal@gmail.com";

export type UpcomingItem = {
  id: string;
  name: string;
  purpose: string;
  Icon: ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
};

export function mailFor(subject: string) {
  return `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

export function UpcomingHero({ eyebrow, title, accent, lead, testId }: { eyebrow: string; title: string; accent: string; lead: string; testId: string }) {
  return (
    <section className="relative overflow-hidden border-b border-white/[.06]">
      <div className="grid-lines absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-lime/10 blur-3xl" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1400px] px-5 pb-14 pt-16 md:px-8 md:pt-24">
        <div className="rise inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/5 px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-lime" aria-hidden="true" />
          <span className="mono-label !text-lime">{eyebrow}</span>
        </div>
        <h1 className="rise mt-6 font-display text-[clamp(3rem,8vw,7rem)] font-black uppercase leading-[.86]" style={{ animationDelay: "100ms" }} data-testid={testId}>
          {title} <span className="text-lime">{accent}</span>
        </h1>
        <p className="rise mt-6 max-w-xl text-base leading-relaxed text-white/75" style={{ animationDelay: "200ms" }}>{lead}</p>
      </div>
    </section>
  );
}

export function UpcomingGrid({ items, subjectPrefix, cta, section }: { items: UpcomingItem[]; subjectPrefix: string; cta: string; section: string }) {
  return (
    <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid={`grid-${section}`}>
      {items.map(({ id, name, purpose, Icon }, i) => (
        <li key={id} className="rise group relative flex flex-col overflow-hidden rounded-3xl border border-white/[.08] bg-[#111410] p-6 transition-colors duration-300 hover:border-lime/40 md:p-8" style={{ animationDelay: `${150 + i * 90}ms` }} data-testid={`card-${section}-${id}`}>
          <div className="flex items-start justify-between">
            <span className="mono-label">0{i + 1}</span>
            <span className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[.14em] text-white/70" data-testid={`status-${section}-${id}`}>W przygotowaniu</span>
          </div>
          <div className="relative my-8 grid h-32 place-items-center" aria-hidden="true">
            <span className="absolute h-28 w-28 rounded-full border border-lime/20 transition-transform duration-500 group-hover:scale-110" />
            <span className="absolute h-20 w-20 rounded-full border border-lime/30" />
            <Icon className="relative h-12 w-12 text-lime" strokeWidth={1.4} />
          </div>
          <h2 className="font-display text-4xl font-black uppercase leading-[.9] transition-colors group-hover:text-lime" data-testid={`text-${section}-name-${id}`}>{name}</h2>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{purpose}</p>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[.14em] text-white/45">Ilustracja poglądowa · nie jest zdjęciem produktu</p>
          <a href={mailFor(`${subjectPrefix}: ${name}`)} className="btn-ghost mt-6 min-h-11 px-5 py-2.5 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime" data-testid={`link-${section}-ask-${id}`}>
            <Mail className="h-4 w-4 text-lime" aria-hidden="true" /> {cta}
          </a>
        </li>
      ))}
    </ol>
  );
}

export function UpcomingNotice({ children, testId }: { children: ReactNode; testId: string }) {
  return (
    <div className="mt-10 rounded-2xl border border-lime/25 bg-lime/5 p-5 text-sm leading-relaxed text-white/80" data-testid={testId}>{children}</div>
  );
}
