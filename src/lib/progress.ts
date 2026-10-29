"use client";

import { useSyncExternalStore } from "react";

/**
 * Progreso del visitante, guardado solo en este dispositivo (localStorage).
 * No hay cuentas ni se envía nada a un servidor. Si el almacenamiento no está
 * disponible (modo privado, bloqueado), la app funciona igual sin progreso.
 */

const KEY = "sistema-solar:progreso:v1";
const EVENT = "sistema-solar:progreso";

export interface ProgressState {
  /** Estaciones abiertas (por QR o enlace) con la fecha de la primera visita. */
  visits: Record<string, string>;
  lastStation: string | null;
  /** Mejor puntaje del quiz de cada estación (0–3). */
  quiz: Record<string, number>;
}

const EMPTY: ProgressState = { visits: {}, lastStation: null, quiz: {} };

let cachedRaw: string | null | undefined;
let cachedState: ProgressState = EMPTY;

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): ProgressState {
  if (!raw) return EMPTY;
  try {
    const data = JSON.parse(raw) as Partial<ProgressState>;
    return {
      visits: typeof data.visits === "object" && data.visits ? data.visits : {},
      lastStation: typeof data.lastStation === "string" ? data.lastStation : null,
      quiz: typeof data.quiz === "object" && data.quiz ? data.quiz : {},
    };
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): ProgressState {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedState = parse(raw);
  }
  return cachedState;
}

function getServerSnapshot(): ProgressState {
  return EMPTY;
}

function subscribe(callback: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, callback);
  };
}

function write(next: ProgressState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Almacenamiento no disponible: se ignora sin romper la experiencia.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function recordVisit(stationId: string): void {
  const cur = getSnapshot();
  if (cur.lastStation === stationId && cur.visits[stationId]) return;
  write({
    ...cur,
    visits: cur.visits[stationId] ? cur.visits : { ...cur.visits, [stationId]: new Date().toISOString() },
    lastStation: stationId,
  });
}

export function recordQuiz(stationId: string, score: number): void {
  const cur = getSnapshot();
  const best = Math.max(score, cur.quiz[stationId] ?? 0);
  write({ ...cur, quiz: { ...cur.quiz, [stationId]: best } });
}

export function getLastStation(): string | null {
  if (typeof window === "undefined") return null;
  return getSnapshot().lastStation;
}

export function resetProgress(): void {
  write(EMPTY);
}

/** Hook para la última estación visitada (null en el servidor). */
export function useLastStation(): string | null {
  return useProgress().lastStation;
}
