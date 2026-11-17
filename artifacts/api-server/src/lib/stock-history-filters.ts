import { z } from "zod";
import { ListStockHistoryQueryParams } from "@workspace/api-zod";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { stockHistoryTable } from "@workspace/db";

const calendarDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return value.slice(0, 4) !== "0000" && Number.isFinite(date.getTime())
    && date.toISOString().slice(0, 10) === value;
}, "Nieprawidłowy dzień kalendarzowy.");

const filters = ListStockHistoryQueryParams.extend({
  actorId: z.string().trim().min(1).max(255).optional(),
  dateFrom: calendarDay.optional(),
  dateTo: calendarDay.optional(),
}).strict().refine(
  ({ dateFrom, dateTo }) => !dateFrom || !dateTo || dateFrom <= dateTo,
  "Data od nie może być późniejsza niż data do.",
);

export function parseStockHistoryFilters(query: Record<string, unknown>) {
  // The generator coerces query strings. Reject repeated/nested parameters
  // before coercion so arrays cannot turn into account IDs or numbers.
  if (Object.values(query).some((value) => typeof value !== "string")) return null;
  const parsed = filters.safeParse(query);
  return parsed.success ? parsed.data : null;
}

export type StockHistoryFilters = Pick<NonNullable<ReturnType<typeof parseStockHistoryFilters>>,
  "productId" | "actorId" | "dateFrom" | "dateTo">;

export function stockHistoryWhere({ productId, actorId, dateFrom, dateTo }: StockHistoryFilters) {
  return and(
    productId ? eq(stockHistoryTable.productId, productId) : undefined,
    actorId ? eq(stockHistoryTable.actorId, actorId) : undefined,
    // Local midnight bounds preserve the 23/25-hour Warsaw DST days.
    dateFrom ? gte(stockHistoryTable.changedAt, sql`(${dateFrom}::date::timestamp AT TIME ZONE 'Europe/Warsaw')`) : undefined,
    dateTo ? lt(stockHistoryTable.changedAt, sql`((${dateTo}::date + 1)::timestamp AT TIME ZONE 'Europe/Warsaw')`) : undefined,
  );
}
