"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { stationPath } from "@/config/site";
import { SAFETY_NOTICE } from "@/config/stations";
import { formatDistance, formatKmMark, formatMillionKm, formatPercent } from "@/lib/format";
import { haversineMeters, projectOntoPolyline } from "@/lib/geo";
import { getRoute, ROUTE_META } from "@/lib/route";
import { getPlacements, legDistances, progressFraction, stationSpanMeters } from "@/lib/stations";
import { useGeolocation } from "@/components/orient/useGeolocation";
import { VehicleWarning } from "@/components/orient/VehicleWarning";
import { useOnline } from "@/lib/useClient";
import type { RouteMapProps } from "./RouteMap";

const RouteMap = dynamic<RouteMapProps>(() => import("./RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="stage__status" role="status">
      <p>Cargando el mapa…</p>
    </div>
  ),
});

export function MapMode({ stationId }: { stationId?: string }) {
  const placements = useMemo(() => getPlacements(), []);
  const route = useMemo(() => getRoute(), []);
  const [selectedId, setSelectedId] = useState<string | null>(stationId ?? null);
  const [fitSeq, setFitSeq] = useState(0);
  const [centerSeq, setCenterSeq] = useState(0);
  const [tileErrors, setTileErrors] = useState(0);
  const [tileLoads, setTileLoads] = useState(0);
  const geo = useGeolocation();
  const online = useOnline();

  const onTileError = useCallback(() => setTileErrors((n) => n + 1), []);
  const onTileLoad = useCallback(() => setTileLoads((n) => n + 1), []);

  const origin = placements[0];
  const span = stationSpanMeters();
  const selected = placements.find((p) => p.station.id === selectedId) ?? null;
  const selectedIdx = selected ? placements.indexOf(selected) : -1;
  const selectedNext = selectedIdx >= 0 ? (placements[selectedIdx + 1] ?? null) : null;
  const anyProposed = placements.some((p) => p.status !== "verificada");

  const userProgress = geo.fix ? projectOntoPolyline(route, geo.fix) : null;
  const tilesFailing = tileErrors > 0 && tileLoads === 0;

  return (
    <div>
      <div className="wrap" style={{ paddingTop: 14 }}>
        <h1 className="display" style={{ fontSize: "2.4rem", margin: 0 }}>
          Mapa del recorrido
        </h1>
        <p className="small muted" style={{ margin: "4px 0 0" }}>
          De la Plaza de Armas de San Carlos a la de San Fabián de Alico por la Ruta N-31:{" "}
          {formatDistance(route.length)}.
        </p>
      </div>

      <div className="map-shell" style={{ marginTop: 10 }}>
        <ErrorBoundary
          fallback={
            <div className="stage__status">
              <p>No se pudo mostrar el mapa. La lista de estaciones de abajo funciona sin él.</p>
            </div>
          }
        >
          <RouteMap
            placements={placements}
            selectedId={selectedId}
            onSelect={setSelectedId}
            user={geo.fix}
            fitSeq={fitSeq}
            centerUserSeq={centerSeq}
            onTileError={onTileError}
            onTileLoad={onTileLoad}
          />
        </ErrorBoundary>
        {(tilesFailing || !online) && (
          <p className="stage__note" role="status" style={{ zIndex: 500, maxWidth: "80%" }}>
            Sin conexión al mapa base. El trazado y las estaciones siguen visibles.
          </p>
        )}
      </div>

      <div className="wrap">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" className="btn btn--small" onClick={() => setFitSeq((n) => n + 1)}>
            <Icon name="route" size={18} />
            Mostrar todo el recorrido
          </button>
          {geo.status === "activa" && geo.fix ? (
            <button type="button" className="btn btn--small" onClick={() => setCenterSeq((n) => n + 1)}>
              <Icon name="location" size={18} />
              Centrar en mí
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--small"
              onClick={geo.start}
              disabled={geo.status === "solicitando"}
            >
              <Icon name="location" size={18} />
              {geo.status === "solicitando" ? "Buscando tu ubicación…" : "Mostrar mi ubicación"}
            </button>
          )}
        </div>

        {geo.message && (
          <p className="notice notice--info" style={{ marginTop: 12 }} role="status">
            {geo.message}
          </p>
        )}
        <VehicleWarning fix={geo.fix} />

        {geo.fix && userProgress && (
          <div className="panel" style={{ marginTop: 12 }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Tu progreso en el recorrido</p>
            <div
              aria-hidden="true"
              style={{
                height: 8,
                borderRadius: 4,
                background: "var(--color-night-3)",
                marginTop: 10,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progressFraction(userProgress.alongMeters) * 100}%`,
                  height: "100%",
                  background: "var(--color-alamo)",
                }}
              />
            </div>
            <p className="small muted" style={{ margin: "8px 0 0" }}>
              {formatPercent(progressFraction(userProgress.alongMeters))} del tramo entre el Sol y Urano. Precisión del
              GPS: ±{Math.round(geo.fix.accuracy)} m.
              {userProgress.offsetMeters > 300 && ` Estás a ${formatDistance(userProgress.offsetMeters)} del trazado.`}
            </p>
          </div>
        )}

        {anyProposed && (
          <div className="notice" style={{ marginTop: 14 }}>
            <Icon name="info" />
            <span>
              Los puntos con borde punteado son <strong>ubicaciones propuestas</strong>: posiciones teóricas calculadas
              con la escala sobre el trazado, no lugares de instalación verificados ni zonas de detención.
            </span>
          </div>
        )}

        {selected && (
          <div className="panel" style={{ marginTop: 14 }} aria-live="polite">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: "1.25rem" }}>
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: selected.body.color,
                    marginRight: 8,
                  }}
                />
                {selected.station.name}
              </p>
              <span className={selected.status === "verificada" ? "badge-status badge-status--ok" : "badge-status"}>
                {selected.status === "verificada"
                  ? "Ubicación verificada"
                  : selected.status === "pendiente"
                    ? "Ubicación pendiente"
                    : "Ubicación propuesta"}
              </span>
            </div>
            <p className="small muted" style={{ margin: "6px 0 10px" }}>
              {selected.station.description}
            </p>
            <dl className="facts">
              <div>
                <dt>Sobre la ruta</dt>
                <dd>
                  {selected.alongRouteMeters !== null
                    ? `${formatKmMark(selected.alongRouteMeters)} desde la plaza de San Carlos`
                    : "Sin definir"}
                </dd>
              </div>
              {origin && selected.coords && origin.coords && selected !== origin && (
                <div>
                  <dt>En línea recta desde el Sol</dt>
                  <dd>{formatDistance(haversineMeters(origin.coords, selected.coords))}</dd>
                </div>
              )}
              {selectedNext && (
                <div>
                  <dt>Hasta {selectedNext.station.name}</dt>
                  <dd>
                    {legDistances(selected, selectedNext).alongRouteMeters !== null
                      ? `${formatDistance(legDistances(selected, selectedNext).alongRouteMeters!)} por la ruta`
                      : "Sin definir"}
                  </dd>
                </div>
              )}
              {selected.body.meanDistanceKm !== null && (
                <div>
                  <dt>Lo que representa</dt>
                  <dd>
                    {formatMillionKm(selected.body.meanDistanceKm)} de distancia media al Sol
                    <small>A escala: {formatDistance(selected.modelMeters)} desde el Sol.</small>
                  </dd>
                </div>
              )}
              {selected.station.site ? (
                <SiteInfo site={selected.station.site} />
              ) : (
                <div>
                  <dt>Acceso y seguridad</dt>
                  <dd>
                    Sin información verificada todavía.
                    <small>No te detengas en la calzada: usa solo zonas habilitadas.</small>
                  </dd>
                </div>
              )}
            </dl>
            <Link
              className="btn btn--primary btn--small"
              href={stationPath(selected.station.id)}
              style={{ marginTop: 12 }}
            >
              Abrir la estación {selected.station.name}
              <Icon name="arrow-right" size={18} />
            </Link>
          </div>
        )}

        <section className="section" aria-labelledby="estaciones">
          <h2 id="estaciones" className="section-title" style={{ fontSize: "1.4rem" }}>
            Estaciones
          </h2>
          <div
            style={{ overflowX: "auto" }}
            tabIndex={0}
            role="region"
            aria-label="Tabla de distancias de las estaciones"
          >
            <table className="small tabular" style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
              <caption className="sr-only">Distancias de cada estación</caption>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--color-mist)" }}>
                  <th scope="col" style={{ padding: "8px 6px 8px 0", fontWeight: 500 }}>
                    Estación
                  </th>
                  <th scope="col" style={{ padding: 8, fontWeight: 500 }}>
                    Por la ruta desde el Sol
                  </th>
                  <th scope="col" style={{ padding: 8, fontWeight: 500 }}>
                    En línea recta desde el Sol
                  </th>
                  <th scope="col" style={{ padding: 8, fontWeight: 500 }}>
                    A la siguiente
                  </th>
                  <th scope="col" style={{ padding: 8, fontWeight: 500 }}>
                    Avance
                  </th>
                </tr>
              </thead>
              <tbody>
                {placements.map((p, i) => {
                  const next = placements[i + 1];
                  const fromSun =
                    origin && p.alongRouteMeters !== null && origin.alongRouteMeters !== null
                      ? p.alongRouteMeters - origin.alongRouteMeters
                      : null;
                  return (
                    <tr key={p.station.id} style={{ borderTop: "1px solid var(--line)" }}>
                      <th scope="row" style={{ padding: "0 6px 0 0", textAlign: "left", fontWeight: 600 }}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(p.station.id)}
                          style={{
                            background: "none",
                            border: 0,
                            color: "inherit",
                            font: "inherit",
                            padding: 0,
                            cursor: "pointer",
                            display: "inline-flex",
                            gap: 8,
                            alignItems: "center",
                            minHeight: 44,
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{ width: 10, height: 10, borderRadius: "50%", background: p.body.color }}
                          />
                          {p.station.name}
                        </button>
                      </th>
                      <td style={{ padding: 8 }}>{fromSun !== null ? formatDistance(fromSun) : "—"}</td>
                      <td style={{ padding: 8 }}>
                        {origin?.coords && p.coords ? formatDistance(haversineMeters(origin.coords, p.coords)) : "—"}
                      </td>
                      <td style={{ padding: 8 }}>
                        {next && legDistances(p, next).alongRouteMeters !== null
                          ? formatDistance(legDistances(p, next).alongRouteMeters!)
                          : "—"}
                      </td>
                      <td style={{ padding: 8 }}>
                        {fromSun !== null && span > 0 ? formatPercent(fromSun / span) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>
            «Por la ruta» se mide sobre el trazado de la carretera; «en línea recta», entre coordenadas (distancia
            geodésica). Ambas son distancias de la Tierra. Las del espacio aparecen en cada estación. Trazado:{" "}
            {ROUTE_META.fuente} ({ROUTE_META.licencia}), obtenido el {ROUTE_META.obtenido}.
          </p>
        </section>

        <hr className="divider" />
        <p className="small muted">{SAFETY_NOTICE}</p>
      </div>
    </div>
  );
}

function SiteInfo({ site }: { site: NonNullable<ReturnType<typeof getPlacements>[number]["station"]["site"]> }) {
  const rows: [string, string | undefined][] = [
    ["Acceso peatonal", site.pedestrianAccess],
    ["Estacionamiento", site.parking],
    ["Accesibilidad", site.accessibility],
    ["Cerca", site.nearby?.join(", ")],
    ["Servicios", site.services?.join(", ")],
    ["Advertencias", site.safetyWarnings?.join(" ")],
  ];
  return (
    <>
      {rows
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>
              {v}
              {!site.verified && <small>Información aún no verificada.</small>}
            </dd>
          </div>
        ))}
    </>
  );
}
