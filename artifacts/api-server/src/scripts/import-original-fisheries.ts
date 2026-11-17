import { readFile } from "node:fs/promises";
import { db, fisheriesTable, pool, type InsertFishery } from "@workspace/db";
import { fisheryInput } from "../lib/fishing-directory";

// Reads only fisheries INSERT data. Never executes source SQL or imports accounts.
function parseValues(text: string): Array<string | null> {
  const values: Array<string | null> = [];
  let i = 0;
  while (i < text.length) {
    while (/\s/.test(text[i] ?? "") && i < text.length) i++;
    if (text[i] === "'") {
      i++;
      let value = "";
      let closed = false;
      while (i < text.length) {
        if (text[i] === "'") {
          if (text[i + 1] === "'") { value += "'"; i += 2; }
          else { i++; closed = true; break; }
        } else value += text[i++];
      }
      if (!closed) throw new Error("Unclosed SQL value");
      values.push(value);
    } else {
      const start = i;
      while (i < text.length && text[i] !== ",") i++;
      const token = text.slice(start, i).trim();
      if (token === "NULL") values.push(null);
      else if (/^-?\d+(?:\.\d+)?$/.test(token)) values.push(token);
      else throw new Error("Unsupported SQL value");
    }
    while (i < text.length && /\s/.test(text[i])) i++;
    if (i < text.length && text[i++] !== ",") throw new Error("Invalid SQL separator");
  }
  return values;
}

const normalized = (s: string) => s.trim().normalize("NFC").toLocaleLowerCase("pl").replace(/\s+/g, " ");
const identity = (row: InsertFishery) =>
  JSON.stringify([normalized(row.name), normalized(row.country ?? "pl"), normalized(row.location ?? ""),
    row.latitude ?? null, row.longitude ?? null, row.fisheryType, row.description ?? "",
    row.voivodeship ?? "", row.phone ?? "", row.link ?? "", row.googleMapsLink ?? "", row.maxDepth ?? ""]);

async function main() {
  const source = process.argv[2];
  if (!source) throw new Error("Pass the original SQL export path; add --apply to import.");
  const sql = await readFile(source, "utf8");
  const rows = new Map<string, InsertFishery>();
  let sourceCount = 0;
  for (const match of sql.matchAll(/^INSERT INTO fisheries \(([^)]+)\) VALUES \((.*?)\) ON CONFLICT[^\n]*$/gm)) {
    const columns = match[1].split(",").map((column) => column.trim());
    const values = parseValues(match[2]);
    if (columns.length !== values.length) throw new Error("Fishery field count mismatch");
    const raw = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
    const text = (key: string) => raw[key] ?? "";
    const coordinate = (key: string) => raw[key] === null || raw[key] === "" ? null : Number(raw[key]);
    const row = fisheryInput.parse({
      name: text("name"), description: text("description"), location: text("location"),
      country: text("country"), voivodeship: text("voivodeship"), phone: text("phone"),
      link: text("link"), googleMapsLink: text("google_maps_link"),
      latitude: coordinate("latitude"), longitude: coordinate("longitude"),
      maxDepth: text("max_depth"), fisheryType: text("fishery_type"), images: [],
    });
    sourceCount++;
    // The source export can repeat records; retain its final version by legacy ID.
    rows.set(text("id"), row);
  }
  const expected = (sql.match(/^INSERT INTO fisheries /gm) ?? []).length;
  if (!expected || sourceCount !== expected) throw new Error("Not every source fishery was parsed");
  const existing = await db.select().from(fisheriesTable);
  const seen = new Set(existing.map(identity));
  const additions = [...rows.values()].filter((row) => {
    const key = identity(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const apply = process.argv.includes("--apply");
  if (apply && additions.length) {
    await db.transaction(async (tx) => {
      for (let i = 0; i < additions.length; i += 100) {
        await tx.insert(fisheriesTable).values(additions.slice(i, i + 100));
      }
    });
  }
  console.log(JSON.stringify({
    mode: apply ? "imported" : "dry-run", sourceRows: sourceCount, uniqueSourceIds: rows.size,
    existing: existing.length, additions: additions.length, skipped: rows.size - additions.length,
  }));
}

main().catch((error) => {
  // Report validation paths only, never print raw source rows or credentials.
  console.error(error?.issues ? JSON.stringify(error.issues.map((issue: { path: unknown; message: string }) => ({ path: issue.path, message: issue.message }))) : error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
