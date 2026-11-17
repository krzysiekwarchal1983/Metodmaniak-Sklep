export const FREE_SHIPPING_THRESHOLD_CENTS = 20000;

export function shippingCostCents(subtotalCents: number): number {
  return subtotalCents === 0 || subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : 1499;
}
