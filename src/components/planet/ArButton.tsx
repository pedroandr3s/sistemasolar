"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Body } from "@/data/bodies";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/format";
import { AR_PARAM } from "@/config/site";
import { arPlacement, getArSupport, openQuickLook, startWebXR, subscribeArSupport, type ArSupport } from "./ar";

/** Longitud legible: centímetros bajo 1 m, metros con un decimal bajo 10 m. */
function formatLength(meters: number): string {
  if (meters < 1) {
    const cm = meters * 100;
    return `${formatNumber(cm, cm < 10 ? 1 : 0)} cm`;
  }
  return `${formatNumber(meters, meters < 10 ? 1 : 0)} m`;
}

/**
 * Página por la que se entró al sitio en esta carga (la del QR escaneado). Al pasar
 * después de un planeta a otro dentro de la app, este valor no cambia.
 */
const ENTRY_PATH = typeof window === "undefined" ? null : window.location.pathname;
const DISMISSED_KEY = "ar-invitacion-cerrada";

const noSubscribe = () => () => {};

/** ¿La dirección pide la realidad aumentada (?ar=1, de un código QR de AR)? */
function urlAsksForAr(): boolean {
  return new URLSearchParams(window.location.search).get(AR_PARAM) === "1";
}

/** ¿Esta estación es la página por la que se entró (se abrió su enlace o su QR)? */
function isEntryPage(): boolean {
  if (window.location.pathname !== ENTRY_PATH) return false;
  try {
    return window.sessionStorage.getItem(DISMISSED_KEY) !== ENTRY_PATH;
  } catch {
    return true;
  }
}

function rememberDismissed() {
  try {
    window.sessionStorage.setItem(DISMISSED_KEY, window.location.pathname);
  } catch {
    // sin almacenamiento: la invitación volverá a salir al recargar
  }
}

/**
 * Realidad aumentada.
 *
 * - Un botón grande, siempre a la vista bajo el modelo 3D.
 * - Al abrir el enlace de una estación (su código QR), una ventana emergente invita a
 *   verla en realidad aumentada, con el botón para abrirla y una X para cerrarla. Los
 *   navegadores no dejan encender la cámara sin un toque, así que queda a un toque.
 *   No vuelve a salir al pasar de un planeta a otro dentro de la app.
 * - Si el teléfono no admite realidad aumentada, el botón lo explica al pulsarlo (y la
 *   ventana solo aparece si el enlace la pedía con ?ar=1).
 */
export function ArButton({ body }: { body: Body }) {
  const support = useSyncExternalStore<ArSupport | undefined>(subscribeArSupport, getArSupport, () => undefined);
  const askedByUrl = useSyncExternalStore(noSubscribe, urlAsksForAr, () => false);
  const entry = useSyncExternalStore(noSubscribe, isEntryPage, () => false);
  const [state, setState] = useState<"idle" | "starting" | "active" | "error">("idle");
  /** null: decide la regla de entrada; true/false: lo que eligió la persona. */
  const [open, setOpen] = useState<boolean | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const place = arPlacement(body);

  const invited = support ? entry || askedByUrl : support === null && askedByUrl;
  const modalOpen = state !== "active" && (open ?? invited);

  function close() {
    setOpen(false);
    if (state === "error") setState("idle");
    rememberDismissed();
  }

  useEffect(() => {
    if (!modalOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        rememberDismissed();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  async function start() {
    if (!support) {
      setOpen(true);
      return;
    }
    setState("starting");
    try {
      if (support === "quicklook") {
        await openQuickLook(body);
        setState("idle");
      } else if (overlayRef.current) {
        stopRef.current = await startWebXR(body, overlayRef.current);
        setState("active");
      }
      setOpen(false);
      rememberDismissed();
    } catch (e) {
      console.warn("[AR]", e);
      setState("error");
      setOpen(true);
    }
  }

  function stop() {
    stopRef.current?.();
    stopRef.current = null;
    setState("idle");
  }

  return (
    <>
      <button
        type="button"
        className="btn btn--primary btn--big btn--block"
        onClick={start}
        disabled={state === "starting"}
      >
        <Icon name="ar" size={24} />
        {state === "starting" ? "Abriendo la cámara…" : "Ver en realidad aumentada"}
      </button>

      {support === "webxr" &&
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
              <button type="button" className="btn btn--primary btn--big" onClick={stop}>
                <Icon name="close" size={22} />
                Salir de la realidad aumentada
              </button>
            </div>
          </div>,
          document.body,
        )}

      {modalOpen &&
        createPortal(
          <div className="ar-prompt" role="dialog" aria-modal="true" aria-labelledby="ar-prompt-title">
            <div className="ar-prompt__card">
              <button ref={closeRef} type="button" className="ar-prompt__close" onClick={close} aria-label="Cerrar">
                <Icon name="close" size={26} />
              </button>
              <span className="ar-prompt__disc" aria-hidden="true" style={{ background: body.color }} />
              {support ? (
                <>
                  <p id="ar-prompt-title" className="ar-prompt__title">
                    ¿Quieres ver {body.nameInSentence} aquí, frente a ti?
                  </p>
                  <p>
                    Con la cámara aparece a su tamaño del recorrido: {formatLength(place.diameterM)} de ancho. Tu
                    teléfono te pedirá permiso.
                  </p>
                  {state === "error" && (
                    <p className="ar-prompt__error" role="alert">
                      No se pudo abrir. Revisa el permiso de la cámara y prueba otra vez.
                    </p>
                  )}
                  <button
                    type="button"
                    className="btn btn--primary btn--big btn--block"
                    onClick={start}
                    disabled={state === "starting"}
                  >
                    <Icon name="ar" size={24} />
                    {state === "starting" ? "Abriendo la cámara…" : "Ver en realidad aumentada"}
                  </button>
                  <p className="small muted">Hazlo detenido, en un lugar seguro y abierto.</p>
                </>
              ) : (
                <>
                  <p id="ar-prompt-title" className="ar-prompt__title">
                    Este teléfono no puede abrir la realidad aumentada
                  </p>
                  <p>
                    En Android se necesita Chrome y un teléfono compatible; en iPhone, Safari. Igual puedes girar y
                    acercar el modelo 3D de {body.nameInSentence}.
                  </p>
                  <button type="button" className="btn btn--primary btn--big btn--block" onClick={close}>
                    <Icon name="planet" size={24} />
                    Ver el modelo 3D
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
