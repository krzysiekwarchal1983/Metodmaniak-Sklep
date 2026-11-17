const normPhone = (digits: string) => digits.startsWith("0048") ? digits.slice(4) : digits.length === 11 && digits.startsWith("48") ? digits.slice(2) : digits;
const phonesIn = (text: string) => (text.replace(/[\s+\-()./]/g, "").match(/\d{6,}/g) ?? []).map(normPhone);
const numberDigits = (number: string) => number.replace(/\D/g, "");

/** Local filtering only. Never send contacts or search text to traffic analytics. */
export function matchesOrderSearch(order: { number: string; customerContact: string }, raw: string): boolean {
  const query = raw.trim();
  if (!query) return true;
  const compact = query.replace(/[\s+\-()./]/g, "");
  if (/^\d+$/.test(compact)) {
    const digits = numberDigits(order.number);
    if (digits && Number(digits) === Number(compact) && !query.startsWith("+")) return true;
    if (compact.length < 3) return false;
    const phone = query.startsWith("+48") ? compact.slice(2) : normPhone(compact);
    if (!phone) return false;
    return phonesIn(order.customerContact).some((value) => value === phone || value.startsWith(phone) || (phone.length >= 6 && value.includes(phone)));
  }
  const q = query.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const number = order.number.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!q) return false;
  if (number.startsWith(q)) return true;
  const prefix = q.replace(/\d+$/, ""), digits = q.slice(prefix.length);
  return !!digits && number.replace(/\d+$/, "") === prefix && Number(numberDigits(order.number)) === Number(digits);
}
