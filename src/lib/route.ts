import routeData from "@/data/route/ruta-san-carlos-san-fabian.json";
import { buildPolyline, type LngLat, type Polyline } from "./geo";

export interface RouteMeta {
  nombre: string;
  origen: { nombre: string; lat: number; lng: number; fuente: string };
  destino: { nombre: string; lat: number; lng: number; fuente: string };
  fuente: string;
  licencia: string;
  obtenido: string;
  perfil: string;
  simplificacion: string;
  largoCompletoOSRMm: number;
  largoSimplificadoM: number;
  tramoN31m: number;
  sha256Coordenadas: string;
}

interface RouteFeature {
  type: "Feature";
  properties: RouteMeta;
  geometry: { type: "LineString"; coordinates: number[][] };
}

const feature = routeData as unknown as RouteFeature;

export const ROUTE_META: RouteMeta = feature.properties;
export const ROUTE_COORDS: LngLat[] = feature.geometry.coordinates.map((c) => [c[0]!, c[1]!] as const);

let cached: Polyline | null = null;

/** Trazado del recorrido (San Carlos → San Fabián de Alico) como polilínea con distancias acumuladas. */
export function getRoute(): Polyline {
  if (!cached) cached = buildPolyline(ROUTE_COORDS);
  return cached;
}
