"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { headingFromDeviceOrientation } from "@/lib/orientation";

export type CompassStatus =
  "inactiva" | "solicitando" | "activa" | "denegada" | "no-disponible" | "sin-https" | "sin-datos";

export interface CompassState {
  status: CompassStatus;
  /**
   * Orientación del teléfono: grados desde el norte MAGNÉTICO hacia donde mira (borde superior
   * con el teléfono horizontal, parte trasera con el teléfono vertical). Corregir con la declinación.
   */
  heading: number | null;
  /** Precisión informada por el sistema (grados). `null` si el navegador no la entrega. */
  accuracy: number | null;
  source: "ios" | "absoluta" | null;
}

interface OrientationEventIOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

interface DeviceOrientationEventStatic {
  requestPermission?: () => Promise<"granted" | "denied">;
}

function smoothAngle(prev: number | null, next: number, k = 0.25): number {
  if (prev === null) return next;
  let d = next - prev;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return (prev + d * k + 360) % 360;
}

/**
 * Brújula del teléfono.
 * - iOS (Safari): requiere permiso explícito y entrega `webkitCompassHeading`.
 * - Android (Chrome): evento `deviceorientationabsolute`.
 * Si el navegador solo entrega orientación relativa (sin referencia al norte),
 * se informa como «sin datos»: no se simula una brújula.
 */
export function useCompass() {
  const [state, setState] = useState<CompassState>({ status: "inactiva", heading: null, accuracy: null, source: null });
  const handlerRef = useRef<((e: Event) => void) | null>(null);
  const eventNameRef = useRef<string | null>(null);
  const headingRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const detach = useCallback(() => {
    if (handlerRef.current && eventNameRef.current)
      window.removeEventListener(eventNameRef.current, handlerRef.current);
    handlerRef.current = null;
    eventNameRef.current = null;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
  }, []);

  const start = useCallback(async () => {
    if (!window.isSecureContext) {
      setState((s) => ({ ...s, status: "sin-https" }));
      return;
    }
    if (typeof window.DeviceOrientationEvent === "undefined") {
      setState((s) => ({ ...s, status: "no-disponible" }));
      return;
    }
    setState((s) => ({ ...s, status: "solicitando" }));
    const ctor = window.DeviceOrientationEvent as unknown as DeviceOrientationEventStatic;
    if (typeof ctor.requestPermission === "function") {
      try {
        const res = await ctor.requestPermission();
        if (res !== "granted") {
          setState((s) => ({ ...s, status: "denegada" }));
          return;
        }
      } catch {
        setState((s) => ({ ...s, status: "denegada" }));
        return;
      }
    }

    detach();
    const useAbsolute = "ondeviceorientationabsolute" in window;
    const eventName = useAbsolute ? "deviceorientationabsolute" : "deviceorientation";
    let received = false;

    const handler = (ev: Event) => {
      const e = ev as OrientationEventIOS;
      let heading: number | null = null;
      let accuracy: number | null = null;
      let source: CompassState["source"] = null;
      if (typeof e.webkitCompassHeading === "number" && !Number.isNaN(e.webkitCompassHeading)) {
        heading = e.webkitCompassHeading;
        accuracy =
          typeof e.webkitCompassAccuracy === "number" && e.webkitCompassAccuracy >= 0 ? e.webkitCompassAccuracy : null;
        source = "ios";
      } else if ((e.absolute || useAbsolute) && typeof e.alpha === "number") {
        const screenAngle = window.screen.orientation?.angle ?? 0;
        // Rotación completa (alpha, beta, gamma): estable aunque el teléfono esté inclinado o casi vertical.
        heading =
          typeof e.beta === "number" && typeof e.gamma === "number"
            ? headingFromDeviceOrientation(e.alpha, e.beta, e.gamma, screenAngle)
            : (360 - e.alpha + screenAngle) % 360;
        source = "absoluta";
      }
      if (heading === null) return;
      received = true;
      headingRef.current = smoothAngle(headingRef.current, heading);
      setState({ status: "activa", heading: headingRef.current, accuracy, source });
    };

    handlerRef.current = handler;
    eventNameRef.current = eventName;
    window.addEventListener(eventName, handler);
    timeoutRef.current = window.setTimeout(() => {
      if (!received) {
        detach();
        setState({ status: "sin-datos", heading: null, accuracy: null, source: null });
      }
    }, 3500);
  }, [detach]);

  const stop = useCallback(() => {
    detach();
    headingRef.current = null;
    setState({ status: "inactiva", heading: null, accuracy: null, source: null });
  }, [detach]);

  useEffect(() => () => detach(), [detach]);

  return { ...state, start, stop };
}
