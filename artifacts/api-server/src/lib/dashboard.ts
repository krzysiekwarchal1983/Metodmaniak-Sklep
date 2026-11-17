import type { DashboardDay, DashboardProduct } from "@workspace/api-zod";

const warsawDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit" });
export const warsawDay = (instant = new Date()) => warsawDate.format(instant);

export function fillDashboardDays(from: string, to: string, orders: Omit<DashboardDay, "pageViews">[], traffic: { day: string; views: number }[]): DashboardDay[] {
  const sales = new Map(orders.map((row) => [row.date, row]));
  const views = new Map(traffic.map((row) => [row.day, row.views]));
  const days: DashboardDay[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  for (let time = Date.parse(`${from}T00:00:00Z`); time <= end; time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10);
    days.push({ date, orderCount: 0, orderValue: 0, unitsSold: 0, ...sales.get(date), pageViews: views.get(date) ?? 0 });
  }
  return days;
}

export function rankDashboardProducts(catalogue: { id: number; name: string; category: string; stock: number }[], sales: Omit<DashboardProduct, "stock">[]) {
  const products = new Map<string, DashboardProduct>(catalogue.map((p) => [String(p.id), { productId: p.id, name: p.name, category: p.category, stock: p.stock, quantity: 0, orderValue: 0 }]));
  for (const sale of sales) {
    const key = sale.productId === null ? `removed:${sale.name}` : String(sale.productId);
    const current = products.get(key);
    products.set(key, { ...sale, ...(current ? { name: current.name, category: current.category } : {}), stock: current?.stock ?? null, quantity: (current?.quantity ?? 0) + sale.quantity, orderValue: Math.round(((current?.orderValue ?? 0) + sale.orderValue) * 100) / 100 });
  }
  const all = [...products.values()];
  return {
    bestProducts: all.filter((p) => p.quantity > 0).sort((a, b) => b.quantity - a.quantity || b.orderValue - a.orderValue || a.name.localeCompare(b.name, "pl")).slice(0, 5),
    worstProducts: all.filter((p) => p.productId !== null).sort((a, b) => a.quantity - b.quantity || a.orderValue - b.orderValue || a.name.localeCompare(b.name, "pl")).slice(0, 5),
  };
}

export function allowedTrafficPath(path: string) {
  return /^\/(?:sklep|nowosci|merch|free|vblog|regulamin|polityka-prywatnosci|polityka-cookies)?$/.test(path)
    || /^\/produkt\/[1-9]\d{0,8}$/.test(path)
    || /^\/aplikacja(?:\/(?:narzedzia|pogoda|lowiska|kalendarz))?$/.test(path)
    || /^\/vblog\/sztuka-precyzji\/[a-z0-9-]{1,80}$/.test(path);
}
