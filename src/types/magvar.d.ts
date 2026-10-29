/** Tipos mínimos de la biblioteca `magvar` (World Magnetic Model 2025), que no publica los suyos. */
declare module "magvar" {
  /**
   * Declinación magnética en grados (positiva hacia el este).
   * @param altitude kilómetros sobre el nivel del mar
   * @param when año decimal o fecha; por defecto, ahora
   */
  export function magvar(latitude: number, longitude: number, altitude?: number, when?: number | Date): number;
  export const MODEL_EPOCH: number;
  export const MODEL_VALID_UNTIL: number;
}
