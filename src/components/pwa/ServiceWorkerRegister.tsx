"use client";

import { useEffect } from "react";

/**
 * Registra el service worker solo en producción y en contexto seguro (HTTPS o
 * localhost). Guarda en caché las páginas visitadas y las texturas para que la
 * experiencia siga funcionando con mala cobertura en la ruta.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => {
      console.warn("[sw] no se pudo registrar", e);
    });
  }, []);
  return null;
}
