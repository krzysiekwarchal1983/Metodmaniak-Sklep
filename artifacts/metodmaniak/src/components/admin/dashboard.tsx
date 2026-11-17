import { useMemo, useState } from "react";
import { AlertTriangle, Eye, Info, RefreshCw } from "lucide-react";
import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getGetAdminDashboardQueryKey, useGetAdminDashboard, type DashboardProduct } from "@workspace/api-client-react";
import { EmptyState, ErrorState, SkeletonBlock } from "@/components/states";
import { categoryName, formatPLN } from "@/lib/shop";

const TZ = "Europe/Warsaw";
const MAX_DAYS = 366;

/** Today in Warsaw as YYYY-MM-DD */
function warsawToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
const toUTC = (d: string) => { const [y, m, dd] = d.split("-").map(Number); return Date.UTC(y, m - 1, dd); };
const fromUTC = (t: number) => new Date(t).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => fromUTC(toUTC(d) + n * 86_400_000);
const daySpan = (a: string, b: string) => Math.round((toUTC(b) - toUTC(a)) / 86_400_000) + 1;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const validDay = (d: string) => ISO.test(d) && fromUTC(toUTC(d)) === d;

type Preset = "7" | "30" | "90" | "ytd" | "custom";
function presetRange(p: Exclude<Preset, "custom">): { from: string; to: string } {
  const to = warsawToday();
  if (p === "ytd") return { from: `${to.slice(0, 4)}-01-01`, to };
  return { from: addDays(to, -(Number(p) - 1)), to };
}

