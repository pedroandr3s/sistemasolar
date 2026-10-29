"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { SAFETY_NOTICE } from "@/config/stations";
import { stationPath } from "@/config/site";
import { cardinal, cardinalName, initialBearing } from "@/lib/geo";
import { formatDistance, formatNumber, formatPercent } from "@/lib/format";
import { magneticDeclination, WMM } from "@/lib/declination";
import { computeOrientation, magneticToTrueHeading, reliableMovementHeading } from "@/lib/orientation";
import { getRoute, ROUTE_META } from "@/lib/route";
import {
  findPlacement,
  getPlacements,
  legDistances,
  nextPlacement,
  progressFraction,
  type Direction,
} from "@/lib/stations";
import { useGeolocation } from "./useGeolocation";
import { useCompass } from "./useCompass";
import { CompassDial } from "./CompassDial";
import { VehicleWarning } from "./VehicleWarning";

function declinationText(deg: number): string {
  const v = formatNumber(Math.abs(deg), 1);
  return deg >= 0 ? `${v}° al este` : `${v}° al oeste`;
}

function bearingText(b: number | null): string {
  if (b === null) return "—";
  return `${Math.round(b)}° (${cardinal(b)})`;
}

export function OrientMode({ stationId }: { stationId?: string }) {
  const placements = useMemo(() => getPlacements(), []);
  const route = useMemo(() => getRoute(), []);
  const [direction, setDirection] = useState<Direction>("hacia-san-fabian");
  const geo = useGeolocation();
  const compass = useCompass();

  const qrStation = stationId ? (findPlacement(stationId) ?? null) : null;
  const qrNext = qrStation ? nextPlacement(qrStation.station.id, direction) : null;
  const result = geo.fix ? computeOrientation(geo.fix, placements, route, direction) : null;
  const target = result?.target ?? null;
  const proposed = placements.some((p) => p.status !== "verificada");

  // Declinación magnética (WMM2025) en la posición del visitante, de la estación o del inicio de la ruta.
  const declRef = geo.fix ?? qrStation?.coords ?? { lat: ROUTE_META.origen.lat, lng: ROUTE_META.origen.lng };
  const declination = magneticDeclination(declRef.lat, declRef.lng);
  // La brújula mide respecto del norte magnético; los rumbos a las estaciones son geográficos.
  const trueHeading =
    compass.status === "activa" && compass.heading !== null
      ? magneticToTrueHeading(compass.heading, declination.degrees)
      : null;

  // Precisión de la flecha: GPS + brújula.
  const compassUnc = compass.status === "activa" ? (compass.accuracy ?? 15) : 0;
  const uncertainty = (result?.bearingUncertaintyDeg ?? 0) + compassUnc;
  const hideArrow = !result || result.confidence === "baja" || uncertainty > 45 || result.farFromRoute;
  const movement = geo.fix ? reliableMovementHeading(geo.fix) : null;

  // Sin GPS: rumbo entre la estación del QR y la siguiente (si ambas tienen coordenadas).
  const staticBearing =
    !result && qrStation?.coords && qrNext?.coords ? initialBearing(qrStation.coords, qrNext.coords) : null;
  const staticLeg = qrStation && qrNext ? legDistances(qrStation, qrNext) : null;

  return (
    <div className="wrap" style={{ paddingTop: 14 }}>
      <div className="notice" role="note">
        <Icon name="warning" />
        <span>
          <strong>Primero, la seguridad.</strong> {SAFETY_NOTICE}
        </span>
      </div>
      <VehicleWarning fix={geo.fix} />

      <h1 className="display" style={{ fontSize: "2.4rem", margin: "18px 0 0" }}>
        Orientarme
      </h1>
      <p className="muted" style={{ marginTop: 4 }}>
        {qrStation
          ? `Estás en la estación ${qrStation.station.name}, según el código QR.`
          : "Abre esta página desde el código QR de una estación, o usa tu ubicación."}
      </p>

      <div
        className="levels"
        role="radiogroup"
        aria-label="Sentido del recorrido"
        style={{ gridTemplateColumns: "1fr 1fr", marginTop: 14 }}
      >
        {(
          [
            ["hacia-san-fabian", "Hacia San Fabián"],
            ["hacia-san-carlos", "Hacia San Carlos"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={direction === value}
            onClick={() => setDirection(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Siguiente estación */}
      <section className="section" aria-labelledby="siguiente" style={{ marginTop: 22 }}>
        <h2 id="siguiente" className="sr-only">
          Siguiente estación
        </h2>
        {result ? (
          target ? (
            <div className="next-sign" style={{ gridTemplateColumns: "1fr auto" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: "1.2rem" }}>
                <span
                  aria-hidden="true"
                  style={{ width: 14, height: 14, borderRadius: "50%", background: target.body.color }}
                />
                Siguiente: {target.station.name}
              </span>
              <span className="next-sign__km tabular">{formatDistance(result.alongRouteMetersToTarget ?? 0)}</span>
              <span className="small muted" style={{ gridColumn: "1 / -1" }}>
                por la ruta; {formatDistance(result.straightMetersToTarget ?? 0)} en línea recta
              </span>
            </div>
          ) : (
            <p className="panel">No quedan estaciones en este sentido. ¡Completaste el recorrido!</p>
          )
        ) : qrNext ? (
          <div className="next-sign" style={{ gridTemplateColumns: "1fr auto" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: "1.2rem" }}>
              <span
                aria-hidden="true"
                style={{ width: 14, height: 14, borderRadius: "50%", background: qrNext.body.color }}
              />
              Siguiente: {qrNext.station.name}
            </span>
            <span className="next-sign__km tabular">
              {staticLeg?.alongRouteMeters != null ? formatDistance(staticLeg.alongRouteMeters) : "—"}
            </span>
            <span className="small muted" style={{ gridColumn: "1 / -1" }}>
              por la ruta desde {qrStation?.station.name}
              {staticBearing !== null &&
                `, hacia el ${cardinalName(staticBearing)} en línea recta (rumbo ${bearingText(staticBearing)})`}
            </span>
          </div>
        ) : qrStation ? (
          <p className="panel">
            {direction === "hacia-san-fabian"
              ? "Urano es la última estación hacia San Fabián."
              : "El Sol es la primera estación: hacia San Carlos no hay más."}
          </p>
        ) : null}
      </section>

      {/* Ubicación */}
      <section className="section" aria-labelledby="ubicacion">
        <h2 id="ubicacion" className="section-title" style={{ fontSize: "1.4rem" }}>
          Tu posición
        </h2>
        {geo.status === "inactiva" ||
        geo.status === "denegada" ||
        geo.status === "sin-https" ||
        geo.status === "no-disponible" ? (
          <>
            <p className="small muted" style={{ marginTop: 0 }}>
              Con tu permiso, el teléfono calcula la estación más cercana, la distancia que falta y hacia dónde queda.
              Tu ubicación no sale de este teléfono.
            </p>
            <button type="button" className="btn btn--primary" onClick={geo.start}>
              <Icon name="location" size={20} />
              Usar mi ubicación
            </button>
          </>
        ) : geo.status === "solicitando" ? (
          <p role="status">Buscando tu ubicación…</p>
        ) : null}
        {geo.message && (
          <p className="notice notice--info" style={{ marginTop: 12 }} role="status">
            {geo.message}
          </p>
        )}

        {result && geo.fix && (
          <div style={{ display: "grid", gap: 12, marginTop: 6 }}>
            {result.farFromRoute ? (
              <p className="notice notice--info">
                Estás a {formatDistance(result.offRouteMeters)} del recorrido. La orientación funciona en la Ruta N-31,
                entre San Carlos y San Fabián.
              </p>
            ) : result.atStation ? (
              <p className="notice notice--ok">
                <Icon name="check" />
                <span>
                  Estás en la estación <strong>{result.atStation.station.name}</strong>.
                </span>
              </p>
            ) : result.nearest ? (
              <p style={{ margin: 0 }}>
                Estación más cercana: <strong>{result.nearest.placement.station.name}</strong>, a{" "}
                {formatDistance(result.nearest.straightMeters)} en línea recta.
                {result.nearest.straightMeters > 1000 ? " Todavía estás lejos de ella." : ""}
              </p>
            ) : null}
            <p className="small muted" style={{ margin: 0 }}>
              Precisión estimada del GPS: ±{Math.round(geo.fix.accuracy)} m.{" "}
              {result.confidence === "baja"
                ? "Es baja: espera unos segundos en un lugar despejado."
                : result.confidence === "media"
                  ? "Aceptable."
                  : "Buena."}
            </p>
            {!result.farFromRoute && (
              <div>
                <div
                  aria-hidden="true"
                  style={{ height: 8, borderRadius: 4, background: "var(--color-night-3)", overflow: "hidden" }}
                >
                  <div
                    style={{
                      width: `${progressFraction(result.userAlongMeters) * 100}%`,
                      height: "100%",
                      background: "var(--color-alamo)",
                    }}
                  />
                </div>
                <p className="small muted" style={{ margin: "6px 0 0" }}>
                  Avance entre el Sol y Urano: {formatPercent(progressFraction(result.userAlongMeters))}
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Dirección */}
      <section className="section" aria-labelledby="direccion">
        <h2 id="direccion" className="section-title" style={{ fontSize: "1.4rem" }}>
          Hacia dónde queda
        </h2>
        <CompassDial
          bearing={result?.bearingToTarget ?? staticBearing}
          heading={trueHeading}
          uncertainty={result ? uncertainty : 25}
          hideArrow={result ? hideArrow : staticBearing === null}
          targetColor={(target ?? qrNext)?.body.color ?? "#f4b860"}
        />
        <p className="small" style={{ textAlign: "center", marginTop: 10 }} aria-live="polite">
          {compass.status === "activa"
            ? "La flecha apunta a la estación respecto de tu teléfono. Sostenlo frente a ti, horizontal o inclinado."
            : "Dial con el norte arriba, como un mapa. Activa la brújula para que gire con el teléfono."}
        </p>
        {result && hideArrow && !result.farFromRoute && target && (
          <p className="notice" style={{ marginTop: 10 }}>
            La precisión no alcanza para indicar una dirección confiable. Guíate por la ruta o por el mapa.
          </p>
        )}
        {!result && staticBearing !== null && (
          <p className="small muted" style={{ textAlign: "center" }}>
            Sin tu ubicación, la flecha muestra el rumbo entre las dos estaciones, no desde donde estás.
          </p>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 12 }}>
          {compass.status !== "activa" ? (
            <button
              type="button"
              className="btn btn--small"
              onClick={compass.start}
              disabled={compass.status === "solicitando"}
            >
              <Icon name="compass" size={18} />
              {compass.status === "solicitando" ? "Activando…" : "Activar brújula"}
            </button>
          ) : (
            <button type="button" className="btn btn--small" onClick={compass.stop}>
              Desactivar brújula
            </button>
          )}
          <Link className="btn btn--small" href={stationId ? `${stationPath(stationId)}/mapa` : "/mapa"}>
            <Icon name="map" size={18} />
            Ver en el mapa
          </Link>
        </div>
        {compass.status === "denegada" && (
          <p className="notice notice--info" style={{ marginTop: 10 }}>
            No diste permiso para usar la brújula. El dial queda con el norte arriba.
          </p>
        )}
        {compass.status === "sin-https" && (
          <p className="notice notice--info" style={{ marginTop: 10 }}>
            La brújula solo funciona en una conexión segura (https).
          </p>
        )}
        {compass.status === "no-disponible" && (
          <p className="notice notice--info" style={{ marginTop: 10 }}>
            Este navegador no ofrece la orientación del teléfono.
          </p>
        )}
        {compass.status === "sin-datos" && (
          <p className="notice notice--info" style={{ marginTop: 10 }}>
            El teléfono no entregó una orientación respecto del norte (puede faltar el sensor magnético). Usa el mapa
            como alternativa.
          </p>
        )}

        <dl className="facts" style={{ marginTop: 18 }}>
          <div>
            <dt>Rumbo hacia la estación</dt>
            <dd>
              {bearingText(result?.bearingToTarget ?? staticBearing)}
              <small>Dirección en línea recta medida desde el norte geográfico.</small>
            </dd>
          </div>
          <div>
            <dt>Dirección de la carretera aquí</dt>
            <dd>
              {result && !result.farFromRoute ? bearingText(result.roadBearing) : "—"}
              <small>La ruta tiene curvas: puede no coincidir con el rumbo a la estación.</small>
            </dd>
          </div>
          <div>
            <dt>Tu dirección de movimiento</dt>
            <dd>
              {movement !== null ? bearingText(movement) : geo.fix ? "Detenido o sin dato" : "—"}
              <small>Solo se conoce cuando te desplazas.</small>
            </dd>
          </div>
          <div>
            <dt>Orientación del teléfono</dt>
            <dd>
              {trueHeading !== null ? bearingText(trueHeading) : "Brújula inactiva"}
              <small>
                {compass.status === "activa"
                  ? `${
                      compass.accuracy !== null
                        ? `Precisión informada: ±${Math.round(compass.accuracy)}°.`
                        : "El navegador no informa su precisión."
                    } Corregida al norte geográfico con la declinación magnética de este lugar: ${declinationText(declination.degrees)} (${WMM.model}${declination.withinValidity ? "" : ", modelo vencido: actualizar"}).`
                  : "Hacia dónde mira el teléfono: su borde superior, o su parte trasera si lo sostienes vertical."}
              </small>
            </dd>
          </div>
        </dl>

        {proposed && (
          <p className="small muted" style={{ marginTop: 14 }}>
            Las estaciones todavía no tienen ubicación verificada en terreno: la orientación usa sus posiciones teóricas
            según la escala del recorrido.
          </p>
        )}
      </section>
    </div>
  );
}
