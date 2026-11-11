"use client";

import type { Body } from "@/data/bodies";
import { sizeAtScaleMeters } from "@/config/scale";

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

/** Dónde y de qué tamaño se muestra un cuerpo en realidad aumentada. */
export interface ArPlacement {
  /** Diámetro a la escala del recorrido (1 UA = 2 km), en metros. */
  diameterM: number;
  /** Radio del cuerpo, en metros. */
  radiusM: number;
  /** Radio de todo lo que se dibuja (incluye los anillos), en metros. */
  extentM: number;
  /** Distancia horizontal entre el visitante y el centro del cuerpo, en metros. */
  distanceM: number;
  /** Altura del centro sobre los ojos del visitante, en metros. */
  liftM: number;
}

/**
 * Tamaño y ubicación en realidad aumentada, a la MISMA escala que el recorrido:
 * el Sol mide unos 18,6 m de diámetro, Júpiter 1,9 m, la Tierra 17 cm y Mercurio
 * 6,5 cm. La distancia crece con el tamaño para que el cuerpo completo quepa en
 * la pantalla (el Sol queda a unos 34 m; Mercurio, a medio metro), y los cuerpos
 * grandes se elevan para que no queden enterrados en el suelo.
 */
export function arPlacement(body: Body): ArPlacement {
  const diameterM = sizeAtScaleMeters(body.diameterKm);
  const radiusM = diameterM / 2;
  const rings = body.render.rings;
  const extentM = rings ? (rings.outerKm / (body.diameterKm / 2)) * radiusM : radiusM;
  const distanceM = Math.max(0.5, extentM * 3.6 + 0.3);
  const liftM = Math.max(0, radiusM - 0.6);
  return { diameterM, radiusM, extentM, distanceM, liftM };
}

/**
 * AR Quick Look (iPhone) coloca el modelo sobre el suelo, junto al visitante, y no
 * permite elegir la distancia: un Sol de 18,6 m lo dejaría dentro de la esfera. Allí
 * los cuerpos de más de 4 m se reducen a la décima parte (el Sol: 1,86 m).
 */
export function quickLookScale(body: Body): number {
  return sizeAtScaleMeters(body.diameterKm) > 4 ? 0.1 : 1;
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
export async function startWebXR(body: Body, overlay: HTMLElement): Promise<() => void> {
  const session = await import("./arSession");
  return session.startWebXR(body, overlay);
}
