import { useState } from "react";
import { Pause, Play } from "lucide-react";

const ITEMS = [
  "Waftersy 6 / 8 / 10 mm",
  "Zanęty komercyjne i PZW",
  "Pellet 1 – 8 mm",
  "Przypony 10 / 15 / 30 cm",
  "Karp · Leszcz · Karaś · Lin",
  "Darmowa dostawa od 200 zł",
];

export function CatalogueTicker() {
  const [running, setRunning] = useState(true);
  const label = running ? "Wstrzymaj przewijanie paska" : "Włącz przewijanie paska";

  return (
    <div className="flex overflow-hidden border-y border-white/[.06] bg-black/20" data-testid="catalogue-ticker">
      <div className="min-w-0 flex-1 overflow-hidden py-2.5">
        <div className="font-poppins flex w-max whitespace-nowrap text-[13px] leading-5 text-white/80 sm:text-sm"
          // Explicit site-owner request: start automatically, with an accessible pause control.
          style={{ animation: "catalogue-ticker 28s linear infinite", animationPlayState: running ? "running" : "paused" }}>
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy === 1 ? true : undefined} className="flex min-w-[100vw] shrink-0 items-center justify-between gap-8 pr-8">
              {ITEMS.map((item) => (
                <span key={item} className="flex items-center gap-8">{item}<span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-lime/70" /></span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <button type="button" onClick={() => setRunning((value) => !value)} aria-label={label} title={label}
        className="flex w-10 shrink-0 items-center justify-center border-l border-white/[.06] text-lime transition-colors hover:bg-lime/10 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-lime"
        data-testid="button-toggle-ticker">
        {running ? <Pause aria-hidden="true" className="h-3.5 w-3.5" /> : <Play aria-hidden="true" className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