const nf = new Intl.NumberFormat("pl-PL");
const shortDay = (d: string) => new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(toUTC(d)));
const longDay = (d: string) => new Intl.DateTimeFormat("pl-PL", { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(toUTC(d)));

function Kpi({ label, value, hint, testid, loading }: { label: string; value: string; hint?: string; testid: string; loading: boolean }) {
  return (
    <div className="glass min-w-0 rounded-2xl p-4" data-testid={testid}>
      <div className="mono-label">{label}</div>
      {loading ? <SkeletonBlock className="mt-3 h-8 w-24" /> : <div className="mt-2 font-display text-2xl font-black [overflow-wrap:anywhere] sm:text-3xl">{value}</div>}
      {hint && <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{hint}</div>}
    </div>
  );
}

function ProductList({ title, kicker, items, kind }: { title: string; kicker: string; items: DashboardProduct[]; kind: "best" | "worst" }) {
  const max = Math.max(1, ...items.map((p) => p.quantity));
  return (
    <section className="glass rounded-3xl p-4 sm:p-5" data-testid={`section-${kind}-products`}>
      <div className="mono-label">{kicker}</div>
      <h3 className="font-display text-2xl font-black uppercase">{title}</h3>
      {items.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Brak pozycji produktowych w tym okresie.</p> : (
        <ol className="mt-3 divide-y divide-white/[.05]">
          {items.map((p, i) => (
            <li key={`${p.productId ?? p.name}-${i}`} className="py-2.5" data-testid={`row-${kind}-product-${i}`}>
              <div className="flex items-baseline gap-3">
                <span className="w-5 shrink-0 font-mono text-xs text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {categoryName(p.category) || p.category || "—"}
                    {p.stock === null ? " · usunięty z katalogu" : p.stock === 0 ? <span className="text-lime"> · brak na stanie</span> : ` · stan ${p.stock}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-bold">{nf.format(p.quantity)} szt.</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{formatPLN(p.orderValue)}</div>
                </div>
              </div>
              <div className="ml-8 mt-1.5 h-1 overflow-hidden rounded-full bg-white/[.05]">
                <div className="h-full origin-left rounded-full bg-[#61A9BD]" style={{ transform: `scaleX(${p.quantity / max})` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

type Metric = "orderValue" | "orderCount" | "unitsSold" | "pageViews";
const METRICS: { key: Metric; label: string }[] = [
  { key: "orderValue", label: "Wartość" },
  { key: "orderCount", label: "Zamówienia" },
  { key: "unitsSold", label: "Sztuki" },
  { key: "pageViews", label: "Odsłony" },
];
const fmtMetric = (m: Metric, v: number) => (m === "orderValue" ? formatPLN(v) : nf.format(v));

export function AdminDashboardPanel() {
  const [preset, setPreset] = useState<Preset>("30");
  const [range, setRange] = useState(() => presetRange("30"));
  const [draft, setDraft] = useState(range);
  const [metric, setMetric] = useState<Metric>("orderValue");
  const today = warsawToday();

  const draftError = !validDay(draft.from) || !validDay(draft.to) ? "Podaj obie daty."
    : draft.from > draft.to ? "Data początkowa jest po końcowej."
    : daySpan(draft.from, draft.to) > MAX_DAYS ? `Maksymalnie ${MAX_DAYS} dni.` : "";

  const q = useGetAdminDashboard(range, { query: { queryKey: getGetAdminDashboardQueryKey(range), staleTime: 30_000 } });
  const d = q.data;
  const loading = q.isLoading;

  const choose = (p: Exclude<Preset, "custom">) => { const r = presetRange(p); setPreset(p); setRange(r); setDraft(r); };
  const applyCustom = (e: React.FormEvent) => { e.preventDefault(); if (draftError) return; setPreset("custom"); setRange(draft); };

  const chart = useMemo(() => (d?.daily ?? []).map((x) => ({ ...x, timestamp: toUTC(x.date) })), [d]);
  const hasAny = !!d && (d.orderCount > 0 || d.pageViews > 0);
  const peak = useMemo(() => chart.reduce<(typeof chart)[number] | null>((best, x) => (x[metric] > (best?.[metric] ?? 0) ? x : best), null), [chart, metric]);
  const presetBtn = (p: Preset, label: string) => (
    <button key={p} type="button" onClick={() => p !== "custom" && choose(p)} aria-pressed={preset === p} className={`rounded-full px-3.5 py-2 text-xs font-bold transition-colors ${preset === p ? "bg-lime text-[#0f110e]" : "text-muted-foreground hover:text-foreground"}`} data-testid={`button-period-${p}`}>{label}</button>
  );

  return (
    <section aria-label="Pulpit sprzedaży i ruchu" className="space-y-5">
      {/* period bar */}
      <div className="glass flex flex-col gap-3 rounded-3xl p-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1 rounded-full border border-white/[.07] p-1">
          {presetBtn("7", "7 dni")}{presetBtn("30", "30 dni")}{presetBtn("90", "90 dni")}{presetBtn("ytd", `Rok ${today.slice(0, 4)}`)}
          {preset === "custom" && presetBtn("custom", "Własny")}
        </div>
        <form onSubmit={applyCustom} className="flex flex-wrap items-center gap-2">
          <input type="date" className="field !w-auto !py-2 font-mono text-xs" value={draft.from} max={today} onChange={(e) => setDraft((r) => ({ ...r, from: e.target.value }))} aria-label="Od" data-testid="input-dashboard-from" />
          <span className="text-muted-foreground">–</span>
          <input type="date" className="field !w-auto !py-2 font-mono text-xs" value={draft.to} max={today} onChange={(e) => setDraft((r) => ({ ...r, to: e.target.value }))} aria-label="Do" data-testid="input-dashboard-to" />
          <button type="submit" disabled={!!draftError || (draft.from === range.from && draft.to === range.to)} className="btn-ghost px-4 py-2 text-xs" data-testid="button-dashboard-apply">Pokaż</button>
          <button type="button" onClick={() => q.refetch()} disabled={q.isFetching} className="btn-ghost h-9 w-9" aria-label="Odśwież" data-testid="button-dashboard-refresh"><RefreshCw className={`h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} /></button>
        </form>
      </div>
      {draftError && (draft.from || draft.to) && <p role="alert" className="-mt-2 text-xs text-lime" data-testid="status-dashboard-range-error">{draftError}</p>}
      <p className="font-mono text-[11px] text-muted-foreground" data-testid="text-dashboard-range">
        {longDay(range.from)} — {longDay(range.to)} · {daySpan(range.from, range.to)} dni · czas Warszawy
      </p>

      {q.isError ? <ErrorState text="Nie udało się pobrać statystyk dla tego okresu." onRetry={() => q.refetch()} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi loading={loading} testid="stat-dashboard-order-value" label="Wartość zamówień" value={d ? formatPLN(d.orderValue) : "—"} hint="Suma kwot zamówień, nie potwierdzone wpłaty" />
            <Kpi loading={loading} testid="stat-dashboard-order-count" label="Zamówienia" value={d ? nf.format(d.orderCount) : "—"} hint={d ? `Średnio ${formatPLN(d.averageOrderValue)}` : undefined} />
            <Kpi loading={loading} testid="stat-dashboard-units" label="Sprzedane sztuki" value={d ? nf.format(d.unitsSold) : "—"} hint="Tylko z pozycji produktowych" />
            <Kpi loading={loading} testid="stat-dashboard-pageviews" label="Odsłony" value={d ? nf.format(d.pageViews) : "—"} hint="Anonimowe wyświetlenia stron, nie unikalni użytkownicy" />
            <div className="glass col-span-2 min-w-0 rounded-2xl p-4 lg:col-span-1" data-testid="stat-dashboard-statuses">
              <div className="mono-label">Status</div>
              {loading ? <SkeletonBlock className="mt-3 h-8 w-full" /> : d && (
                <dl className="mt-2 grid grid-cols-3 gap-2 text-center lg:grid-cols-1 lg:text-left">
                  {([["Przyjęte", d.accepted], ["W realizacji", d.processing], ["Wysłane", d.shipped]] as const).map(([l, v]) => (
                    <div key={l} className="flex flex-col lg:flex-row lg:items-baseline lg:justify-between"><dt className="text-[11px] text-muted-foreground">{l}</dt><dd className="font-mono text-sm font-bold">{v}</dd></div>
                  ))}
                </dl>
              )}
            </div>
          </div>

          {d && (d.unitemizedOrders > 0 || d.demoOrdersExcluded > 0 || !d.measurementStartedOn || d.measurementStartedOn > d.from) && (
            <ul className="space-y-1.5 rounded-2xl border border-white/[.07] px-4 py-3 text-xs text-muted-foreground" data-testid="list-dashboard-disclosures">
              {d.unitemizedOrders > 0 && <li className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lime" /><span><strong className="text-foreground">{d.unitemizedOrders} z {d.orderCount}</strong> zamówień nie ma pozycji produktowych. Wliczono je do sum, ale nie do rankingu produktów ani sztuk.</span></li>}
              {d.demoOrdersExcluded > 0 && <li className="flex gap-2"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Pominięto {d.demoOrdersExcluded} zamówień demonstracyjnych.</span></li>}
              {!d.measurementStartedOn ? <li className="flex gap-2"><Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Pomiar odsłon jeszcze nie zarejestrował żadnej wizyty. Wcześniejszy ruch nie jest znany.</span></li>
                : d.measurementStartedOn > d.from && <li className="flex gap-2"><Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>Odsłony liczone od {longDay(d.measurementStartedOn)}. Dni wcześniejsze pokazują 0, bo nie było pomiaru — to nie brak ruchu.</span></li>}
            </ul>
          )}

          {/* chart */}
          <section className="glass rounded-3xl p-4 sm:p-5" data-testid="section-dashboard-chart">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="mono-label">Dzień po dniu</div>
                <h3 className="font-display text-2xl font-black uppercase">{METRICS.find((m) => m.key === metric)?.label}</h3>
                {peak && <p className="text-xs text-muted-foreground" data-testid="text-dashboard-peak">Najwyżej: {longDay(peak.date)} · {fmtMetric(metric, peak[metric])}</p>}
              </div>
              <div role="tablist" className="flex flex-wrap gap-1 rounded-full border border-white/[.07] p-1">
                {METRICS.map((m) => <button key={m.key} role="tab" aria-selected={metric === m.key} onClick={() => setMetric(m.key)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${metric === m.key ? "bg-white/[.09] text-lime" : "text-muted-foreground"}`} data-testid={`tab-metric-${m.key}`}>{m.label}</button>)}
              </div>
            </div>
            <div className="mt-4 h-64 sm:h-72">
              {loading ? <SkeletonBlock className="h-full" /> : !hasAny ? (
                <EmptyState title="Cisza nad wodą" text="Brak zamówień i odsłon w wybranym okresie." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chart} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="hsl(75 20% 92% / .06)" />
                    <XAxis dataKey="timestamp" type="number" scale="time" domain={[toUTC(range.from) - 43200000, toUTC(range.to) + 43200000]} tickFormatter={(value: number) => shortDay(fromUTC(value))} tick={{ fill: "hsl(80 6% 58%)", fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} minTickGap={18} />
                    <YAxis domain={[0, "auto"]} allowDecimals={metric === "orderValue"} tick={{ fill: "hsl(80 6% 58%)", fontSize: 10, fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} width={metric === "orderValue" ? 56 : 36} tickFormatter={(v: number) => nf.format(v)} />
                    <Tooltip cursor={{ fill: "hsl(72 100% 50% / .06)" }} contentStyle={{ background: "#151813", border: "1px solid hsl(75 20% 92% / .12)", borderRadius: 12, fontSize: 12 }} labelFormatter={(_, p) => (p?.[0] ? longDay((p[0].payload as { date: string }).date) : "")} formatter={(v: number) => [fmtMetric(metric, v), METRICS.find((m) => m.key === metric)?.label ?? ""]} />
                    {chart.length > 120 ? <Area type="linear" dataKey={metric} stroke="#61A9BD" fill="#61A9BD" fillOpacity={0.25} strokeWidth={2} dot={false} /> : <Bar dataKey={metric} fill="#61A9BD" radius={[3, 3, 0, 0]} maxBarSize={28} />}
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          {/* rankings */}
          <div className="grid gap-4 lg:grid-cols-2">
            {loading ? <><SkeletonBlock className="h-72" /><SkeletonBlock className="h-72" /></> : d && <>
              <ProductList kind="best" kicker="Najwięcej sztuk" title="Najlepiej" items={d.bestProducts} />
              <ProductList kind="worst" kicker="Najmniej sztuk, także zero" title="Najsłabiej" items={d.worstProducts} />
            </>}
          </div>

          {/* daily table + pages */}
          <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <section className="glass rounded-3xl p-4 sm:p-5" data-testid="section-dashboard-daily">
              <div className="mono-label">Sprzedaż według dat</div>
              {loading ? <SkeletonBlock className="mt-3 h-48" /> : d && (() => {
                const rows = [...d.daily].reverse().filter((x) => x.orderCount > 0 || x.pageViews > 0);
                return rows.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Brak aktywności w tym okresie.</p> : (
                  <div className="mt-3 max-h-80 overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-[#121510]"><tr className="text-left">{["Dzień", "Zam.", "Szt.", "Wartość", "Odsłony"].map((h, i) => <th key={h} className={`mono-label py-2 font-normal ${i ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
                      <tbody>
                        {rows.map((x) => (
                          <tr key={x.date} className="border-t border-white/[.04]" data-testid={`row-dashboard-day-${x.date}`}>
                            <td className="py-2 font-mono text-xs">{x.date}</td>
                            <td className="py-2 text-right font-mono">{x.orderCount}</td>
                            <td className="py-2 text-right font-mono">{x.unitsSold}</td>
                            <td className="py-2 text-right font-mono">{formatPLN(x.orderValue)}</td>
                            <td className="py-2 text-right font-mono text-muted-foreground">{x.pageViews}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-2 text-[11px] text-muted-foreground">Pokazano tylko dni z aktywnością.</p>
                  </div>
                );
              })()}
            </section>
            <section className="glass rounded-3xl p-4 sm:p-5" data-testid="section-dashboard-pages">
              <div className="mono-label">Najczęściej oglądane strony</div>
              {loading ? <SkeletonBlock className="mt-3 h-48" /> : d && (d.topPages.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Brak zarejestrowanych odsłon.</p> : (
                <ol className="mt-3 space-y-2">
                  {d.topPages.map((p, i) => (
                    <li key={p.path} className="flex items-center gap-3 text-sm" data-testid={`row-dashboard-page-${i}`}>
                      <span className="min-w-0 flex-1 truncate font-mono text-xs" title={p.path}>{p.path}</span>
                      <span className="font-mono font-bold">{nf.format(p.views)}</span>
                    </li>
                  ))}
                </ol>
              ))}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
