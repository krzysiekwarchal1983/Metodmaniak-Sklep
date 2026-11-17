import { Router, type IRouter } from "express";
import { inArray } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { QuoteCartBody, QuoteCartResponse, StartCheckoutBody, GetPaymentMethodsResponse } from "@workspace/api-zod";
import { serializeProduct } from "../lib/catalogue";
import { paymentMethods } from "../lib/payments";
import { FREE_SHIPPING_THRESHOLD_CENTS, shippingCostCents } from "../lib/shipping";

const router: IRouter = Router();
router.post("/cart/quote", async (req, res): Promise<void> => {
  const parsed = QuoteCartBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Nieprawidłowa zawartość koszyka." }); return; }
  const { items } = parsed.data;
  const ids = [...new Set(items.map((i) => i.productId))];
  const rows = ids.length ? await db.select().from(productsTable).where(inArray(productsTable.id, ids)) : [];
  if (rows.length !== ids.length) { res.status(409).json({ error: "Produkt z koszyka nie jest już dostępny. Usuń go i spróbuj ponownie." }); return; }
  const totals = new Map<number, number>();
  items.forEach((i) => totals.set(i.productId, (totals.get(i.productId) || 0) + i.quantity));
  let subtotalCents = 0;
  const lines = items.map((i) => {
    const p = rows.find((r) => r.id === i.productId)!;
    const available = (totals.get(p.id) || 0) <= p.stock && (p.variants.length ? p.variants.includes(i.variant) : i.variant === "");
    const lineCents = p.priceCents * i.quantity;
    subtotalCents += lineCents;
    return { product: serializeProduct(p), quantity: i.quantity, variant: i.variant, available, lineTotal: lineCents / 100 };
  });
  const shippingCents = shippingCostCents(subtotalCents);
  res.json(QuoteCartResponse.parse({
    items: lines, subtotal: subtotalCents / 100, shipping: shippingCents / 100,
    total: (subtotalCents + shippingCents) / 100, freeShippingThreshold: FREE_SHIPPING_THRESHOLD_CENTS / 100,
    remainingForFreeShipping: Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents) / 100,
    canCheckout: lines.length > 0 && lines.every((l) => l.available),
  }));
});
router.get("/payment-methods", (_req, res): void => { res.json(GetPaymentMethodsResponse.parse(paymentMethods)); });
router.post("/checkout", (req, res): void => {
  const parsed = StartCheckoutBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Sprawdź dane koszyka i sposób płatności." }); return; }
  res.status(503).json({ error: "Płatności online nie są jeszcze uruchomione. Nie utworzono zamówienia i nie pobrano środków." });
});
export default router;
