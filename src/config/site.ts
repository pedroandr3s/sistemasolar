/**
 * Configuración del sitio y de la URL pública.
 *
 * La URL base de los códigos QR se toma SIEMPRE de NEXT_PUBLIC_SITE_URL.
 * `validateSiteUrl` se usa en el generador de QR y en el panel de diagnóstico.
 */

export const SITE_NAME = "Sistema solar a escala San Carlos–San Fabián";
export const SITE_SHORT_NAME = "Sistema solar Ñuble";
export const SITE_DESCRIPTION =
  "Recorrido de divulgación científica por la Ruta N-31, de San Carlos a San Fabián de Alico (Ñuble, Chile): el Sol y los planetas hasta Urano a una misma escala.";

export const STATION_PATH_PREFIX = "/estacion";

export function stationPath(stationId: string): string {
  return `${STATION_PATH_PREFIX}/${stationId}`;
}

export function stationUrl(baseUrl: string, stationId: string): string {
  return `${normalizeBaseUrl(baseUrl)}${stationPath(stationId)}`;
}

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/** URL pública configurada, o `null` si no hay ninguna. */
export function getConfiguredSiteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw || raw.trim() === "") return null;
  return normalizeBaseUrl(raw);
}

export type SiteUrlPurpose = "produccion" | "desarrollo";

export interface SiteUrlCheck {
  ok: boolean;
  url: string | null;
  errors: string[];
  warnings: string[];
}

const PLACEHOLDER_HOSTS = ["example.com", "example.org", "example.net", "dominio.cl", "midominio.cl", "tudominio.cl"];
const PLACEHOLDER_FRAGMENTS = ["dominio-configurado", "tu-dominio", "your-domain", "placeholder"];

function isPrivateHost(host: string): boolean {
  if (host === "localhost" || host.endsWith(".localhost") || host === "0.0.0.0" || host === "[::1]") return true;
  if (host.endsWith(".local") || host.endsWith(".test") || host.endsWith(".internal")) return true;
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return (
    a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)
  );
}

const TEMPORARY_TUNNEL_SUFFIXES = [".trycloudflare.com", ".ngrok-free.app", ".ngrok.io", ".loca.lt"];

/**
 * Valida una URL base.
 * - producción: exige HTTPS, dominio público, sin rutas, y rechaza dominios de ejemplo y túneles temporales.
 * - desarrollo: acepta HTTP en red local, pero advierte que el GPS y la brújula requieren HTTPS.
 */
export function validateSiteUrl(raw: string | null | undefined, purpose: SiteUrlPurpose): SiteUrlCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!raw || raw.trim() === "") {
    return { ok: false, url: null, errors: ["No hay URL configurada (NEXT_PUBLIC_SITE_URL está vacía)."], warnings };
  }
  const value = normalizeBaseUrl(raw);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, url: value, errors: [`«${value}» no es una URL válida.`], warnings };
  }
  const host = parsed.hostname.toLowerCase();

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    errors.push("La URL debe comenzar con https:// (o http:// solo para pruebas en red local).");
  }
  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    errors.push("La URL base no debe incluir rutas: usa solo el dominio, por ejemplo https://tudominio.cl");
  }
  if (parsed.search || parsed.hash) {
    errors.push("La URL base no debe incluir parámetros ni fragmentos.");
  }
  if (parsed.username || parsed.password) {
    errors.push("La URL no debe incluir usuario ni contraseña.");
  }
  if (
    PLACEHOLDER_HOSTS.some((p) => host === p || host.endsWith(`.${p}`)) ||
    PLACEHOLDER_FRAGMENTS.some((f) => host.includes(f))
  ) {
    errors.push(`«${host}» parece un dominio de ejemplo. Configura el dominio real.`);
  }

  const privateHost = isPrivateHost(host);
  const tunnel = TEMPORARY_TUNNEL_SUFFIXES.some((s) => host.endsWith(s));

  if (purpose === "produccion") {
    if (parsed.protocol !== "https:") errors.push("En producción la URL debe usar HTTPS.");
    if (privateHost) errors.push("En producción no se puede usar localhost ni una dirección de red local.");
    if (tunnel) errors.push("Los túneles temporales cambian de dirección: no sirven para QR que se imprimen.");
  } else {
    if (parsed.protocol === "http:" && !privateHost) {
      warnings.push("La URL usa HTTP en un dominio público: los navegadores bloquearán GPS y brújula.");
    }
    if (parsed.protocol === "http:" && privateHost) {
      warnings.push(
        "HTTP en red local sirve para revisar diseño y 3D. El GPS y la brújula requieren HTTPS (usa un túnel).",
      );
    }
    if (host === "localhost" || host === "127.0.0.1") {
      errors.push("«localhost» solo funciona en el mismo computador: el teléfono no podrá abrirla.");
    }
    if (tunnel) {
      warnings.push("La dirección del túnel cambia cada vez que lo reinicias: vuelve a generar los QR si cambia.");
    }
  }

  return { ok: errors.length === 0, url: value, errors, warnings };
}
