import type { AdminOrderInput } from "@workspace/api-zod";
import type { OrderRow, OrderItemRow } from "@workspace/db";

export class OrderInputError extends Error {}

export function orderTotalCents(total: number): number {
  const cents = Math.round(total * 100);
  if (!Number.isFinite(total) || total < 0 || total > 1_000_000 || Math.abs(total * 100 - cents) > 0.000001) {
    throw new OrderInputError("Podaj kwotę od 0 do 1 000 000 zł, z maksymalnie dwoma miejscami po przecinku.");
  }
  return cents;
}

export function manualOrderValues(input: AdminOrderInput) {
  const customerName = input.customerName.trim();
  const customerContact = input.customerContact.trim();
  const details = input.details.trim();
  if (!customerName || !details) throw new OrderInputError("Wpisz nazwę odbiorcy i opis zamówienia.");
  if ([customerName, customerContact, details].some((value) => value.includes("\0"))) throw new OrderInputError("Dane zawierają niedozwolony znak.");
  return { customerName, customerContact, details, totalCents: orderTotalCents(input.total) };
}

export function normalizeTrackingNumber(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length > 120 || /[\u0000-\u001f\u007f]/.test(trimmed)) throw new OrderInputError("Numer listu musi mieścić się w jednej linii i mieć do 120 znaków.");
  return trimmed;
}

export function serializeOrder(row: OrderRow, items: OrderItemRow[] = []) {
  return {
    id: row.id, number: `MM-${String(row.id).padStart(6, "0")}`,
    customerName: row.customerName, customerContact: row.customerContact, details: row.details,
    customerId: row.customerId,
    total: row.totalCents / 100, status: row.status, trackingNumber: row.trackingNumber, isDemo: row.isDemo,
    version: row.version, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
    items: items.map((item) => ({ productId: item.productId, name: item.name, category: item.category, quantity: item.quantity, unitPrice: item.unitPriceCents / 100 })),
  };
}
