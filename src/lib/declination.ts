import { magvar } from "magvar";

/**
 * Declinación magnética con el World Magnetic Model 2025 (NOAA NCEI / British
 * Geological Survey), mediante la biblioteca `magvar` (MIT), que reproduce los
 * valores de prueba oficiales del WMM2025 (ver tests/unit/geo-stations.test.ts).
 *
 * Las brújulas de los teléfonos miden respecto del norte magnético; los rumbos a
 * las estaciones son geográficos. En la ruta San Carlos–San Fabián la diferencia
 * es de unos 3° hacia el este (2026) y disminuye cerca de 0,15° por año.
 * El cálculo es local: no usa la red ni envía la posición a ningún servidor.
 */
export const WMM = {
  model: "WMM2025",
  validFrom: 2025.0,
  validUntil: 2030.0,
  source: "NOAA NCEI / BGS, World Magnetic Model 2025",
} as const;

/** Año decimal UTC (2026-07-02 ≈ 2026,5). */
export function decimalYear(date: Date): number {
  const y = date.getUTCFullYear();
  const start = Date.UTC(y, 0, 1);
  const end = Date.UTC(y + 1, 0, 1);
  return y + (date.getTime() - start) / (end - start);
}

export interface Declination {
  /** Grados; positiva = norte magnético al este del geográfico. */
  degrees: number;
  /** `false` fuera del período de validez del modelo: el valor es menos confiable y conviene actualizar el modelo. */
  withinValidity: boolean;
}

export function magneticDeclination(lat: number, lng: number, date: Date = new Date(), altitudeKm = 0): Declination {
  const year = decimalYear(date);
  const withinValidity = year >= WMM.validFrom && year < WMM.validUntil;
  // Fuera de la validez se evalúa en el borde más cercano del modelo (evita extrapolar y el aviso de la biblioteca).
  const evalYear = withinValidity ? year : Math.min(Math.max(year, WMM.validFrom), WMM.validUntil - 1e-6);
  return { degrees: magvar(lat, lng, altitudeKm, evalYear), withinValidity };
}
