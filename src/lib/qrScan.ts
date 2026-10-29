import { STATION_PATH_PREFIX } from "@/config/site";

/**
 * Identifica la estación a la que apunta el contenido de un código QR.
 *
 * Solo importa la RUTA (`/estacion/<id>`): se ignora el dominio, de modo que un QR de
 * prueba (IP local o túnel) y uno definitivo abren la misma estación en el sitio actual.
 * Devuelve `null` si el texto no es una URL de estación conocida (otros QR, enlaces
 * externos, texto libre): la app nunca navega a una dirección ajena.
 */
export function stationIdFromQrText(text: string, knownIds: readonly string[]): string | null {
  const raw = text.trim();
  if (!raw || raw.length > 2048) return null;
  let pathname: string;
  try {
    pathname = new URL(raw, "http://sitio.local").pathname;
  } catch {
    return null;
  }
  const m = pathname.match(new RegExp(`^${STATION_PATH_PREFIX}/([a-z0-9-]+)/?$`));
  const id = m?.[1];
  return id && knownIds.includes(id) ? id : null;
}
