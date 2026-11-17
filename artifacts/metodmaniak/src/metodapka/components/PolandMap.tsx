import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Navigation, Loader2, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import type { AppFishery as Fishery } from "@workspace/api-client-react";
import { POLAND_SVG_PATH } from "../lib/polandSvgPath";

export interface NearestFisheryInfo {
  fishery: Fishery;
  distance: number;
}

interface PolandMapProps {
  fisheries: Fishery[];
  onFisheryClick: (fishery: Fishery) => void;
  selectedId?: number | null;
  locationControls?: HTMLElement | null;
  onNearestFisheriesChange?: (nearest: NearestFisheryInfo[]) => void;
  translations: {
    noFisheriesWithCoords: string;
    yourLocation: string;
    locating: string;
    showMyLocation: string;
    locationError: string;
    showFullMap: string;
  };
}

const POLAND_BOUNDS = { minLat: 48.83, maxLat: 55.17, minLng: 13.62, maxLng: 24.6 };
const MAP_WIDTH = 1000;
const MAP_HEIGHT = 947;
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 0.5;

function latLngToXY(lat: number, lng: number) {
  return {
    x: ((lng - POLAND_BOUNDS.minLng) / (POLAND_BOUNDS.maxLng - POLAND_BOUNDS.minLng)) * MAP_WIDTH,
    y: ((POLAND_BOUNDS.maxLat - lat) / (POLAND_BOUNDS.maxLat - POLAND_BOUNDS.minLat)) * MAP_HEIGHT,
  };
}

