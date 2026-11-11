"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Body } from "@/data/bodies";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/format";
import { arPlacement, getArSupport, openQuickLook, startWebXR, subscribeArSupport, type ArSupport } from "./ar";

/** Longitud legible: centímetros bajo 1 m, metros con un decimal bajo 10 m. */
function formatLength(meters: number): string {
  if (meters < 1) {
    const cm = meters * 100;
    return `${formatNumber(cm, cm < 10 ? 1 : 0)} cm`;
  }
  return `${formatNumber(meters, meters < 10 ? 1 : 0)} m`;
}

/** Botón de realidad aumentada: solo aparece si el dispositivo la admite. */
export function ArButton({ body }: { body: Body }) {
  const support = useSyncExternalStore<ArSupport | undefined>(subscribeArSupport, getArSupport, () => undefined);
  const [state, setState] = useState<"idle" | "starting" | "active" | "error">("idle");
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  if (!support) return null;
  const place = arPlacement(body);

  async function start() {
    setState("starting");
    try {
      if (support === "quicklook") {
        await openQuickLook(body);
        setState("idle");
      } else if (overlayRef.current) {
        stopRef.current = await startWebXR(body, overlayRef.current);
        setState("active");
      }
    } catch (e) {
      console.warn("[AR]", e);
      setState("error");
    }
  }

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setState("idle");
  }

  return (
    <>
      <button type="button" className="chip" onClick={start} disabled={state === "starting"}>
        <Icon name="ar" size={18} />
        {state === "starting" ? "Abriendo…" : state === "error" ? "AR no disponible" : "Realidad aumentada"}
      </button>
      {support === "webxr" &&
        typeof document !== "undefined" &&
        createPortal(
          <div ref={overlayRef} className="ar-overlay" data-active={state === "active"}>
            <div className="ar-overlay__caption">
              <strong>{body.name}, al tamaño del recorrido</strong>
              <span>
                Mide {formatLength(place.diameterM)} de diámetro y está a unos {formatLength(place.distanceM)} frente a
                ti. Muévete para verlo desde otro ángulo.
              </span>
            </div>
            <div className="ar-overlay__actions">
              <button type="button" className="btn btn--primary" onClick={stop}>
                Salir de la realidad aumentada
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
