import { CircleDot, Grip, Package, Weight, Wheat, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  waftersy: CircleDot,
  zanety: Wheat,
  pellety: Grip,
  podajniki: Weight,
};

export function CategoryIcon({ slug, className = "h-3.5 w-3.5 shrink-0 text-lime" }: { slug: string; className?: string }) {
  if (slug === "przypony") {
    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="9" cy="4" r="2" /><path d="M9 6v9a5 5 0 0 0 10 0V9l-3 3" />
    </svg>;
  }
  const Icon = ICONS[slug] ?? Package;
  return <Icon className={className} aria-hidden="true" focusable="false" />;
}