// Map-only visibility: records outside the Poland map frame stay in data/list, just not plotted.
function inBounds(lat: number, lng: number) {
  return lat >= POLAND_BOUNDS.minLat && lat <= POLAND_BOUNDS.maxLat && lng >= POLAND_BOUNDS.minLng && lng <= POLAND_BOUNDS.maxLng;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ctrl = "flex h-9 w-9 items-center justify-center text-foreground/85 transition-colors hover:bg-[hsl(var(--brand-fluo-hsl)/.1)] hover:text-lime disabled:opacity-35 disabled:pointer-events-none";

export default function PolandMap({ fisheries, onFisheryClick, selectedId, locationControls, onNearestFisheriesChange, translations }: PolandMapProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [nearest, setNearest] = useState<NearestFisheryInfo[]>([]);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const notifyRef = useRef(onNearestFisheriesChange);
  notifyRef.current = onNearestFisheriesChange;

  const withCoords = useMemo(
    () => fisheries.filter((f) => f.latitude !== null && f.longitude !== null && Number.isFinite(Number(f.latitude)) && Number.isFinite(Number(f.longitude)) && inBounds(Number(f.latitude), Number(f.longitude))),
    [fisheries],
  );
  const points = useMemo(() => withCoords.map((f) => ({ f, ...latLngToXY(Number(f.latitude), Number(f.longitude)) })), [withCoords]);

  useEffect(() => {
    if (!userLocation || withCoords.length === 0) {
      setNearest([]);
      notifyRef.current?.([]);
      return;
    }
    const list = withCoords
      .map((fishery) => ({ fishery, distance: calculateDistance(userLocation.lat, userLocation.lng, Number(fishery.latitude), Number(fishery.longitude)) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
    setNearest(list);
    notifyRef.current?.(list);
    const pts = [latLngToXY(userLocation.lat, userLocation.lng), ...list.map((n) => latLngToXY(Number(n.fishery.latitude), Number(n.fishery.longitude)))];
    const minX = Math.min(...pts.map((p) => p.x)), maxX = Math.max(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y)), maxY = Math.max(...pts.map((p) => p.y));
    const pad = Math.max(maxX - minX, maxY - minY) * 0.12 + 20;
    let w = Math.max(maxX - minX + pad * 2, MAP_WIDTH / MAX_ZOOM);
    let h = Math.max(maxY - minY + pad * 2, MAP_HEIGHT / MAX_ZOOM);
    const ar = MAP_WIDTH / MAP_HEIGHT;
    if (w / h > ar) h = w / ar; else w = h * ar;
    w = Math.min(w, MAP_WIDTH); h = Math.min(h, MAP_HEIGHT);
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    setViewBox({ x: Math.max(0, Math.min(MAP_WIDTH - w, cx - w / 2)), y: Math.max(0, Math.min(MAP_HEIGHT - h, cy - h / 2)), width: w, height: h });
    setZoomLevel(MAP_WIDTH / w);
  }, [userLocation, withCoords]);

  const handleResetZoom = useCallback(() => {
    setViewBox({ x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT });
    setZoomLevel(1);
    setUserLocation(null);
    setLocationError(null);
  }, []);

  const handleZoom = useCallback((delta: number, fx?: number, fy?: number) => {
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel + delta));
    if (next === zoomLevel) return;
    const ratio = zoomLevel / next;
    const w = MAP_WIDTH / next, h = MAP_HEIGHT / next;
    const focusX = fx ?? viewBox.x + viewBox.width / 2;
    const focusY = fy ?? viewBox.y + viewBox.height / 2;
    const x = Math.max(0, Math.min(MAP_WIDTH - w, focusX - (focusX - viewBox.x) * ratio));
    const y = Math.max(0, Math.min(MAP_HEIGHT - h, focusY - (focusY - viewBox.y) * ratio));
    setViewBox({ x, y, width: w, height: h });
    setZoomLevel(next);
  }, [zoomLevel, viewBox]);

  // Native non-passive wheel listener so page scroll is not hijacked by passive React handler warnings.
  const zoomRef = useRef(handleZoom);
  zoomRef.current = handleZoom;
  const vbRef = useRef(viewBox);
  vbRef.current = viewBox;
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey && vbRef.current.width === MAP_WIDTH && e.deltaY > 0) return;
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      const vb = vbRef.current;
      zoomRef.current(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP, ((e.clientX - r.left) / r.width) * vb.width + vb.x, ((e.clientY - r.top) / r.height) * vb.height + vb.y);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging || !svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.current.x) / r.width) * viewBox.width;
    const dy = ((e.clientY - dragStart.current.y) / r.height) * viewBox.height;
    dragStart.current = { x: e.clientX, y: e.clientY };
    setViewBox((p) => ({ ...p, x: Math.max(0, Math.min(MAP_WIDTH - p.width, p.x - dx)), y: Math.max(0, Math.min(MAP_HEIGHT - p.height, p.y - dy)) }));
  };
  const stopDrag = () => setIsDragging(false);

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationError(translations.locationError); return; }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setIsLocating(false); },
      (err) => {
        let msg = translations.locationError;
        if (err.code === err.PERMISSION_DENIED) msg = "Brak uprawnień do lokalizacji. Zmień to w ustawieniach przeglądarki.";
        else if (err.code === err.POSITION_UNAVAILABLE) msg = "Lokalizacja niedostępna. Sprawdź GPS lub połączenie.";
        else if (err.code === err.TIMEOUT) msg = "Przekroczono czas oczekiwania. Spróbuj ponownie.";
        setLocationError(msg);
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
  }, [translations.locationError]);

  const nearestMap = useMemo(() => new Map(nearest.map((n) => [n.fishery.id, n.distance])), [nearest]);
  const s = viewBox.width / MAP_WIDTH;
  const userXY = userLocation ? latLngToXY(userLocation.lat, userLocation.lng) : null;
  const userInBounds = !!userLocation && userLocation.lat >= POLAND_BOUNDS.minLat && userLocation.lat <= POLAND_BOUNDS.maxLat && userLocation.lng >= POLAND_BOUNDS.minLng && userLocation.lng <= POLAND_BOUNDS.maxLng;
  const hoveredPoint = hovered !== null ? points.find((p) => p.f.id === hovered) : undefined;
  const locationAction = (
    <div className="space-y-2">
      <button type="button" className="btn-ghost min-h-11 w-full whitespace-nowrap px-4 text-sm" onClick={handleGetLocation} disabled={isLocating} data-testid="button-show-location">
        {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4 text-lime" />}
        {isLocating ? translations.locating : userLocation ? "Odśwież lokalizację" : translations.showMyLocation}
      </button>
      {locationError && <p className="max-w-xs text-xs text-foreground" role="alert" data-testid="text-location-error">{locationError}</p>}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl bg-[hsl(90_6%_7.5%)] ring-1 ring-white/[.07]">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-60" aria-hidden />
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          className={`relative block aspect-[1000/947] w-full select-none ${isDragging ? "cursor-grabbing" : zoomLevel > 1 ? "cursor-grab" : ""}`}
          style={{ touchAction: zoomLevel > 1 ? "none" : "pan-y" }}
          role="group"
          aria-label="Mapa łowisk w Polsce"
          data-testid="map-fisheries"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopDrag}
          onPointerLeave={stopDrag}
        >
          <defs><clipPath id="mm-poland-clip"><path d={POLAND_SVG_PATH} /></clipPath></defs>
          <path d={POLAND_SVG_PATH} fill="hsl(90 6% 12%)" stroke="hsl(75 20% 92% / .32)" strokeWidth={2 * s} strokeLinejoin="round" />

          {userXY && userInBounds && nearest.map((n) => {
            const p = latLngToXY(Number(n.fishery.latitude), Number(n.fishery.longitude));
            return <line key={`l-${n.fishery.id}`} x1={userXY.x} y1={userXY.y} x2={p.x} y2={p.y} stroke="var(--brand-fluo)" strokeWidth={1.5 * s} strokeDasharray={`${5 * s} ${4 * s}`} opacity={0.55} />;
          })}

          <g clipPath="url(#mm-poland-clip)">
          {points.map(({ f, x, y }) => {
            const isSel = selectedId === f.id;
            const isHov = hovered === f.id;
            const dist = nearestMap.get(f.id);
            const r = (isSel ? 11 : isHov ? 10 : dist !== undefined ? 9 : 7) * s;
            return (
              <g
                key={f.id}
                className="cursor-pointer outline-none"
                role="button"
                tabIndex={0}
                aria-label={`${f.name}${f.location ? `, ${f.location}` : ""}`}
                aria-pressed={isSel}
                data-testid={`marker-fishery-${f.id}`}
                onClick={() => onFisheryClick(f)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onFisheryClick(f); } }}
                onMouseEnter={() => setHovered(f.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(f.id)}
                onBlur={() => setHovered(null)}
              >
                <circle cx={x} cy={y} r={22 * s} fill="transparent" />
                {isSel && <circle cx={x} cy={y} r={20 * s} fill="none" stroke="var(--brand-fluo)" strokeWidth={2 * s} opacity={0.5} />}
                <circle cx={x} cy={y} r={r} fill={f.fisheryType === "wild" ? "hsl(90 6% 9%)" : "var(--brand-fluo)"} stroke="var(--brand-fluo)" strokeWidth={(f.fisheryType === "wild" ? 3 : 2) * s} />
                {dist !== undefined && (
                  <text x={x} y={y - 16 * s} textAnchor="middle" fill="var(--brand-fluo)" style={{ fontSize: `${12 * s}px`, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>{dist.toFixed(0)} km</text>
                )}
              </g>
            );
          })}
          </g>

          {userXY && userInBounds && (
            <g aria-label={translations.yourLocation} role="img">
              <circle cx={userXY.x} cy={userXY.y} r={20 * s} fill="hsl(75 20% 92%)" opacity={0.12} />
              <circle cx={userXY.x} cy={userXY.y} r={8 * s} fill="hsl(75 20% 92%)" stroke="hsl(90 6% 6%)" strokeWidth={3 * s} />
            </g>
          )}

          {points.length === 0 && (
            <text x={viewBox.x + viewBox.width / 2} y={viewBox.y + viewBox.height / 2} textAnchor="middle" fill="hsl(80 6% 58%)" style={{ fontSize: `${22 * s}px` }}>{translations.noFisheriesWithCoords}</text>
          )}
        </svg>

        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-10 max-w-[14rem] -translate-x-1/2 -translate-y-full rounded-lg bg-[hsl(90_6%_10%)] px-2.5 py-1.5 text-xs shadow-lg ring-1 ring-white/10"
            style={{ left: `${((hoveredPoint.x - viewBox.x) / viewBox.width) * 100}%`, top: `calc(${((hoveredPoint.y - viewBox.y) / viewBox.height) * 100}% - 14px)` }}
          >
            <p className="truncate font-semibold">{hoveredPoint.f.name}</p>
            {hoveredPoint.f.location && <p className="truncate text-muted-foreground">{hoveredPoint.f.location}</p>}
          </div>
        )}

        <div className="absolute right-3 top-3 flex flex-col divide-y divide-white/10 overflow-hidden rounded-xl bg-[hsl(90_6%_9%/.92)] ring-1 ring-white/10 backdrop-blur" role="group" aria-label="Sterowanie mapą">
          <button type="button" className={ctrl} onClick={() => handleZoom(ZOOM_STEP)} disabled={zoomLevel >= MAX_ZOOM} aria-label="Przybliż mapę" data-testid="button-zoom-in"><ZoomIn className="h-4 w-4" /></button>
          <button type="button" className={ctrl} onClick={() => handleZoom(-ZOOM_STEP)} disabled={zoomLevel <= MIN_ZOOM} aria-label="Oddal mapę" data-testid="button-zoom-out"><ZoomOut className="h-4 w-4" /></button>
          <button type="button" className={ctrl} onClick={handleResetZoom} disabled={zoomLevel === 1 && !userLocation} aria-label={translations.showFullMap} title={translations.showFullMap} data-testid="button-reset-zoom"><Maximize2 className="h-4 w-4" /></button>
        </div>

        <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-lg bg-[hsl(90_6%_9%/.85)] px-2.5 py-1.5 text-[11px] text-muted-foreground ring-1 ring-white/10 backdrop-blur" aria-hidden>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-lime" />Komercyjne</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-[var(--brand-fluo)]" />Dzikie</span>
          {zoomLevel !== 1 && <span className="font-mono text-foreground/80">{Math.round(zoomLevel * 100)}%</span>}
        </div>
      </div>

      {locationControls ? createPortal(locationAction, locationControls) : locationAction}
      <p className="text-xs text-muted-foreground">Lokalizacja zostaje w przeglądarce i służy tylko do wskazania pięciu najbliższych łowisk.</p>
    </div>
  );
}
