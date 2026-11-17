import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@workspace/api-client-react";

export interface CartItem {
  productId: number;
  quantity: number;
  variant: string;
  name: string;
  price: number;
  image: string;
}

interface CartCtx {
  items: CartItem[];
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (p: Product, variant: string, qty?: number) => void;
  setQty: (productId: number, variant: string, qty: number) => void;
  remove: (productId: number, variant: string) => void;
  clear: () => void;
  count: number;
  localSubtotal: number;
  pulse: number;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "metodmaniak.cart.v1";

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((i) => typeof i?.productId === "number" && typeof i?.quantity === "number")
      : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(load);
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const add = useCallback((p: Product, variant: string, qty = 1) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.productId === p.id && x.variant === variant);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: Math.min(100, next[i].quantity + qty) };
        return next;
      }
      return [...prev, { productId: p.id, variant, quantity: qty, name: p.name, price: p.price, image: p.image }];
    });
    setPulse((n) => n + 1);
    setOpen(true);
  }, []);

  const setQty = useCallback((productId: number, variant: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((x) => !(x.productId === productId && x.variant === variant))
        : prev.map((x) => (x.productId === productId && x.variant === variant ? { ...x, quantity: Math.min(100, qty) } : x)),
    );
  }, []);

  const remove = useCallback((productId: number, variant: string) => {
    setItems((prev) => prev.filter((x) => !(x.productId === productId && x.variant === variant)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      open,
      setOpen,
      add,
      setQty,
      remove,
      clear,
      pulse,
      count: items.reduce((s, i) => s + i.quantity, 0),
      localSubtotal: items.reduce((s, i) => s + i.quantity * i.price, 0),
    }),
    [items, open, add, setQty, remove, clear, pulse],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside CartProvider");
  return c;
}
