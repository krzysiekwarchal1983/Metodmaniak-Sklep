import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "wouter";
import { Lock, Minus, Plus, ShieldAlert, Trash2, X } from "lucide-react";
import {
  useGetPaymentMethods,
  useQuoteCart,
  useStartCheckout,
  type CartQuote,
  type CheckoutInputProvider,
} from "@workspace/api-client-react";
import { useCart } from "@/lib/cart";
import { ResponsiveImage } from "@/components/responsive-image";
import { asset, formatPLN } from "@/lib/shop";

const FREE = 200;

export function CartDrawer() {
  const { items, open, setOpen, setQty, remove, localSubtotal } = useCart();
  const quote = useQuoteCart();
  const checkout = useStartCheckout();
  const payments = useGetPaymentMethods();
  const [q, setQ] = useState<CartQuote | null>(null);
  const [quoteError, setQuoteError] = useState(false);
  const [provider, setProvider] = useState<string>("");
  const [checkoutMsg, setCheckoutMsg] = useState("");
  const mutateRef = useRef(quote.mutate);
  mutateRef.current = quote.mutate;

  const payload = useMemo(
    () => JSON.stringify(items.map((i) => ({ productId: i.productId, quantity: i.quantity, variant: i.variant }))),
    [items],
  );

  useEffect(() => {
    setQ(null);
    setQuoteError(false);
    if (!open) return;
    let active = true;
    const parsed = JSON.parse(payload);
    if (parsed.length === 0) {
      setQ(null);
      return;
    }
    const t = setTimeout(() => {
      mutateRef.current(
        { data: { items: parsed } },
        { onSuccess: (r) => { if (active) { setQ(r); setQuoteError(false); } }, onError: () => { if (active) setQuoteError(true); } },
      );
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [payload, open]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const subtotal = q?.subtotal ?? localSubtotal;
  const threshold = q?.freeShippingThreshold ?? FREE;
  const remaining = q?.remainingForFreeShipping ?? Math.max(0, threshold - subtotal);
  const pct = Math.min(100, (subtotal / threshold) * 100);
  const methods = payments.data ?? [];
  const anyEnabled = methods.some((m) => m.enabled);
  const selected = methods.find((m) => m.id === provider && m.enabled);
  const lineAvail = (pid: number, variant: string) =>
    q?.items.find((l) => l.product.id === pid && l.variant === variant)?.available ?? true;

  const startCheckout = () => {
    if (!selected) return;
    setCheckoutMsg("");
    checkout.mutate(
      { data: { items: JSON.parse(payload), provider: selected.id as CheckoutInputProvider } },
      {
        onSuccess: (r) => {
          if (r.redirectUrl && /^https:\/\//.test(r.redirectUrl)) window.location.href = r.redirectUrl;
          else setCheckoutMsg("Operator płatności nie zwrócił poprawnego adresu. Zamówienie nie zostało złożone.");
        },
        onError: () => setCheckoutMsg("Płatność nie mogła zostać rozpoczęta. Zamówienie nie zostało złożone."),
      },
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.aside
            className="fixed right-0 top-0 z-[70] flex h-[100dvh] w-full max-w-[460px] flex-col border-l border-white/[.07] bg-[#0e100d]/95 backdrop-blur-xl"
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            aria-label="Koszyk"
            data-testid="panel-cart"
          >
            <div className="flex items-center justify-between px-6 pb-4 pt-6">
              <div>
                <div className="mono-label">Twój koszyk</div>
                <h2 className="font-display text-4xl font-extrabold uppercase leading-none">Na stanowisko</h2>
              </div>
              <button onClick={() => setOpen(false)} className="btn-ghost h-11 w-11" aria-label="Zamknij koszyk" data-testid="button-close-cart"><X className="h-5 w-5" /></button>
            </div>

            <div className="mx-6 rounded-2xl border border-white/[.07] bg-white/[.02] p-4">
              <div className="mb-2 flex justify-between text-xs">
                <span className="font-semibold">{remaining > 0 ? <>Brakuje <span className="text-lime">{formatPLN(remaining)}</span> do darmowej dostawy</> : <span className="text-lime">Darmowa dostawa odblokowana</span>}</span>
                <span className="font-mono text-muted-foreground">{formatPLN(threshold)}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[.06]">
                <motion.div className="h-full rounded-full bg-lime" initial={false} animate={{ width: `${pct}%` }} transition={{ type: "spring", damping: 25 }} data-testid="progress-free-shipping" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <div className="relative h-16 w-16"><span className="absolute inset-0 rounded-full border border-lime/40 ripple" /><span className="absolute inset-[36%] rounded-full bg-lime" /></div>
                  <p className="font-display text-2xl font-extrabold uppercase">Pusty koszyk</p>
                  <p className="max-w-[260px] text-sm text-muted-foreground">Zanim rozłożysz stanowisko, wybierz przynęty. Albo niech dobierze je aplikacja.</p>
                  <div className="flex gap-2">
                    <Link href="/sklep" onClick={() => setOpen(false)} className="btn-lime px-5 py-2.5 text-sm" data-testid="link-cart-shop">Do sklepu</Link>
                    <Link href="/aplikacja" onClick={() => setOpen(false)} className="btn-ghost px-5 py-2.5 text-sm" data-testid="link-cart-app">Dobór przynęty</Link>
                  </div>
                </div>
              ) : (
                <ul className="space-y-3">
                  <AnimatePresence initial={false}>
                    {items.map((i) => {
                      const ok = lineAvail(i.productId, i.variant);
                      return (
                        <motion.li key={`${i.productId}-${i.variant}`} layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }}
                          className={`flex gap-3 rounded-2xl border p-3 ${ok ? "border-white/[.06] bg-white/[.02]" : "border-destructive/40 bg-destructive/5"}`}
                          data-testid={`row-cart-${i.productId}`}
                        >
                          <ResponsiveImage src={asset(i.image)} sizes="80px" alt="" className="h-20 w-20 rounded-xl object-cover" />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex justify-between gap-2">
                              <p className="font-poppins truncate text-sm">{i.name}</p>
                              <button onClick={() => remove(i.productId, i.variant)} className="text-muted-foreground transition-colors hover:text-destructive" aria-label="Usuń" data-testid={`button-remove-${i.productId}`}><Trash2 className="h-4 w-4" /></button>
                            </div>
                            {i.variant && <p className="text-xs text-muted-foreground">{i.variant}</p>}
                            {!ok && <p className="text-xs font-semibold text-destructive">Niedostępne w tej ilości</p>}
                            <div className="mt-auto flex items-center justify-between">
                              <div className="flex items-center rounded-full border border-white/10">
                                <button onClick={() => setQty(i.productId, i.variant, i.quantity - 1)} className="grid h-8 w-8 place-items-center hover:text-lime" aria-label="Mniej" data-testid={`button-dec-${i.productId}`}><Minus className="h-3.5 w-3.5" /></button>
                                <span className="w-7 text-center font-mono text-sm" data-testid={`text-qty-${i.productId}`}>{i.quantity}</span>
                                <button onClick={() => setQty(i.productId, i.variant, i.quantity + 1)} className="grid h-8 w-8 place-items-center hover:text-lime" aria-label="Więcej" data-testid={`button-inc-${i.productId}`}><Plus className="h-3.5 w-3.5" /></button>
                              </div>
                              <span className="font-mono text-sm font-bold">{formatPLN(q?.items.find((line) => line.product.id === i.productId && line.variant === i.variant)?.lineTotal ?? i.price * i.quantity)}</span>
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="space-y-4 border-t border-white/[.07] px-6 py-5">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Produkty</span><span className="font-mono" data-testid="text-subtotal">{formatPLN(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Dostawa</span><span className="font-mono">{q ? (q.shipping === 0 ? "0,00 zł" : formatPLN(q.shipping)) : "—"}</span></div>
                  <div className="flex justify-between pt-1 text-base font-extrabold"><span>Razem</span><span className="font-mono text-lime" data-testid="text-total">{q ? formatPLN(q.total) : formatPLN(subtotal)}</span></div>
                  {quote.isPending && <p className="mono-label">przeliczanie po stronie serwera...</p>}
                  {quoteError && <p className="text-xs text-destructive">Nie udało się zweryfikować koszyka na serwerze.</p>}
                </div>

                <div>
                  <div className="mono-label mb-2">Metoda płatności</div>
                  <div className="grid grid-cols-2 gap-2">
                    {methods.map((m) => (
                      <button key={m.id} disabled={!m.enabled} onClick={() => setProvider(m.id)} title={m.message}
                        className={`rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ${provider === m.id ? "border-lime bg-lime/10" : "border-white/10"} disabled:cursor-not-allowed disabled:opacity-45`}
                        data-testid={`button-provider-${m.id}`}
                      >
                        <span className="block font-bold">{m.name}</span>
                        <span className="text-[10px] text-muted-foreground">{m.enabled ? "dostępna" : "nieaktywna"}</span>
                      </button>
                    ))}
                    {payments.isLoading && Array.from({ length: 4 }).map((_, k) => <div key={k} className="h-12 animate-pulse rounded-xl bg-white/[.04]" />)}
                  </div>
                </div>

                {!anyEnabled && !payments.isLoading && (
                  <div className="flex gap-2.5 rounded-xl border border-lime/25 bg-lime/[.06] p-3 text-xs leading-relaxed text-foreground/90" data-testid="status-payments-disabled">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
                    Płatności online nie są jeszcze skonfigurowane. Nie przyjmujemy zamówień, dopóki operator płatności nie zostanie podłączony. Twój koszyk zostanie zapisany.
                  </div>
                )}
                {checkoutMsg && <p className="text-xs text-destructive" data-testid="status-checkout-error">{checkoutMsg}</p>}

                <button onClick={startCheckout} disabled={!selected || !q?.canCheckout || checkout.isPending} className="btn-lime w-full py-3.5 text-sm" data-testid="button-checkout">
                  <Lock className="h-4 w-4" /> {checkout.isPending ? "Łączenie z operatorem..." : anyEnabled ? "Przejdź do płatności" : "Płatności niedostępne"}
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
