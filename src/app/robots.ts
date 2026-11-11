import type { MetadataRoute } from "next";
import { getConfiguredSiteUrl } from "@/config/site";

/** robots.txt: todo el contenido es público; las herramientas de prueba no se indexan. */
export default function robots(): MetadataRoute.Robots {
  const site = getConfiguredSiteUrl();
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/diagnostico", "/qr"] },
    ...(site ? { sitemap: `${site}/sitemap.xml` } : {}),
  };
}
