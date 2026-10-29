import { AT_STATION_RADIUS_M } from "@/config/stations";
import { angleDelta, haversineMeters, initialBearing, projectOntoPolyline, type LatLng, type Polyline } from "./geo";
import type { Direction, StationPlacement } from "./stations";

export interface UserFix extends LatLng {
  /** Precisión horizontal estimada (m, radio de confianza ~68 %). */
  accuracy: number;
  /** Rumbo de desplazamiento informado por el GPS (grados), si existe. */
  heading?: number | null;
  /** Velocidad (m/s), si existe. */
  speed?: number | null;
  timestamp: number;
}

export type Confidence = "alta" | "media" | "baja";

export interface OrientationResult {
  nearest: { placement: StationPlacement; straightMeters: number } | null;
  /** El visitante está dentro del radio de una estación. */
  atStation: StationPlacement | null;
  /** Estación siguiente en el sentido elegido, desde la posición actual. */
  target: StationPlacement | null;
  straightMetersToTarget: number | null;
  alongRouteMetersToTarget: number | null;
  /** Rumbo geográfico (desde el norte) desde el visitante hacia la estación objetivo. */
  bearingToTarget: number | null;
  /** Rumbo de la carretera en el punto más cercano, en el sentido del recorrido elegido. */
  roadBearing: number | null;
  /** Posición del visitante proyectada sobre el trazado (m desde el inicio). */
  userAlongMeters: number;
  /** Distancia del visitante al trazado (m). */
  offRouteMeters: number;
  /** Incertidumbre angular de la flecha por la precisión del GPS (grados). */
  bearingUncertaintyDeg: number | null;
  confidence: Confidence;
  /** El visitante está lejos del recorrido (más de 2 km del trazado). */
  farFromRoute: boolean;
}

/**
 * Calcula la orientación hacia la estación siguiente.
 * La «siguiente» se determina por la posición sobre el trazado, no solo por
 * la estación del QR: si el visitante ya avanzó, apunta a la próxima por delante.
 */
export function computeOrientation(
  fix: UserFix,
  placements: StationPlacement[],
  route: Polyline,
  direction: Direction,
): OrientationResult {
  const located = placements.filter((p) => p.coords !== null && p.alongRouteMeters !== null);
  const proj = projectOntoPolyline(route, fix);

  let nearest: OrientationResult["nearest"] = null;
  for (const p of located) {
    const d = haversineMeters(fix, p.coords!);
    if (!nearest || d < nearest.straightMeters) nearest = { placement: p, straightMeters: d };
  }

  const atRadius = Math.max(AT_STATION_RADIUS_M, Math.min(fix.accuracy, 150));
  const atStation = nearest && nearest.straightMeters <= atRadius ? nearest.placement : null;

  const forward = direction === "hacia-san-fabian";
  const ahead = located
    .filter((p) => {
      if (atStation && p.station.id === atStation.station.id) return false;
      const delta = p.alongRouteMeters! - proj.alongMeters;
      return forward ? delta > 0 : delta < 0;
    })
    .sort((a, b) => (forward ? a.alongRouteMeters! - b.alongRouteMeters! : b.alongRouteMeters! - a.alongRouteMeters!));
  const target = ahead[0] ?? null;

  const straight = target ? haversineMeters(fix, target.coords!) : null;
  const along = target ? Math.abs(target.alongRouteMeters! - proj.alongMeters) + proj.offsetMeters : null;
  const bearing = target ? initialBearing(fix, target.coords!) : null;
  const roadBearing = forward ? proj.segmentBearing : (proj.segmentBearing + 180) % 360;

  const uncertainty = straight !== null && straight > 0 ? (Math.atan2(fix.accuracy, straight) * 180) / Math.PI : null;

  let confidence: Confidence = "alta";
  if (fix.accuracy > 100 || (uncertainty !== null && uncertainty > 30)) confidence = "baja";
  else if (fix.accuracy > 30 || (uncertainty !== null && uncertainty > 12)) confidence = "media";

  return {
    nearest,
    atStation,
    target,
    straightMetersToTarget: straight,
    alongRouteMetersToTarget: along,
    bearingToTarget: bearing,
    roadBearing,
    userAlongMeters: proj.alongMeters,
    offRouteMeters: proj.offsetMeters,
    bearingUncertaintyDeg: uncertainty,
    confidence,
    farFromRoute: proj.offsetMeters > 2000,
  };
}

