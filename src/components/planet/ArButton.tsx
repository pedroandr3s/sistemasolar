"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Body } from "@/data/bodies";
import { Icon } from "@/components/ui/Icon";
import { getArSupport, openQuickLook, startWebXR, subscribeArSupport, type ArSupport } from "./ar";

/** Botón de realidad aumentada: solo aparece si el dispositivo la admite. */
export function ArButton({ body }: { body: Body }) {
  const support = useSyncExternalStore<ArSupport | undefined>(subscribeArSupport, getArSupport, () => undefined);
  const [state, setState] = useState<"idle" | "starting" | "active" | "error">("idle");
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  async function start() {
    if (!support) return;
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

  if (support === null) {
    const secure = typeof window !== "undefined" && window.isSecureContext;
    return (
      <p className="ar-note" style={{ margin: 0, display: "flex", gap: 8, alignItems: "flex-start" }}>
        <Icon name="ar" size={18} />
        <span>
          {secure
            ? "La realidad aumentada funciona en celulares Android con Chrome y ARCore, y en iPhone o iPad. Este dispositivo no la admite."
            : "La realidad aumentada necesita abrir la app con https. Hoy esta conexión no es segura."}
        </span>
      </p>
    );
  }

  return (
    <>
      <div style={{ display: "grid", gap: 8, justifyItems: "start" }}>
        <button
          type="button"
          className="ar-cta"
          onClick={start}
          disabled={support === undefined || state === "starting"}
        >
          <Icon name="ar" size={24} />
          {support === undefined
            ? "Comprobando realidad aumentada…"
            : state === "starting"
              ? "Abriendo la cámara…"
              : state === "error"
                ? "No se pudo abrir la realidad aumentada"
                : "Ver en realidad aumentada"}
        </button>
        <span className="ar-note">
          {support === "quicklook"
            ? "Se abre el visor de tu iPhone o iPad: apunta a una superficie y coloca el planeta."
            : "Se abre la cámara: apunta a una superficie plana y toca para colocar el planeta."}
        </span>
      </div>
      {support === "webxr" &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={overlayRef}
            style={{
              position: "fixed",
              inset: 0,
              pointerEvents: "none",
              display: state === "active" ? "block" : "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 16,
                right: 16,
                bottom: 32,
                display: "flex",
                justifyContent: "center",
                pointerEvents: "auto",
              }}
            >
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
