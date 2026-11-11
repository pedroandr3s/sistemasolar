import { BODIES, type Body } from "@/data/bodies";
import { SCALE, kmToModelMeters, type ScaleConfig } from "@/config/scale";
import { STATIONS, type StationConfig } from "@/config/stations";
import { haversineMeters, pointAlong, projectOntoPolyline, type LatLng, type Polyline } from "./geo";
import { getRoute } from "./route";

export type PlacementStatus = StationConfig["location"]["status"];

export interface StationPlacement {
  station: StationConfig;
  body: Body;
  /** 1. Distancia astronómica real al Sol (km, semieje mayor). 0 para el Sol. */
  astronomicalKm: number;
  /** 2. Distancia representada a escala desde el Sol (m de recorrido). */
  modelMeters: number;
  /** 3. Posición medida sobre el trazado desde su inicio (m). `null` si está pendiente. */
  alongRouteMeters: number | null;
  /** Coordenadas usadas por mapa y orientación. `null` si está pendiente. */
  coords: LatLng | null;
  status: PlacementStatus;
  /** La posición teórica cae dentro del trazado disponible. */
  fitsRoute: boolean;
  /** Para estaciones verificadas: distancia de la escultura al trazado (m). */
  offsetFromRouteMeters: number | null;
}

function placeStation(station: StationConfig, route: Polyline, scale: ScaleConfig): StationPlacement {
  const body = BODIES[station.bodyId];
  const astronomicalKm = body.meanDistanceKm ?? 0;
  const modelMeters = kmToModelMeters(astronomicalKm, scale);
  const theoreticalAlong = scale.sunAlongRouteMeters + modelMeters;
  const fitsRoute = theoreticalAlong <= route.length;
  const loc = station.location;

  if (loc.status === "verificada") {
    const coords = { lat: loc.lat, lng: loc.lng };
    const proj = projectOntoPolyline(route, coords);
    return {
      station,
      body,
      astronomicalKm,
      modelMeters,
      alongRouteMeters: proj.alongMeters,
      coords,
      status: "verificada",
      fitsRoute,
      offsetFromRouteMeters: proj.offsetMeters,
    };
  }
  if (loc.status === "pendiente" || !fitsRoute) {
    return {
      station,
      body,
      astronomicalKm,
      modelMeters,
      alongRouteMeters: null,
      coords: null,
      status: "pendiente",
      fitsRoute,
      offsetFromRouteMeters: null,
    };
  }
  const { point } = pointAlong(route, theoreticalAlong);
  return {
    station,
    body,
    astronomicalKm,
    modelMeters,
    alongRouteMeters: theoreticalAlong,
    coords: point,
    status: "propuesta-escala",
    fitsRoute,
    offsetFromRouteMeters: null,
  };
}

let cache: StationPlacement[] | null = null;

/** Ubicación calculada de todas las estaciones, en orden de recorrido. */
export function getPlacements(): StationPlacement[] {
  if (!cache) {
    const route = getRoute();
    cache = [...STATIONS].sort((a, b) => a.order - b.order).map((s) => placeStation(s, route, SCALE));
  }
  return cache;
}

/** Versión sin caché, para pruebas con otra configuración. */
export function computePlacements(stations: StationConfig[], route: Polyline, scale: ScaleConfig): StationPlacement[] {
  return [...stations].sort((a, b) => a.order - b.order).map((s) => placeStation(s, route, scale));
}

export function getStationIds(): string[] {
  return getPlacements().map((p) => p.station.id);
}

export function findPlacement(id: string): StationPlacement | undefined {
  return getPlacements().find((p) => p.station.id === id);
}

export function getPlacement(id: string): StationPlacement {
  const p = findPlacement(id);
  if (!p) throw new Error(`Estación desconocida: ${id}`);
  return p;
}

export type Direction = "hacia-san-fabian" | "hacia-san-carlos";

/** Estación siguiente en el sentido indicado, o `null` al final del recorrido. */
export function nextPlacement(id: string, direction: Direction = "hacia-san-fabian"): StationPlacement | null {
  const list = getPlacements();
  const i = list.findIndex((p) => p.station.id === id);
  if (i < 0) return null;
  const j = direction === "hacia-san-fabian" ? i + 1 : i - 1;
  return list[j] ?? null;
}

export function previousPlacement(id: string, direction: Direction = "hacia-san-fabian"): StationPlacement | null {
  return nextPlacement(id, direction === "hacia-san-fabian" ? "hacia-san-carlos" : "hacia-san-fabian");
}

export interface LegDistances {
  /** Distancia por el trazado entre ambas estaciones (m). */
  alongRouteMeters: number | null;
  /** Distancia en línea recta entre sus coordenadas (m). */
  straightMeters: number | null;
  /** Distancia del modelo a escala entre ambos planetas (m), según sus distancias medias al Sol. */
  modelMeters: number;
}

export function legDistances(a: StationPlacement, b: StationPlacement): LegDistances {
  return {
    alongRouteMeters:
      a.alongRouteMeters !== null && b.alongRouteMeters !== null
        ? Math.abs(b.alongRouteMeters - a.alongRouteMeters)
        : null,
    straightMeters: a.coords && b.coords ? haversineMeters(a.coords, b.coords) : null,
    modelMeters: Math.abs(b.modelMeters - a.modelMeters),
  };
}

/** Longitud del recorrido de estaciones: del Sol a Urano, sobre el trazado (m). */
export function stationSpanMeters(): number {
  const list = getPlacements();
  const first = list[0]?.alongRouteMeters ?? 0;
  const last = list[list.length - 1]?.alongRouteMeters ?? first;
  return last - first;
}

/** Proporción del recorrido de estaciones completada para una posición sobre el trazado (0–1). */
export function progressFraction(alongRouteMeters: number): number {
  const list = getPlacements();
  const first = list[0]?.alongRouteMeters ?? 0;
  const span = stationSpanMeters();
  if (span <= 0) return 0;
  return Math.max(0, Math.min(1, (alongRouteMeters - first) / span));
}

export function anyVerified(): boolean {
  return getPlacements().some((p) => p.status === "verificada");
}

export function allVerified(): boolean {
  return getPlacements().every((p) => p.status === "verificada");
}

/** Posición del cinturón principal de asteroides en el modelo (2,2–3,2 UA), m desde el Sol. */
export function asteroidBeltModelMeters(scale: ScaleConfig = SCALE): [number, number] {
  return [2.2 * scale.metersPerAU, 3.2 * scale.metersPerAU];
}
