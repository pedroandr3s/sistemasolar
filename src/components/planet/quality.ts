"use client";

export type Quality = "baja" | "alta";

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
}

/**
 * Estimación prudente de la capacidad del dispositivo para elegir texturas
 * (1k / 2k) y la resolución máxima de renderizado.
 */
let qualityCache: Quality | null = null;

export function detectQuality(): Quality {
  if (qualityCache) return qualityCache;
  qualityCache = probeQuality();
  return qualityCache;
}

function probeQuality(): Quality {
  if (typeof navigator === "undefined") return "baja";
  const nav = navigator as NavigatorWithMemory;
  const memory = nav.deviceMemory ?? 4;
  const cores = nav.hardwareConcurrency ?? 4;
  const saveData = nav.connection?.saveData === true;
  const slowNet = ["slow-2g", "2g", "3g"].includes(nav.connection?.effectiveType ?? "");
  if (saveData || slowNet || memory <= 3 || cores <= 4) return "baja";
  return "alta";
}

export function maxDpr(quality: Quality): number {
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  return Math.min(dpr, quality === "alta" ? 2 : 1.5);
}

export type WebGLSupport = "webgl2" | "webgl1" | "ninguno";

let webglCache: WebGLSupport | null = null;

/** Detecta WebGL una sola vez por sesión (crear contextos es costoso). */
export function detectWebGL(): WebGLSupport {
  if (webglCache) return webglCache;
  webglCache = probeWebGL();
  return webglCache;
}

function probeWebGL(): WebGLSupport {
  if (typeof document === "undefined") return "ninguno";
  try {
    const canvas = document.createElement("canvas");
    const gl2 = canvas.getContext("webgl2");
    if (gl2) {
      gl2.getExtension("WEBGL_lose_context")?.loseContext();
      return "webgl2";
    }
    const gl1 = canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
    if (gl1) {
      (gl1 as WebGLRenderingContext).getExtension("WEBGL_lose_context")?.loseContext();
      return "webgl1";
    }
  } catch {
    // sin WebGL
  }
  return "ninguno";
}
