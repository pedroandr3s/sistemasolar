"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getArSupport, subscribeArSupport, type ArSupport } from "@/components/planet/ar";
import { getConfiguredSiteUrl, stationUrl, validateSiteUrl } from "@/config/site";
import { BODIES, BODY_ORDER } from "@/data/bodies";
import { heliocentricEcliptic, length } from "@/lib/astro";
import { chileUtcLabel, formatChileDateTime, formatUtc } from "@/lib/time";
import { formatNumber } from "@/lib/format";
import { findPlacement, getPlacements } from "@/lib/stations";
import { getRoute } from "@/lib/route";
import { useClientValue, useOnline } from "@/lib/useClient";
import { detectQuality, detectWebGL } from "@/components/planet/quality";
import { useGeolocation } from "@/components/orient/useGeolocation";
import { useCompass } from "@/components/orient/useCompass";
import { useProgress } from "@/lib/progress";

type Level = "ok" | "aviso" | "error" | "info";

function Row({ label, level, value, detail }: { label: string; level: Level; value: string; detail?: string }) {
  const color =
    level === "ok"
      ? "var(--color-alamo)"
      : level === "error"
        ? "var(--color-coral)"
        : level === "aviso"
          ? "var(--color-sol)"
          : "var(--color-mist)";
  const word =
    level === "ok" ? "Correcto" : level === "error" ? "Problema" : level === "aviso" ? "Revisar" : "Información";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 2,
        padding: "12px 0",
        borderTop: "1px solid var(--line)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span className="small" style={{ color, fontWeight: 600, whiteSpace: "nowrap" }}>
          {word}
        </span>
      </div>
      <span className="small" style={{ wordBreak: "break-word" }}>
        {value}
      </span>
      {detail && <span className="small muted">{detail}</span>}
    </div>
  );
}

const TEXTURES = Array.from(
  new Set(
    BODY_ORDER.flatMap((id) => {
      const r = BODIES[id].render;
      return [r.texture?.low, r.bump, r.clouds?.texture, r.cloudCover, r.rings?.texture].filter((x): x is string =>
        Boolean(x),
      );
    }),
  ),
);

