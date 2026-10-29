"use client";

import type { Body } from "@/data/bodies";

/**
 * Realidad aumentada opcional:
 * - Android (Chrome con ARCore): sesión WebXR «immersive-ar».
 * - iPhone/iPad (Safari): AR Quick Look con un archivo USDZ generado en el momento.
 * Si ninguna está disponible, el botón no aparece. La cámara solo se solicita
 * cuando el visitante pulsa el botón (lo pide el propio navegador).
 */

export type ArSupport = "webxr" | "quicklook" | null;

let support: ArSupport | undefined;
let pending: Promise<ArSupport> | null = null;
const listeners = new Set<() => void>();

export interface XRSystemLike {
  isSessionSupported(mode: string): Promise<boolean>;
  requestSession(mode: string, init?: Record<string, unknown>): Promise<XRSessionLike>;
}
export interface XRSessionLike extends EventTarget {
  end(): Promise<void>;
}

export function xr(): XRSystemLike | undefined {
  return (navigator as Navigator & { xr?: XRSystemLike }).xr;
}

export function getArSupport(): ArSupport | undefined {
  if (support !== undefined || typeof window === "undefined") return support;
  if (!pending) {
    pending = (async () => {
      try {
        const sys = xr();
        if (sys && (await sys.isSessionSupported("immersive-ar"))) return "webxr" as const;
      } catch {
        // sin WebXR
      }
      const a = document.createElement("a");
      if (a.relList?.supports?.("ar")) return "quicklook" as const;
      return null;
    })().then((s) => {
      support = s;
      listeners.forEach((l) => l());
      return s;
    });
  }
  return undefined;
}

export function subscribeArSupport(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/*
 * La parte 3D (three.js, exportador USDZ, sesión WebXR) vive en ./arSession y se
 * descarga SOLO al pulsar el botón. Así este módulo, que va en el fragmento de cada
 * estación, no arrastra three.js a las páginas que solo enlazan estaciones (portada,
 * Aprender, 404…), cuya precarga de enlaces descargaría esos fragmentos.
 */

/** AR Quick Look (iOS): exporta un USDZ y lo abre con el visor del sistema. */
export async function openQuickLook(body: Body): Promise<void> {
  const session = await import("./arSession");
  return session.openQuickLook(body);
}

/** WebXR (Android): coloca el cuerpo a 1 m delante del teléfono. */
export async function startWebXR(body: Body, overlay: HTMLElement, onEnd?: () => void): Promise<() => void> {
  const session = await import("./arSession");
  return session.startWebXR(body, overlay, onEnd);
}

/** Descarga por adelantado la parte 3D, para que pedir la sesión ocurra dentro del toque del usuario. */
export function preloadArSession(): void {
  void import("./arSession");
}
