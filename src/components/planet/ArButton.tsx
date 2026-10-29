"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Body } from "@/data/bodies";
import { Icon } from "@/components/ui/Icon";
import { getArSupport, openQuickLook, preloadArSession, startWebXR, subscribeArSupport, type ArSupport } from "./ar";

/** Texto claro (y el nombre técnico del error) cuando la realidad aumentada no se pudo abrir. */
function describeError(e: unknown): string {
  const name = (e as { name?: string } | null)?.name ?? "Error";
  const msg = (e as { message?: string } | null)?.message ?? "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "El navegador no dio permiso para usar la cámara. Acepta el permiso de cámara y de realidad aumentada y vuelve a intentarlo.";
  if (name === "NotSupportedError")
    return "Este teléfono o navegador no puede iniciar la realidad aumentada. En Android hace falta Chrome y «Google Play Services para RA» (ARCore) instalado y actualizado.";
  if (name === "InvalidStateError")
    return "Ya hay una sesión de realidad aumentada abierta. Ciérrala y vuelve a intentarlo.";
  return `No se pudo abrir la realidad aumentada (${name}${msg ? `: ${msg.slice(0, 120)}` : ""}).`;
}

/**
 * Botón de realidad aumentada. Aparece si el dispositivo la admite; si no, explica por qué.
 * - Android (Chrome + ARCore, https): sesión WebXR «immersive-ar».
 * - iPhone/iPad (Safari): AR Quick Look.
 */
export function ArButton({ body }: { body: Body }) {
  const support = useSyncExternalStore<ArSupport | undefined>(subscribeArSupport, getArSupport, () => undefined);
  const [state, setState] = useState<"idle" | "starting" | "active" | "error">("idle");
  const [errorText, setErrorText] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  // Descarga la parte 3D antes del toque: así la sesión se pide dentro del gesto del usuario.
  useEffect(() => {
    if (support) preloadArSession();
  }, [support]);

  async function start() {
    if (!support) return;
    setErrorText(null);
    setState("starting");
    try {
      if (support === "quicklook") {
        await openQuickLook(body);
        setState("idle");
      } else if (overlayRef.current) {
        stopRef.current = await startWebXR(body, overlayRef.current, () => {
          stopRef.current = null;
          setState("idle");
        });
        setState("active");
      }
    } catch (e) {
      console.warn("[AR]", e);
      setErrorText(describeError(e));
      setState("error");
    }
  }

  function stop() {
    stopRef.current?.();
  }

  if (support === null) {
    const secure = typeof window !== "undefined" && window.isSecureContext;
    return (
      <p className="ar-note" style={{ margin: 0, display: "flex", gap: 8, alignItems: "flex-start" }}>
        <Icon name="ar" size={18} />
        <span>
          {secure
            ? "La realidad aumentada funciona en celulares Android con Chrome y ARCore (Google Play Services para RA), y en iPhone o iPad. Este dispositivo o navegador no la admite."
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
          disabled={support === undefined || state === "starting" || state === "active"}
        >
          <Icon name="ar" size={24} />
          {support === undefined
            ? "Comprobando realidad aumentada…"
            : state === "starting"
              ? "Abriendo la cámara…"
              : state === "active"
                ? "Realidad aumentada abierta"
                : "Ver en realidad aumentada"}
        </button>
        {errorText ? (
          <span className="ar-note" role="alert" style={{ color: "var(--color-coral)" }}>
            {errorText}
          </span>
        ) : (
          <span className="ar-note">
            {support === "quicklook"
              ? "Se abre el visor de tu iPhone o iPad: apunta a una superficie y coloca el planeta."
              : "Se abre la cámara: el planeta aparece frente a ti. Muévete para verlo desde todos los lados."}
          </span>
        )}
      </div>
      {support === "webxr" &&
        typeof document !== "undefined" &&
        createPortal(
          // El contenedor de la superposición debe estar «dibujado» al pedir la sesión (no con display: none),
          // si no, Chrome no puede ponerlo a pantalla completa. Se mantiene transparente e inerte mientras no se usa.
          <div
            ref={overlayRef}
            style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "transparent" }}
          >
            <div
              style={{
                position: "absolute",
                left: 16,
                right: 16,
                bottom: 32,
                display: state === "active" ? "flex" : "none",
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
