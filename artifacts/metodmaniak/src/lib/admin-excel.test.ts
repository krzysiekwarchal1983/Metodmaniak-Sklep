import assert from "node:assert/strict";
import { test } from "node:test";
import { excelDate, excelTime } from "./admin-excel";
import { CALENDAR_HEADERS, parseCalendarExcel } from "./calendar-excel";
import { parseStockExcel, STOCK_HEADERS } from "./stock-excel";
import type { Product } from "@workspace/api-client-react";

test("calendar Excel keeps calendar days, validates leap dates and marks repeat entries", () => {
  const data = parseCalendarExcel([CALENDAR_HEADERS,
    ["Puchar", new Date("2028-02-29T00:00:00Z"), 0.25, "Test", "", "", "", ""],
    [" puchar ", "29.02.2028", "06:00", "test", "", "", "", ""],
    ["Błąd", "29.02.2027", "", "", "", "", "", ""],
  ]);
  assert.equal(data.entries[0].data.eventDate, "2028-02-29");
  assert.equal(data.entries[0].data.startTime, "06:00");
  assert.equal(data.entries[0].data.country, "pl");
  assert.equal(data.entries[1].duplicate, true);
  assert.match(data.entries[2].errors.join(), /data/i);
  assert.equal(excelDate("1.3.2028"), "2028-03-01");
  assert.equal(excelTime("6:30"), "06:30");
  assert.throws(() => parseCalendarExcel([["Data", "Data"], ["2028-01-01", "2028-01-02"]]));
});

test("inventory Excel never turns blanks into zero and rejects stale, unknown or duplicate IDs", () => {
  const products = [{ id: 123, name: "Test", stock: 4 }] as Product[];
  const parse = (data: unknown[][]) => parseStockExcel([STOCK_HEADERS, ...data], products);
  assert.deepEqual(parse([[123, "Nazwa z pliku ignorowana", "", "", 4, 0]])[0].errors, []);
  assert.equal(parse([[123, "", "", "", 4, 0]])[0].name, "Test");
  assert.match(parse([[123, "", "", "", 4, ""]])[0].errors.join(), /puste pole/);
  assert(Number.isNaN(parse([[123, "", "", "", 4, ""]])[0].stock), "A blank must render as missing, never as zero");
  assert.match(parse([[123, "", "", "", 3, 9]])[0].errors.join(), /zmienił/);
  assert.match(parse([[123, "", "", "", 4, -1]])[0].errors.join(), /całkowita/);
  assert.match(parse([[9999, "", "", "", 4, 2]])[0].errors.join(), /Nie znaleziono/);
  assert.match(parse([[123, "", "", "", 4, 2], [123, "", "", "", 4, 3]])[1].errors.join(), /Powtórzone/);
});
