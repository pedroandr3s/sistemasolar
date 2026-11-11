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

  if (!support) return null;

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
