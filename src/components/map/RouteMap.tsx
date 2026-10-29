"use client";

import { useEffect, useMemo, useState } from "react";
import { Circle, CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ROUTE_COORDS } from "@/lib/route";
import type { StationPlacement } from "@/lib/stations";
import type { UserFix } from "@/lib/orientation";

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores de OpenStreetMap</a>';

export interface RouteMapProps {
  placements: StationPlacement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  user: UserFix | null;
  fitSeq: number;
  centerUserSeq: number;
  onTileError: () => void;
  onTileLoad: () => void;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

/** Estaciones cuyo nombre se oculta con poco zoom: los planetas interiores quedan muy juntos. */
const CLUSTERED = new Set(["mercurio", "venus", "tierra", "marte"]);

function stationIcon(p: StationPlacement, selected: boolean, compact: boolean): L.DivIcon {
  const proposed = p.status !== "verificada";
  const html = `<div class="station-marker ${proposed ? "station-marker--proposed" : ""} ${compact ? "station-marker--compact" : ""}">
      <span class="station-marker__dot" style="background:${p.body.color};${selected ? "transform:scale(1.25)" : ""}"></span>
      <span class="station-marker__label">${escapeHtml(p.station.name)}</span>
    </div>`;
  return L.divIcon({ html, className: "", iconSize: [90, 48], iconAnchor: [45, 13] });
}

function Controller({ fitSeq, centerUserSeq, user }: { fitSeq: number; centerUserSeq: number; user: UserFix | null }) {
  const map = useMap();
  const bounds = useMemo(() => L.latLngBounds(ROUTE_COORDS.map(([lng, lat]) => [lat, lng] as [number, number])), []);
  useEffect(() => {
    // Sin animación al inicio; animada cuando la persona lo pide.
    map.fitBounds(bounds, { padding: [28, 28], animate: fitSeq > 0 });
  }, [fitSeq, map, bounds]);
  // Al salir de la página, react-leaflet ya ejecutó map.remove() (que detiene las
  // animaciones) antes de esta limpieza. Aquí solo se neutralizan los temporizadores
  // que Leaflet 1.9 pudo dejar programados (fin de una animación de zoom, recálculo
  // de tamaño), para que no lleguen a un mapa destruido («Cannot read properties of
  // undefined (reading '_leaflet_pos')»). No se llama a map.stop(): sobre un mapa ya
  // destruido provoca justamente ese error.
  useEffect(
    () => () => {
      const internal = map as unknown as {
        _resizeRequest?: number;
        _getMapPanePos: () => L.Point;
        invalidateSize: () => L.Map;
      };
      if (internal._resizeRequest) L.Util.cancelAnimFrame(internal._resizeRequest);
      internal._getMapPanePos = () => L.point(0, 0);
      internal.invalidateSize = () => map;
    },
    [map],
  );
  useEffect(() => {
    if (centerUserSeq > 0 && user) map.flyTo([user.lat, user.lng], Math.max(map.getZoom(), 14), { duration: 0.8 });
    // Solo al pedirlo explícitamente, no en cada actualización del GPS.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerUserSeq, map]);
  return null;
}

function useZoom(initial: number): number {
  const [zoom, setZoom] = useState(initial);
  const map = useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  return zoom;
}

function StationMarkers({
  placements,
  selectedId,
  onSelect,
}: Pick<RouteMapProps, "placements" | "selectedId" | "onSelect">) {
  const zoom = useZoom(11);
  return (
    <>
      {placements.map((p) =>
        p.coords ? (
          <Marker
            key={p.station.id}
            position={[p.coords.lat, p.coords.lng]}
            icon={stationIcon(
              p,
              p.station.id === selectedId,
              zoom < 14 && CLUSTERED.has(p.station.id) && p.station.id !== selectedId,
            )}
            eventHandlers={{ click: () => onSelect(p.station.id) }}
            keyboard
            title={`${p.station.name}${p.status !== "verificada" ? " (ubicación propuesta)" : ""}`}
          />
        ) : null,
      )}
    </>
  );
}

export default function RouteMap({
  placements,
  selectedId,
  onSelect,
  user,
  fitSeq,
  centerUserSeq,
  onTileError,
  onTileLoad,
}: RouteMapProps) {
  const line = useMemo(() => ROUTE_COORDS.map(([lng, lat]) => [lat, lng] as [number, number]), []);
  const center: [number, number] = line[Math.floor(line.length / 2)] ?? [-36.49, -71.75];

  return (
    <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }} zoomControl attributionControl>
      <TileLayer
        url={TILE_URL}
        attribution={TILE_ATTRIBUTION}
        maxZoom={19}
        eventHandlers={{ tileerror: onTileError, tileload: onTileLoad }}
      />
      <Polyline positions={line} pathOptions={{ color: "#0f1830", weight: 8, opacity: 0.55 }} />
      <Polyline positions={line} pathOptions={{ color: "#f4b860", weight: 4, opacity: 0.95 }} />
      <StationMarkers placements={placements} selectedId={selectedId} onSelect={onSelect} />
      {user && (
        <>
          <Circle
            center={[user.lat, user.lng]}
            radius={user.accuracy}
            pathOptions={{ color: "#9cc9a1", weight: 1, fillOpacity: 0.12 }}
          />
          <CircleMarker
            center={[user.lat, user.lng]}
            radius={7}
            pathOptions={{ color: "#0f1830", weight: 2, fillColor: "#9cc9a1", fillOpacity: 1 }}
          />
        </>
      )}
      <Controller fitSeq={fitSeq} centerUserSeq={centerUserSeq} user={user} />
    </MapContainer>
  );
}
