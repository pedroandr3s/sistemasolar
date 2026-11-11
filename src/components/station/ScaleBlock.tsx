import { SCALE, scaleDenominator, sizeAtScaleMeters } from "@/config/scale";
import { formatDistance, formatKmMark, formatMillionKm, formatNumber } from "@/lib/format";
import type { StationPlacement } from "@/lib/stations";

function formatSize(m: number): string {
  if (m >= 1) return `${formatNumber(m, 1)} m`;
  return `${formatNumber(m * 100, m < 0.1 ? 1 : 0)} cm`;
}

/**
 * Las tres distancias que no deben confundirse: la real del espacio, la del
 * modelo a escala y la posición sobre la ruta.
 */
export function ScaleBlock({ placement }: { placement: StationPlacement }) {
  const { body, astronomicalKm, modelMeters, alongRouteMeters, status } = placement;
  const size = sizeAtScaleMeters(body.diameterKm);
  const statusText =
    status === "verificada"
      ? "ubicación verificada en terreno"
      : status === "propuesta-escala"
        ? "posición teórica según la escala; la ubicación real aún no está definida"
        : "ubicación pendiente";

  return (
    <div className="panel" style={{ marginTop: 22 }}>
      <p style={{ margin: 0, fontWeight: 600 }}>La escala en este recorrido</p>
      <p className="small muted" style={{ margin: "4px 0 12px" }}>
        1 unidad astronómica = {formatNumber(SCALE.metersPerAU / 1000)} km de ruta (escala 1 :{" "}
        {formatNumber(scaleDenominator() / 1e6, 1)} millones).
      </p>
      <dl className="facts">
        {body.id !== "sol" && (
          <div>
            <dt>Distancia real al Sol</dt>
            <dd>{formatMillionKm(astronomicalKm)}</dd>
          </div>
        )}
        <div>
          <dt>{body.id === "sol" ? "En el modelo" : "Distancia a escala desde el Sol"}</dt>
          <dd>{body.id === "sol" ? "Todas las distancias se miden desde aquí" : formatDistance(modelMeters)}</dd>
        </div>
        <div>
          <dt>Posición sobre la ruta</dt>
          <dd>
            {alongRouteMeters !== null ? formatKmMark(alongRouteMeters) : "Sin definir"}
            <small>{statusText}</small>
          </dd>
        </div>
        <div>
          <dt>Tamaño a la misma escala</dt>
          <dd>
            {formatSize(size)} de diámetro
            <small>
              {body.id === "sol"
                ? "Una escultura del Sol a esta escala sería más alta que un edificio de cinco pisos."
                : "Las esculturas pueden ser más grandes para que se vean; este sería su tamaño exacto a escala."}
            </small>
          </dd>
        </div>
      </dl>
    </div>
  );
}
