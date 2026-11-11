import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_SHORT_NAME } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_SHORT_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#0f1830",
    theme_color: "#0f1830",
    lang: "es-CL",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // Versión con zona segura (el contenido cabe en el círculo central del 80 %) para Android.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
