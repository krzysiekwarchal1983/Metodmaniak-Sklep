import { motion, useReducedMotion } from "framer-motion";
import { Check, Gift, KeyRound, Truck } from "lucide-react";

const TIERS = [
  { amount: 100, Icon: KeyRound, benefits: ["Kod do aplikacji gratis na rok"] },
  { amount: 200, Icon: Truck, benefits: ["Kod do aplikacji gratis na rok", "Darmowa wysyłka"] },
  { amount: 300, Icon: Gift, benefits: ["Kod do aplikacji gratis na rok", "Darmowa wysyłka", "Prezent gratis"] },
];

export function OrderAppOffer() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="w-full min-w-0 max-w-5xl text-left md:mt-7" data-testid="hero-app-year-offer">
      <div className="grid gap-2 md:grid-cols-3 md:gap-3" role="list" aria-label="Korzyści dla zamówień od 100, 200 i 300 zł">
        {TIERS.map(({ amount, Icon, benefits }, index) => (
          <div key={amount} role="listitem" className="relative min-w-0 overflow-hidden rounded-2xl border border-lime/30 bg-[#11170e]/60 p-3 shadow-[0_0_30px_-20px_hsl(var(--brand-fluo-hsl)/.5)] md:min-h-44 md:p-4" data-testid={`order-offer-${amount}`}>
            {!reduceMotion && <motion.span aria-hidden="true" className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-lime/10 to-transparent"
              animate={{ left: ["-35%", "135%"] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 5, delay: index * 0.7, ease: "easeInOut" }} />}
            <div className="relative flex items-center gap-2 md:gap-3">
              <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-lime/25 bg-lime/10 text-lime md:h-10 md:w-10 md:rounded-xl"><Icon className="h-4 w-4 md:h-5 md:w-5" /></span>
              <div className="min-w-0"><p className="text-[10px] text-white/75 md:text-[11px] md:text-white/65">Zamówienie od</p><p className="whitespace-nowrap font-mono text-xl font-bold leading-tight text-lime md:text-2xl">{amount} zł</p></div>
            </div>
            <ul className="relative mt-3 space-y-1.5 text-xs font-medium leading-relaxed md:mt-4 md:space-y-2 md:text-sm md:leading-snug">
              {benefits.map((benefit) => <li key={benefit} className="flex items-start gap-1.5 md:gap-2"><Check aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0 text-lime md:h-4 md:w-4" /><span className="min-w-0">{benefit}</span></li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
