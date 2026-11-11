import { AU_KM } from "@/data/bodies";

/**
 * Escala física del recorrido.
 *
 * Decisión de diseño (documentada en docs/DECISIONES.md):
 *   1 unidad astronómica (UA) = 2 km de recorrido.
 * Con esa escala, Urano (19,17 UA) queda a 38,3 km del Sol, dentro de los
 * 43,3 km del trazado entre las plazas de San Carlos y San Fabián de Alico.
 * Es una cifra redonda y fácil de recordar: «cada 2 km, la distancia Tierra–Sol».
 *
 * Las distancias se miden sobre el trazado de la ruta (no en línea recta),
 * desde la posición del Sol.
 */
export interface ScaleConfig {
  /** Metros de recorrido que representan 1 UA. */
  metersPerAU: number;
  /** Distancia, medida sobre la ruta desde su inicio, a la que se ubica el Sol. */
  sunAlongRouteMeters: number;
  /** Qué distancia astronómica se representa. */
  basis: "semieje-mayor";
}

export const SCALE: ScaleConfig = {
  metersPerAU: 2000,
  sunAlongRouteMeters: 0,
  basis: "semieje-mayor",
};

/** Denominador de la escala (1 : N). */
export function scaleDenominator(scale: ScaleConfig = SCALE): number {
  return (AU_KM * 1000) / scale.metersPerAU;
}

/** Convierte una distancia astronómica real (km) a metros del modelo. */
export function kmToModelMeters(km: number, scale: ScaleConfig = SCALE): number {
  return (km / AU_KM) * scale.metersPerAU;
}

/** Tamaño que tendría un objeto real (diámetro en km) a la misma escala, en metros. */
export function sizeAtScaleMeters(diameterKm: number, scale: ScaleConfig = SCALE): number {
  return kmToModelMeters(diameterKm, scale);
}