/** URL de una tesela del mapa base sobre Ñuble (z10), del proveedor configurado. */
const TILE_TEST_URL = (process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png")
  .replace("{z}", "10")
  .replace("{x}", "308")
  .replace("{y}", "634")
  .replace("{s}", "a");
const TILE_HOST = (() => {
  try {
    return new URL(TILE_TEST_URL).host;
  } catch {
    return "el proveedor del mapa";
  }
})();

/**
 * Panel de diagnóstico para pruebas en teléfonos. No pide permisos por su
 * cuenta y no contacta servidores externos por sí solo: el GPS, la brújula y
 * el mapa base se prueban solo al pulsar su botón. Lo único que descarga al
 * abrirse son las texturas del propio sitio. No envía datos del visitante.
 */
export function Diagnostics() {
  const origin = useClientValue(() => window.location.origin, "");
  const secure = useClientValue(() => window.isSecureContext, false);
  const qrParam = useClientValue(() => new URLSearchParams(window.location.search).get("estacion"), null);
  const webgl = useClientValue(detectWebGL, null);
  const quality = useClientValue(detectQuality, "baja");
  const online = useOnline();
  const progress = useProgress();
  const geo = useGeolocation();
  const compass = useCompass();
  const arSupport = useSyncExternalStore<ArSupport | undefined>(subscribeArSupport, getArSupport, () => undefined);
  const hasXr = useClientValue(() => "xr" in navigator, false);

  const [geoPermission, setGeoPermission] = useState<string>("desconocido");
  const [tile, setTile] = useState<"sin-probar" | "probando" | "ok" | "error">("sin-probar");
  const [resources, setResources] = useState<{ ok: number; failed: string[] } | null>(null);
  const [sw, setSw] = useState<string>("comprobando");
  const [now] = useState(() => new Date());

  useEffect(() => {
    navigator.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((s) => setGeoPermission(s.state))
      .catch(() => setGeoPermission("no informado"));

    Promise.all(
      TEXTURES.map((u) =>
        fetch(u, { method: "GET", cache: "no-store" })
          .then((r) => (r.ok ? null : u))
          .catch(() => u),
      ),
    ).then((res) =>
      setResources({ ok: res.filter((x) => x === null).length, failed: res.filter((x): x is string => x !== null) }),
    );

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistration()
        .then((r) => setSw(r ? (r.active ? "activo" : "registrado") : "no registrado"))
        .catch(() => setSw("no disponible"));
    } else {
      Promise.resolve().then(() => setSw("no disponible"));
    }
  }, []);

  const testTiles = () => {
    setTile("probando");
    const img = new Image();
    img.onload = () => setTile("ok");
    img.onerror = () => setTile("error");
    img.src = TILE_TEST_URL;
  };

  const configured = getConfiguredSiteUrl();
  const prodCheck = validateSiteUrl(configured, "produccion");
  const devCheck = validateSiteUrl(configured, "desarrollo");
  const matches = configured && origin ? configured === origin : false;
  const stationId = qrParam ?? progress.lastStation;
  const station = stationId ? findPlacement(stationId) : undefined;
  const earthAU = length(heliocentricEcliptic("tierra", now));
  const placements = getPlacements();
  const routeKm = getRoute().length / 1000;

  return (
    <div className="wrap" style={{ paddingTop: 14 }}>
      <h1 className="display" style={{ fontSize: "2.4rem", margin: 0 }}>
        Diagnóstico
      </h1>
      <p className="muted" style={{ marginTop: 6 }}>
        Para probar la app en un teléfono antes de instalarla. Nada de esto se envía a ningún servidor.
      </p>

      <h2 className="section-title" style={{ fontSize: "1.3rem", marginTop: 22 }}>
        Dirección y códigos QR
      </h2>
      <Row
        label="URL base configurada (NEXT_PUBLIC_SITE_URL)"
        level={!configured ? "error" : prodCheck.ok ? "ok" : devCheck.ok ? "aviso" : "error"}
        value={configured ?? "Sin configurar"}
        detail={
          !configured
            ? "Los QR de producción no se pueden generar sin esta variable."
            : prodCheck.ok
              ? "Apta para los QR definitivos."
              : [...prodCheck.errors].join(" ")
        }
      />
      <Row
        label="Dirección con la que abriste esta página"
        level={matches ? "ok" : "info"}
        value={origin || "—"}
        detail={
          matches
            ? "Coincide con la URL configurada."
            : "Para pruebas puedes generar QR con esta dirección en la página «QR de prueba»."
        }
      />
      <Row
        label="Estación identificada"
        level={station ? "ok" : "info"}
        value={
          station
            ? `${station.station.name} (${qrParam ? "parámetro ?estacion" : "última estación abierta"})`
            : "Ninguna"
        }
        detail={
          station && configured
            ? `Su QR apunta a ${stationUrl(configured, station.station.id)}`
            : "Abre una estación desde su QR y vuelve aquí, o agrega ?estacion=tierra a la dirección."
        }
      />

      <h2 className="section-title" style={{ fontSize: "1.3rem", marginTop: 22 }}>
        Sensores y permisos
      </h2>
      <Row
        label="Conexión segura (HTTPS)"
        level={secure ? "ok" : "aviso"}
        value={secure ? "Sí" : "No"}
        detail={secure ? undefined : "GPS y brújula requieren https. Usa el método B (túnel) de la guía de pruebas."}
      />
      <Row
        label="Realidad aumentada"
        level={arSupport ? "ok" : arSupport === null ? "aviso" : "info"}
        value={
          arSupport === "webxr"
            ? "Disponible (WebXR, Android)."
            : arSupport === "quicklook"
              ? "Disponible (AR Quick Look, iPhone/iPad)."
              : arSupport === null
                ? "No disponible en este dispositivo."
                : "Comprobando…"
        }
        detail={
          arSupport === null
            ? !secure
              ? "Necesita https."
              : !hasXr
                ? "Este navegador no ofrece WebXR. En Android usa Chrome actualizado."
                : "El navegador ofrece WebXR pero no admite sesiones de realidad aumentada: en Android falta «Google Play Services para RA» (ARCore) o el teléfono no es compatible."
            : undefined
        }
      />
      <Row
        label="GPS"
        level={
          geo.status === "activa" ? "ok" : geo.status === "denegada" || geo.status === "sin-https" ? "aviso" : "info"
        }
        value={
          geo.fix
            ? `Funciona. Precisión ±${Math.round(geo.fix.accuracy)} m.`
            : `Permiso: ${geoPermission}. ${typeof navigator !== "undefined" && "geolocation" in navigator ? "El navegador ofrece geolocalización." : "Sin geolocalización."}`
        }
        detail={geo.message ?? undefined}
      />
      <div style={{ paddingBottom: 8 }}>
        <button
          type="button"
          className="btn btn--small"
          onClick={geo.start}
          disabled={geo.status === "solicitando" || geo.status === "activa"}
        >
          Probar GPS
        </button>
      </div>
      <Row
        label="Orientación del teléfono (brújula)"
        level={compass.status === "activa" ? "ok" : compass.status === "inactiva" ? "info" : "aviso"}
        value={
          compass.status === "activa"
            ? `Funciona: ${Math.round(compass.heading ?? 0)}° respecto del norte magnético (${compass.source === "ios" ? "iOS" : "Android/absoluta"})${compass.accuracy !== null ? `, precisión ±${Math.round(compass.accuracy)}°` : ""}.`
            : `Estado: ${compass.status}. ${typeof window !== "undefined" && "DeviceOrientationEvent" in window ? "El navegador ofrece el evento de orientación." : "Sin evento de orientación."}`
        }
      />
      <div style={{ paddingBottom: 8 }}>
        <button
          type="button"
          className="btn btn--small"
          onClick={compass.start}
          disabled={compass.status === "solicitando" || compass.status === "activa"}
        >
          Probar brújula
        </button>
      </div>

      <h2 className="section-title" style={{ fontSize: "1.3rem", marginTop: 22 }}>
        Visualización y datos
      </h2>
      <Row
        label="Visualización 3D (WebGL)"
        level={webgl === "webgl2" || webgl === "webgl1" ? "ok" : webgl === null ? "info" : "error"}
        value={
          webgl === null
            ? "Comprobando…"
            : webgl === "ninguno"
              ? "No disponible: se mostrará una vista simplificada."
              : `Disponible (${webgl === "webgl2" ? "WebGL 2" : "WebGL 1"}). Calidad elegida: ${quality}.`
        }
      />
      <Row
        label="Mapa base (teselas)"
        level={tile === "ok" ? "ok" : tile === "error" ? "aviso" : "info"}
        value={
          tile === "sin-probar"
            ? "Sin probar."
            : tile === "probando"
              ? "Probando…"
              : tile === "ok"
                ? "Se descargan correctamente."
                : "No se pudieron descargar: sin conexión o el proveedor bloquea el acceso."
        }
        detail={`Al probar, el teléfono pide una imagen del mapa a ${TILE_HOST}; como con cualquier mapa en línea, ese servidor ve tu dirección IP (no tu ubicación). El trazado y las estaciones funcionan aunque falle el mapa base.`}
      />
      <div style={{ paddingBottom: 8 }}>
        <button type="button" className="btn btn--small" onClick={testTiles} disabled={tile === "probando"}>
          Probar el mapa base
        </button>
      </div>
      <Row
        label="Simulación orbital"
        level="ok"
        value={`${formatChileDateTime(now)} (hora de Chile, ${chileUtcLabel(now)}); ${formatUtc(now)}.`}
        detail={`Distancia Tierra–Sol calculada ahora: ${formatNumber(earthAU, 4)} UA.`}
      />
      <Row
        label="Recursos esenciales (texturas)"
        level={!resources ? "info" : resources.failed.length === 0 ? "ok" : "error"}
        value={
          !resources
            ? "Comprobando…"
            : resources.failed.length === 0
              ? `${resources.ok} de ${TEXTURES.length} disponibles.`
              : `Fallan: ${resources.failed.join(", ")}`
        }
      />
      <Row
        label="Estaciones y trazado"
        level={placements.every((p) => p.status === "verificada") ? "ok" : "aviso"}
        value={`${placements.length} estaciones; trazado de ${formatNumber(routeKm, 1)} km.`}
        detail={`${placements.filter((p) => p.status === "verificada").length} verificadas en terreno, ${placements.filter((p) => p.status === "propuesta-escala").length} con posición teórica, ${placements.filter((p) => p.status === "pendiente").length} pendientes.`}
      />
      <Row label="Conexión a internet" level={online ? "ok" : "aviso"} value={online ? "En línea" : "Sin conexión"} />
      <Row
        label="Funcionamiento sin conexión (service worker)"
        level={sw === "activo" ? "ok" : "info"}
        value={sw}
        detail="Solo se activa en la versión de producción (npm run build y npm start) y con https."
      />

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 22 }} className="small">
        <Link className="text-link text-link--block" href="/qr">
          QR de prueba para esta dirección
        </Link>
        <Link className="text-link text-link--block" href="/fuentes">
          Fuentes y métodos
        </Link>
      </div>
    </div>
  );
}
