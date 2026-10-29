/**
 * Cálculos geográficos sobre la esfera (radio medio terrestre).
 * Convención de coordenadas: [lng, lat] en grados (como GeoJSON).
 */

export const EARTH_RADIUS_M = 6_371_008.8;

export type LngLat = readonly [number, number];

export interface LatLng {
  lat: number;
  lng: number;
}

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Distancia geodésica (gran círculo) en metros. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Rumbo inicial de a hacia b, en grados desde el norte geográfico (0–360, sentido horario). */
export function initialBearing(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Diferencia angular con signo en (-180, 180]. */
export function angleDelta(from: number, to: number): number {
  let d = normalizeDegrees(to) - normalizeDegrees(from);
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

const CARDINALS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
const CARDINAL_NAMES: Record<string, string> = {
  N: "norte",
  NE: "noreste",
  E: "este",
  SE: "sureste",
  S: "sur",
  SO: "suroeste",
  O: "oeste",
  NO: "noroeste",
};

/** Punto cardinal abreviado en español (16 rumbos). */
export function cardinal(bearing: number): string {
  const i = Math.round(normalizeDegrees(bearing) / 22.5) % 16;
  return CARDINALS[i] ?? "N";
}

/** Nombre del rumbo en palabras (8 rumbos). */
export function cardinalName(bearing: number): string {
  const eight = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  const i = Math.round(normalizeDegrees(bearing) / 45) % 8;
  return CARDINAL_NAMES[eight[i] ?? "N"] ?? "norte";
}

// ---------------------------------------------------------------------------
// Polilíneas
// ---------------------------------------------------------------------------

export interface Polyline {
  points: LatLng[];
  /** Distancia acumulada (m) desde el inicio hasta cada punto. */
  cumulative: number[];
  length: number;
}

export function buildPolyline(coords: readonly LngLat[]): Polyline {
  if (coords.length < 2) throw new Error("La polilínea necesita al menos dos puntos");
  const points = coords.map(([lng, lat]) => ({ lat, lng }));
  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const cur = points[i]!;
    cumulative.push(cumulative[i - 1]! + haversineMeters(prev, cur));
  }
  return { points, cumulative, length: cumulative[cumulative.length - 1]! };
}

/** Proyección equirectangular local (m) alrededor de una latitud de referencia. */
function localXY(p: LatLng, ref: LatLng): [number, number] {
  const x = toRad(p.lng - ref.lng) * EARTH_RADIUS_M * Math.cos(toRad(ref.lat));
  const y = toRad(p.lat - ref.lat) * EARTH_RADIUS_M;
  return [x, y];
}

export interface PolylineProjection {
  /** Distancia medida sobre el trazado desde su inicio hasta el punto proyectado (m). */
  alongMeters: number;
  /** Distancia del punto al trazado (m). */
  offsetMeters: number;
  /** Punto del trazado más cercano. */
  point: LatLng;
  segmentIndex: number;
  /** Rumbo del tramo del trazado en ese punto, en el sentido de avance del recorrido. */
  segmentBearing: number;
}

/** Proyecta un punto sobre la polilínea (tramo más cercano). */
export function projectOntoPolyline(line: Polyline, p: LatLng): PolylineProjection {
  let best: PolylineProjection | null = null;
  for (let i = 0; i < line.points.length - 1; i++) {
    const a = line.points[i]!;
    const b = line.points[i + 1]!;
    const [bx, by] = localXY(b, a);
    const [px, py] = localXY(p, a);
    const len2 = bx * bx + by * by;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / len2));
    const q: LatLng = { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
    const offset = haversineMeters(p, q);
    if (!best || offset < best.offsetMeters) {
      const segLen = line.cumulative[i + 1]! - line.cumulative[i]!;
      best = {
        alongMeters: line.cumulative[i]! + segLen * t,
        offsetMeters: offset,
        point: q,
        segmentIndex: i,
        segmentBearing: initialBearing(a, b),
      };
    }
  }
  return best!;
}

/** Punto situado a cierta distancia (m) sobre el trazado. */
export function pointAlong(line: Polyline, meters: number): { point: LatLng; bearing: number } {
  const d = Math.max(0, Math.min(line.length, meters));
  let i = 0;
  while (i < line.cumulative.length - 2 && line.cumulative[i + 1]! < d) i++;
  const a = line.points[i]!;
  const b = line.points[i + 1]!;
  const segLen = line.cumulative[i + 1]! - line.cumulative[i]!;
  const t = segLen === 0 ? 0 : (d - line.cumulative[i]!) / segLen;
  return {
    point: { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t },
    bearing: initialBearing(a, b),
  };
}