/**
 * Rumbo (grados desde el norte, en sentido horario) hacia donde «mira» el teléfono,
 * calculado con la rotación completa del evento `deviceorientation` (alpha, beta, gamma;
 * convención Z-X'-Y'' de la especificación W3C, marco terrestre x = este, y = norte, z = arriba).
 *
 * - Con el teléfono horizontal manda el borde superior de la pantalla: el resultado no
 *   cambia al inclinarlo de lado (equivale a 360 − alpha, la fórmula anterior).
 * - A medida que el teléfono se pone vertical, pasa a mandar la parte trasera (hacia donde
 *   apunta la cámara). Cerca de la vertical, alpha por sí solo se vuelve inestable; los ejes
 *   del dispositivo no, por eso el rumbo se calcula a partir de ellos.
 * - `screenAngle` (0, 90, 180, 270) corrige la rotación de la pantalla.
 *
 * El resultado es relativo al norte que use el sensor (magnético en iOS y Android):
 * corregir luego con `magneticToTrueHeading`. Devuelve `null` si la pose no define un rumbo.
 */
export function headingFromDeviceOrientation(
  alpha: number,
  beta: number,
  gamma: number,
  screenAngle = 0,
): number | null {
  const d = Math.PI / 180;
  const cA = Math.cos(alpha * d);
  const sA = Math.sin(alpha * d);
  const cB = Math.cos(beta * d);
  const sB = Math.sin(beta * d);
  const cG = Math.cos(gamma * d);
  const sG = Math.sin(gamma * d);
  // Columnas de R = Rz(alpha)·Rx(beta)·Ry(gamma): ejes del teléfono en el marco terrestre.
  const x = { e: cA * cG - sA * sB * sG, n: sA * cG + cA * sB * sG, z: -cB * sG };
  const y = { e: -sA * cB, n: cA * cB, z: sB };
  const zAxis = { e: cA * sG + sA * sB * cG, n: sA * sG - cA * sB * cG };
  const t = screenAngle * d;
  // «Arriba» de la pantalla según la rotación de la interfaz.
  const up = {
    e: Math.sin(t) * x.e + Math.cos(t) * y.e,
    n: Math.sin(t) * x.n + Math.cos(t) * y.n,
    z: Math.sin(t) * x.z + Math.cos(t) * y.z,
  };
  // Peso de la parte trasera (−Z): 0 con el teléfono horizontal, 1 con la pantalla vertical.
  const w = Math.max(0, up.z);
  const fe = up.e - w * zAxis.e;
  const fn = up.n - w * zAxis.n;
  if (Math.hypot(fe, fn) < 1e-6) return null;
  return (((Math.atan2(fe, fn) / d) % 360) + 360) % 360;
}

/**
 * Pasa un rumbo magnético (brújula del teléfono) a rumbo geográfico.
 * `declinationDeg` es positiva cuando el norte magnético está al este del geográfico.
 */
export function magneticToTrueHeading(magneticHeading: number, declinationDeg: number): number {
  return (((magneticHeading + declinationDeg) % 360) + 360) % 360;
}

/** Ángulo con que debe girar la flecha en pantalla: rumbo al objetivo menos la orientación del teléfono. */
export function relativeArrowAngle(bearingToTarget: number, deviceHeading: number): number {
  return angleDelta(deviceHeading, bearingToTarget);
}

/**
 * Velocidad (m/s) a partir de la cual se asume que el visitante va en un vehículo:
 * 7 m/s ≈ 25 km/h, por encima de un trote y de un paseo en bicicleta tranquilo.
 */
export const VEHICLE_SPEED_MS = 7;

/**
 * `true` si el GPS informa una velocidad propia de un vehículo. Se usa para
 * recordar que no se debe usar el teléfono mientras se conduce. Una precisión
 * muy mala (> 50 m) hace poco fiable la velocidad y no dispara el aviso.
 */
export function looksLikeVehicle(fix: Pick<UserFix, "speed" | "accuracy"> | null): boolean {
  if (!fix || fix.speed === null || fix.speed === undefined || Number.isNaN(fix.speed)) return false;
  if (fix.accuracy > 50) return false;
  return fix.speed >= VEHICLE_SPEED_MS;
}

/** Rumbo de desplazamiento fiable solo si el GPS informa velocidad suficiente. */
export function reliableMovementHeading(fix: UserFix): number | null {
  if (fix.heading === null || fix.heading === undefined || Number.isNaN(fix.heading)) return null;
  if (fix.speed === null || fix.speed === undefined || fix.speed < 0.8) return null;
  return fix.heading;
}
