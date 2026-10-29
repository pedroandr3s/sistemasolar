import { getRoute } from "@/lib/route";
import { asteroidBeltModelMeters, getPlacements } from "@/lib/stations";
import { SCALE } from "@/config/scale";
import { formatKmMark, formatNumber } from "@/lib/format";

/**
 * Regla del recorrido: el trazado completo (San Carlos → San Fabián) como una
 * línea con cada estación en su kilómetro. Enseña de un vistazo que los
 * planetas interiores caben en los primeros 3 km y los exteriores se separan
 * muchísimo. Las posiciones son las calculadas por la escala.
 */
export function RouteRuler({ currentId, showTicks = false }: { currentId?: string; showTicks?: boolean }) {
  const route = getRoute();
  const placements = getPlacements();
  const total = route.length;
  const pct = (m: number) => `${(m / total) * 100}%`;
  const current = placements.find((p) => p.station.id === currentId);
  const [beltA, beltB] = asteroidBeltModelMeters();
  const sun = SCALE.sunAlongRouteMeters;

  const label =
    current?.alongRouteMeters != null
      ? `Recorrido de ${formatNumber(total / 1000, 1)} km entre San Carlos y San Fabián. Estás en la estación ${current.station.name}, ${formatKmMark(current.alongRouteMeters)}.`
      : `Recorrido de ${formatNumber(total / 1000, 1)} km entre San Carlos y San Fabián con ocho estaciones.`;

  return (
    <div className="rr-ruler" role="img" aria-label={label}>
      <div className="rr-track">
        <span className="rr-belt" style={{ left: pct(sun + beltA), width: pct(beltB - beltA) }} />
        {showTicks &&
          [0, 10_000, 20_000, 30_000, 40_000].map((m) => (
            <span key={m} className="rr-tick" style={{ left: pct(m) }}>
              <span>{formatNumber(m / 1000)}</span>
            </span>
          ))}
        {placements.map((p) =>
          p.alongRouteMeters === null ? null : (
            <span
              key={p.station.id}
              className={`rr-dot ${p.station.id === currentId ? "rr-current" : ""}`}
              style={{
                left: pct(p.alongRouteMeters),
                background: p.body.color,
              }}
            />
          ),
        )}
        {current?.alongRouteMeters != null && (
          <span
            className="rr-currentLabel"
            style={{
              left: pct(current.alongRouteMeters),
              transform:
                current.alongRouteMeters / total > 0.75
                  ? "translateX(-100%)"
                  : current.alongRouteMeters / total < 0.12
                    ? "translateX(-6px)"
                    : "translateX(-50%)",
            }}
          >
            {current.station.name}, {formatKmMark(current.alongRouteMeters)}
          </span>
        )}
      </div>
      <div className="rr-ends">
        <span>San Carlos</span>
        <span>San Fabián</span>
      </div>
    </div>
  );
}
