"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UserFix } from "@/lib/orientation";

export type GeoStatus =
  "inactiva" | "solicitando" | "activa" | "denegada" | "no-disponible" | "sin-https" | "sin-senal" | "error";

export interface GeoState {
  status: GeoStatus;
  fix: UserFix | null;
  message: string | null;
}

const MESSAGES: Record<Exclude<GeoStatus, "inactiva" | "activa" | "solicitando">, string> = {
  denegada:
    "No diste permiso para usar tu ubicación. Puedes seguir usando la app con la estación del código QR, o activar la ubicación en los ajustes del navegador.",
  "no-disponible": "Este navegador no permite obtener la ubicación.",
  "sin-https":
    "La ubicación solo funciona en una conexión segura (https). Abre la app desde su dirección https para usar el GPS.",
  "sin-senal": "No se pudo obtener tu posición. Revisa que el GPS esté activado o prueba en un lugar despejado.",
  error: "No se pudo obtener tu posición.",
};

/**
 * Ubicación del visitante. Solo se solicita cuando la persona lo pide
 * (`start`). Las coordenadas se quedan en el teléfono: no se envían a ningún servidor.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: "inactiva", fix: null, message: null });
  const watchId = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setState((s) => ({ ...s, status: "inactiva" }));
  }, []);

  const start = useCallback(() => {
    if (!window.isSecureContext) {
      setState({ status: "sin-https", fix: null, message: MESSAGES["sin-https"] });
      return;
    }
    if (!("geolocation" in navigator)) {
      setState({ status: "no-disponible", fix: null, message: MESSAGES["no-disponible"] });
      return;
    }
    if (watchId.current !== null) return;
    setState((s) => ({ ...s, status: "solicitando", message: null }));
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setState({
          status: "activa",
          message: null,
          fix: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            heading: pos.coords.heading,
            speed: pos.coords.speed,
            timestamp: pos.timestamp,
          },
        });
      },
      (err) => {
        const status: GeoStatus =
          err.code === err.PERMISSION_DENIED
            ? "denegada"
            : err.code === err.POSITION_UNAVAILABLE || err.code === err.TIMEOUT
              ? "sin-senal"
              : "error";
        if (status === "denegada" && watchId.current !== null) {
          navigator.geolocation.clearWatch(watchId.current);
          watchId.current = null;
        }
        setState((s) => ({ status, fix: status === "denegada" ? null : s.fix, message: MESSAGES[status] }));
      },
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 },
    );
  }, []);

  useEffect(
    () => () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    },
    [],
  );

  return { ...state, start, stop };
}
