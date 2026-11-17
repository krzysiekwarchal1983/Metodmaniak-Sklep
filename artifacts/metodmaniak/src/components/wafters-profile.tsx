import { ArrowDown, ArrowUp, Cloud, CloudRain, Fish, Leaf, Sprout, Sun } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { getWaftersProfile } from "@/lib/wafters-profile";

const WEATHER_ICONS = { sun: Sun, cloud: Cloud, rain: CloudRain };
const tile = "flex min-w-0 flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[.025] px-1.5 py-2.5 text-center";
const icons = "flex h-5 items-center justify-center gap-1 text-lime";

export function WaftersProfile({ product }: { product: { category: string; subcategory: string; color: string } }) {
  const profile = getWaftersProfile(product);
  if (!profile) return null;
  return (
    <ul className="grid min-w-0 flex-1 basis-80 grid-cols-4 gap-1.5 text-xs leading-snug" aria-label="Wskazówki doboru waftersa" data-testid="wafters-profile">
      <li className={tile} title={`Poziom naświetlenia: ${profile.weatherLabel}`} data-testid="wafters-profile-weather">
        <span className="text-[10px] text-muted-foreground">Światło</span>
        <span className={icons} aria-hidden="true">{profile.weather.map((w) => { const Icon = WEATHER_ICONS[w]; return <Icon key={w} className="h-4 w-4" />; })}</span>
        <span className="break-words font-medium">{profile.weatherLabel}</span>
      </li>
      <li className={tile} title={`Najlepsza pora roku: ${profile.seasonLabel}`} data-testid="wafters-profile-season">
        <span className="text-[10px] text-muted-foreground">Sezon</span>
        <span className={icons} aria-hidden="true">{profile.season === "spring-autumn" ? <><Sprout className="h-4 w-4" /><Leaf className="h-4 w-4" /></> : <Sun className="h-5 w-5" />}</span>
        <span className="font-medium">{profile.seasonLabel}</span>
      </li>
      <li className={tile} title={`Orientacyjnie: ${profile.weightLabel}`} data-testid="wafters-profile-fish">
        <span className="text-[10px] text-muted-foreground">Ryby</span>
        <span className={icons} aria-hidden="true"><Fish className="h-5 w-5" />{profile.weightDirection === "down" && <ArrowDown className="h-3.5 w-3.5" />}{profile.weightDirection === "up" && <ArrowUp className="h-3.5 w-3.5" />}</span>
        <span className="font-medium"><span className="sr-only">{profile.weightDirection === "down" ? "do " : profile.weightDirection === "up" ? "powyżej " : ""}</span>{profile.weight}</span>
      </li>
      <li className={tile} title={`Haczyk ${profile.hookSize}, ${profile.wire.toLowerCase()}`} data-testid="wafters-profile-hook">
        <span className="text-[10px] text-muted-foreground">Haczyk</span>
        <span className={icons}><CategoryIcon slug="przypony" className="h-5 w-5" /></span>
        <span className="font-semibold">{profile.hookSize}</span>
        <span className="text-[10px] text-muted-foreground">{profile.wire}</span>
      </li>
    </ul>
  );
}
