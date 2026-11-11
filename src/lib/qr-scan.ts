import { STATION_PATH_PREFIX } from "@/config/site";

/**
 * Interpreta el texto de un código QR leído con la cámara. Solo se aceptan
 * direcciones de una parada de este recorrido (/estacion/<id>, con o sin modo y
 * con o sin ?ar=1), de cualquier dominio: los códigos de prueba y los definitivos
 * apuntan a dominios distintos. Devuelve la ruta interna a la que ir, o null.
 *
 * Nunca se navega a la dirección leída tal cual: solo a una ruta propia
 * reconstruida, de modo que un código ajeno no puede sacar a nadie del sitio.
 */
export function stationPathFromQr(text: string, stationIds: readonly string[]): string | null {
  const raw = text.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw, "https://recorrido.invalid");
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const match = url.pathname.match(/^\/estacion\/([a-z]+)(\/(orientarme|sistema-solar|mapa|aprender))?\/?$/);
  if (!match) return null;
  const id = match[1]!;
  if (!stationIds.includes(id)) return null;
  const ar = url.searchParams.get("ar") === "1" ? "?ar=1" : "";
  return `${STATION_PATH_PREFIX}/${id}${match[2] ?? ""}${ar}`;
}
