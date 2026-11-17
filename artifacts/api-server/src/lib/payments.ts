export type PaymentProviderId = "payu" | "przelewy24" | "blik" | "autopay";
export interface PaymentRequest {
  reference: string;
  amountCents: number;
  currency: "PLN";
  returnUrl: string;
}
export interface PaymentAdapter {
  id: PaymentProviderId;
  createPayment(request: PaymentRequest): Promise<{ redirectUrl: string }>;
  verifyWebhook(rawBody: Buffer, signature: string): Promise<boolean>;
}
// No sandbox success, order creation or stock reservation before a real, verified provider is configured.
export const paymentMethods = [
  { id: "payu", name: "PayU" },
  { id: "przelewy24", name: "Przelewy24" },
  { id: "blik", name: "BLIK" },
  { id: "autopay", name: "AutoPay" },
].map((p) => ({ ...p, enabled: false, message: "Płatności nieaktywne — operator nie został jeszcze podłączony." }));
