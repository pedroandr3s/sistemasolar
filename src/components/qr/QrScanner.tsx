"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { STATIONS } from "@/config/stations";
import { stationPath } from "@/config/site";
import { stationIdFromQrText } from "@/lib/qrScan";

type Status = "inactivo" | "iniciando" | "escaneando" | "denegado" | "sin-camara" | "sin-https" | "listo";

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

const IDS = STATIONS.map((s) => s.id);

/**
 * Escáner de QR dentro de la página: abre la cámara trasera, lee el código y abre la
 * estación. Usa `BarcodeDetector` si el navegador lo trae y, si no, la biblioteca jsQR.
 * La cámara solo se enciende al abrir esta página y se apaga al salir; las imágenes
 * se procesan en el teléfono y no se envían a ningún servidor.
 */
export function QrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastBadRef = useRef<{ text: string; at: number } | null>(null);
  const [status, setStatus] = useState<Status>("inactivo");
  const [message, setMessage] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  /** Decodifica una imagen o un cuadro de video: devuelve el texto del QR o `null`. */
  const decode = useCallback(async (source: HTMLVideoElement | ImageBitmap): Promise<string | null> => {
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (Detector) {
      try {
        const found = await new Detector({ formats: ["qr_code"] }).detect(source);
        if (found[0]?.rawValue) return found[0].rawValue;
      } catch {
        // cae a jsQR
      }
    }
    const canvas = (canvasRef.current ??= document.createElement("canvas"));
    const w = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
    const h = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
    if (!w || !h) return null;
    const scale = Math.min(1, 720 / Math.max(w, h));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { default: jsQR } = await import("jsqr");
    return jsQR(data.data, data.width, data.height, { inversionAttempts: "dontInvert" })?.data ?? null;
  }, []);

  /** Actúa sobre el texto leído. Devuelve `true` si abrió una estación. */
  const handleText = useCallback(
    (text: string): boolean => {
      const id = stationIdFromQrText(text, IDS);
      if (id) {
        stop();
        setStatus("listo");
        setMessage("¡Código leído! Abriendo la estación…");
        navigator.vibrate?.(60);
        router.push(stationPath(id));
        return true;
      }
      const now = Date.now();
      if (!lastBadRef.current || lastBadRef.current.text !== text || now - lastBadRef.current.at > 2500) {
        lastBadRef.current = { text, at: now };
        setMessage("Ese código QR no es de una estación de este recorrido.");
      }
      return false;
    },
    [router, stop],
  );

  const start = useCallback(async () => {
    setMessage(null);
    if (!window.isSecureContext) {
      setStatus("sin-https");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("sin-camara");
      return;
    }
    setStatus("iniciando");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stop();
        return;
      }
      video.srcObject = stream;
      await video.play();
      setStatus("escaneando");
      let last = 0;
      let busy = false;
      const tick = (t: number) => {
        rafRef.current = requestAnimationFrame(tick);
        if (busy || t - last < 160 || video.readyState < 2) return;
        last = t;
        busy = true;
        decode(video)
          .then((text) => {
            if (text) handleText(text);
          })
          .catch(() => undefined)
          .finally(() => {
            busy = false;
          });
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      stop();
      const name = (e as DOMException | undefined)?.name;
      setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denegado" : "sin-camara");
    }
  }, [decode, handleText, stop]);

  // Se enciende al abrir la página y se apaga al salir o al enviar la pestaña a segundo plano.
  useEffect(() => {
    const t = window.setTimeout(() => void start(), 0);
    const onHide = () => {
      if (document.hidden) {
        stop();
        setStatus("inactivo");
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("visibilitychange", onHide);
      stop();
    };
  }, [start, stop]);

  /** Alternativa sin cámara en vivo: una foto del QR (funciona también por HTTP en la red local). */
  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setMessage("Leyendo la foto…");
    try {
      const bmp = await createImageBitmap(file);
      const text = await decode(bmp);
      bmp.close();
      if (!text) setMessage("No encontré un código QR en esa foto. Prueba de nuevo, más cerca y con buena luz.");
      else handleText(text);
    } catch {
      setMessage("No se pudo leer la foto.");
    }
  }

  const scanning = status === "escaneando";
  const needsFallback = status === "sin-https" || status === "denegado" || status === "sin-camara";

  return (
    <div className="wrap" style={{ paddingTop: 18, display: "grid", gap: 16 }}>
      <div>
        <h1 className="display" style={{ fontSize: "2.4rem", margin: 0 }}>
          Escanear QR
        </h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          Apunta la cámara al código de una escultura. Se abrirá su planeta en 3D.
        </p>
      </div>

      <div className="scanner">
        <video ref={videoRef} playsInline muted aria-label="Imagen de la cámara" />
        {scanning && <div className="scanner__frame" aria-hidden="true" />}
        {!scanning && (
          <div className="scanner__idle">
            {status === "iniciando" && <p role="status">Abriendo la cámara…</p>}
            {status === "listo" && <p role="status">¡Listo!</p>}
            {(status === "inactivo" || needsFallback) && (
              <>
                <Icon name="qr" size={54} />
                <p style={{ margin: 0 }}>
                  {status === "sin-https" &&
                    "La cámara dentro de la página necesita una conexión segura (https). Usa la cámara de tu teléfono o toma una foto del código."}
                  {status === "denegado" &&
                    "No diste permiso para usar la cámara. Puedes activarlo en los ajustes del navegador o tomar una foto del código."}
                  {status === "sin-camara" &&
                    "No se pudo abrir la cámara en este dispositivo. Prueba con una foto del código."}
                  {status === "inactivo" && "La cámara está apagada."}
                </p>
                {status === "inactivo" && (
                  <button type="button" className="btn btn--primary" onClick={() => void start()}>
                    Activar cámara
                  </button>
                )}
              </>
            )}
          </div>
        )}
        {scanning && !message && <p className="scanner__msg">Encuadra el código dentro del marco</p>}
        {message && (
          <p className="scanner__msg" role="status">
            {message}
          </p>
        )}
      </div>

      <label className="btn btn--block" style={{ cursor: "pointer" }}>
        <Icon name="qr" size={20} />
        Tomar o elegir una foto del código
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            void onPhoto(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>

      <div className="panel" style={{ display: "grid", gap: 6 }}>
        <strong>¿Sin código a mano?</strong>
        <span className="muted small">
          Abre una estación directamente desde la <Link href="/">portada</Link> o prueba con el{" "}
          <Link href="/qr">simulador de QR</Link>, que muestra los códigos en la pantalla de un computador.
        </span>
      </div>
    </div>
  );
}
