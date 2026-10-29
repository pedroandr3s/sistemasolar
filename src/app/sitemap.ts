import type { MetadataRoute } from "next";
import { getConfiguredSiteUrl, stationPath } from "@/config/site";
import { getStationIds } from "@/lib/stations";

/**
 * sitemap.xml con la portada, los modos generales y las 8 estaciones con sus modos.
 * Un sitemap exige direcciones absolutas: mientras NEXT_PUBLIC_SITE_URL no tenga el
 * dominio definitivo, queda vacío (no se publican direcciones de prueba).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const site = getConfiguredSiteUrl();
  if (!site) return [];
  const general = ["", "/mapa", "/sistema-solar", "/aprender", "/orientarme", "/fuentes"];
  const modes = ["", "/orientarme", "/sistema-solar", "/mapa", "/aprender"];
  return [
    ...general.map((p) => ({ url: `${site}${p}`, changeFrequency: "monthly" as const, priority: p === "" ? 1 : 0.6 })),
    ...getStationIds().flatMap((id) =>
      modes.map((m) => ({
        url: `${site}${stationPath(id)}${m}`,
        changeFrequency: "monthly" as const,
        priority: m === "" ? 0.9 : 0.5,
      })),
    ),
  ];
}
