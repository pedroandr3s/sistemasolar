"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Valor que solo existe en el navegador (p. ej. capacidades del dispositivo).
 * En el servidor y durante la hidratación devuelve `serverValue`, evitando
 * desajustes de hidratación; luego entrega el valor real.
 */
export function useClientValue<T>(compute: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, compute, () => serverValue);
}

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** `true` si el sistema operativo pide reducir el movimiento. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** Estado de conexión informado por el navegador. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}
