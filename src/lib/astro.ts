import * as Astronomy from "astronomy-engine";
import { AU_KM, BODIES, type BodyId } from "@/data/bodies";

/**
 * Posiciones planetarias con Astronomy Engine (VSOP87 truncado).
 * Precisión típica: del orden de un minuto de arco para los planetas, más
 * que suficiente para una visualización; no es una efeméride profesional.
 *
 * Marco: heliocéntrico, eclíptica media J2000. Unidades: UA.
 */

export type PlanetId = Exclude<BodyId, "sol">;

const ENGINE_BODY: Record<PlanetId, Astronomy.Body> = {
  mercurio: Astronomy.Body.Mercury,
  venus: Astronomy.Body.Venus,
  tierra: Astronomy.Body.Earth,
  marte: Astronomy.Body.Mars,
  jupiter: Astronomy.Body.Jupiter,
  saturno: Astronomy.Body.Saturn,
  urano: Astronomy.Body.Uranus,
};

export const ORBIT_PLANETS: PlanetId[] = ["mercurio", "venus", "tierra", "marte", "jupiter", "saturno", "urano"];

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

let eqjToEcl: Astronomy.RotationMatrix | null = null;
function rotationToEcliptic(): Astronomy.RotationMatrix {
  if (!eqjToEcl) eqjToEcl = Astronomy.Rotation_EQJ_ECL();
  return eqjToEcl;
}

/** Vector heliocéntrico en coordenadas eclípticas J2000 (UA). */
export function heliocentricEcliptic(planet: PlanetId, date: Date): Vec3 {
  const v = Astronomy.HelioVector(ENGINE_BODY[planet], date);
  const e = Astronomy.RotateVector(rotationToEcliptic(), v);
  return { x: e.x, y: e.y, z: e.z };
}

export function length(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

export function distanceAU(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function auToKm(au: number): number {
  return au * AU_KM;
}

/** Longitud y latitud eclípticas heliocéntricas (grados). */
export function eclipticLonLat(v: Vec3): { lon: number; lat: number } {
  const lon = ((Math.atan2(v.y, v.x) * 180) / Math.PI + 360) % 360;
  const lat = (Math.atan2(v.z, Math.hypot(v.x, v.y)) * 180) / Math.PI;
  return { lon, lat };
}

/** Puntos de una órbita completa, muestreados alrededor de la fecha indicada. */
export function orbitPath(planet: PlanetId, date: Date, samples = 240): Vec3[] {
  const periodDays = BODIES[planet].orbitalPeriodDays ?? 365.25;
  const start = date.getTime() - (periodDays / 2) * 86_400_000;
  const step = (periodDays * 86_400_000) / samples;
  const pts: Vec3[] = [];
  for (let i = 0; i <= samples; i++) pts.push(heliocentricEcliptic(planet, new Date(start + i * step)));
  return pts;
}

export interface PlanetState {
  id: PlanetId;
  position: Vec3;
  distanceAU: number;
}

export function allPlanetStates(date: Date): PlanetState[] {
  return ORBIT_PLANETS.map((id) => {
    const position = heliocentricEcliptic(id, date);
    return { id, position, distanceAU: length(position) };
  });
}

/**
 * Punto subsolar (lugar de la Tierra donde el Sol está en el cenit) en el instante dado.
 * Se usa para dibujar la línea día/noche real sobre la Tierra.
 */
export function subsolarPoint(date: Date): { lat: number; lon: number } {
  const observer = new Astronomy.Observer(0, 0, 0);
  const eq = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);
  const gast = Astronomy.SiderealTime(date);
  let lon = (eq.ra - gast) * 15;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  return { lat: eq.dec, lon };
}

/**
 * Convierte un vector eclíptico a las coordenadas de la escena 3D
 * (Y hacia el norte de la eclíptica): (x, z, −y).
 */
export function toScene(v: Vec3): [number, number, number] {
  return [v.x, v.z, -v.y];
}

/**
 * Escala de distancias para la vista orbital.
 * - "real": proporcional a la distancia (los planetas interiores quedan muy juntos).
 * - "comprimida": proporcional a la raíz cuadrada de la distancia; conserva la
 *   dirección (y por lo tanto las inclinaciones) pero acorta las distancias grandes.
 */
export type DistanceMode = "real" | "comprimida";

export function scaleVector(v: Vec3, mode: DistanceMode, unitsPerAU: number): Vec3 {
  const r = length(v);
  if (r === 0) return v;
  const target = mode === "real" ? r * unitsPerAU : Math.sqrt(r) * unitsPerAU;
  const k = target / r;
  return { x: v.x * k, y: v.y * k, z: v.z * k };
}
