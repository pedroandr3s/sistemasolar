import type { NextConfig } from "next";

/**
 * Cache Components (`cacheComponents`) está desactivado a propósito: la app es
 * estática y, con esa opción, Next.js conserva ocultas las páginas visitadas
 * (React Activity). Eso mantendría vivas varias escenas WebGL a la vez en
 * teléfonos de gama media. Sin ella, cada escena 3D se desmonta y libera su
 * memoria al cambiar de página. Ver docs/DECISIONES.md.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Permite abrir el servidor de desarrollo desde el teléfono (red local o túnel HTTPS).
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    "172.*.*.*",
    "*.local",
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.loca.lt",
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value:
              "geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self), camera=(self), xr-spatial-tracking=(self), microphone=(), payment=()",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/textures/:file*",
        // Sin huella en el nombre: 1 día de caché y luego revalidación, para que una textura corregida se actualice.
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
    ];
  },
};

export default nextConfig;
