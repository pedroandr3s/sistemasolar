"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BODIES } from "@/data/bodies";
import { STATIONS } from "@/config/stations";
import { stationPath } from "@/config/site";
import { stationPathFromQr } from "@/lib/qr-scan";
import { Icon } from "@/components/ui/Icon";

const ORDERED = [...STATIONS].sort((a, b) => a.order - b.order);
const IDS = ORDERED.map((s) => s.id);

type Status = "starting" | "scanning" | "denied" | "unavailable" | "insecure";

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

/**
 * Escáner de códigos QR dentro de la app: el botón principal de la portada.
 *
 * La cámara se pide solo al pulsar el botón y se apaga al cerrar. La imagen se analiza
 * en el propio teléfono (BarcodeDetector del navegador o, si no existe, la biblioteca
 * jsQR, que se descarga recién entonces); nada se envía a ningún servidor. Solo se
 * aceptan códigos de las paradas de este recorrido. Si la cámara falla o se niega el
 * permiso, la ventana ofrece elegir la parada de una lista: nunca es un callejón sin salida.
 */
export function QrScanner() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("starting");
  const [foreign, setForeign] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";

    async function run() {
      if (!window.isSecureContext) return setStatus("insecure");
      if (!navigator.mediaDevices?.getUserMedia) return setStatus("unavailable");
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch (e) {
        if (cancelled) return;
        const name = (e as DOMException)?.name;
        return setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
      }
      const video = videoRef.current;
      if (cancelled || !video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      await video.play().catch(() => {});
      if (cancelled) return;
      setStatus("scanning");

      // Lector: el del navegador si existe; si no, jsQR (se descarga solo aquí).
      let read: (v: HTMLVideoElement) => Promise<string | null>;
      const Native = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => BarcodeDetectorLike })
        .BarcodeDetector;
      if (Native) {
        const detector = new Native({ formats: ["qr_code"] });
        read = async (v) => (await detector.detect(v))[0]?.rawValue ?? null;
      } else {
        const { default: jsQR } = await import("jsqr");
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        read = async (v) => {
          if (!ctx || !v.videoWidth) return null;
          const scale = Math.min(1, 640 / v.videoWidth);
          canvas.width = Math.round(v.videoWidth * scale);
          canvas.height = Math.round(v.videoHeight * scale);
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          return jsQR(img.data, img.width, img.height)?.data ?? null;
        };
      }

      const tick = async () => {
        if (cancelled) return;
        try {
          const text = await read(video);
          if (text) {
            const path = stationPathFromQr(text, IDS);
            if (path) {
              cancelled = true;
              setOpen(false);
              router.push(path);
              return;
            }
            setForeign(true);
          }
        } catch {
          // un cuadro ilegible no detiene el escáner
        }
        timer = setTimeout(tick, 220);
      };
      void tick();
    }
    void run();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open, router]);

  function start() {
    setStatus("starting");
    setForeign(false);
    setOpen(true);
  }

  const problem =
    status === "denied"
      ? "No hay permiso para usar la cámara. Puedes darlo en los ajustes del navegador, o elegir tu parada aquí abajo."
      : status === "insecure"
        ? "La cámara solo funciona con conexión segura (https). Elige tu parada aquí abajo."
        : status === "unavailable"
          ? "No se pudo abrir la cámara de este equipo. Elige tu parada aquí abajo."
          : null;

  return (
    <>
      <button type="button" className="btn btn--primary btn--big btn--block" onClick={start}>
        <Icon name="qr" size={26} />
        Escanear QR
      </button>
      {open &&
        createPortal(
          <div className="scanner" role="dialog" aria-modal="true" aria-labelledby="scanner-title">
            <div className="scanner__card">
              <button ref={closeRef} type="button" className="ar-prompt__close" onClick={close} aria-label="Cerrar">
                <Icon name="close" size={26} />
              </button>
              <p id="scanner-title" className="scanner__title">
                Apunta al código de la escultura
              </p>
              {problem ? (
                <p className="notice notice--error" role="alert">
                  <Icon name="warning" />
                  <span>{problem}</span>
                </p>
              ) : (
                <div className="scanner__view">
                  <video ref={videoRef} playsInline muted aria-label="Imagen de la cámara" />
                  <span className="scanner__frame" aria-hidden="true" />
                  <p className="scanner__status" role="status">
                    {status === "starting"
                      ? "Abriendo la cámara…"
                      : foreign
                        ? "Ese código no es de este recorrido. Prueba con el de la escultura."
                        : "Buscando el código…"}
                  </p>
                </div>
              )}
              <p className="scanner__or">¿No hay código cerca? Elige tu parada:</p>
              <ul className="scanner__list">
                {ORDERED.map((s) => (
                  <li key={s.id}>
                    <Link href={stationPath(s.id)} className="chip" onClick={close}>
                      <span
                        className="scanner__dot"
                        aria-hidden="true"
                        style={{ background: BODIES[s.bodyId].color }}
                      />
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
