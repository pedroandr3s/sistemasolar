import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { stationPath } from "@/config/site";
import { formatDistance } from "@/lib/format";
import { legDistances, type StationPlacement } from "@/lib/stations";
import { kmToModelMeters, SCALE } from "@/config/scale";
import { formatNumber } from "@/lib/format";
import { FinalJourney } from "./FinalJourney";

/** Distancia media de Neptuno al Sol (NASA Planetary Fact Sheet): 4.515 millones de km. */
const NEPTUNE_MEAN_DISTANCE_KM = 4515.0e6;
/** Próxima Centauri: 4,2465 años luz ≈ 268.557 UA (NASA). */
const PROXIMA_AU = 268_557;

/** Acceso a la estación siguiente, con la distancia por la ruta. */
export function NextStation({
  current,
  next,
  previous,
}: {
  current: StationPlacement;
  next: StationPlacement | null;
  previous: StationPlacement | null;
}) {
  if (!next) {
    const neptuneKm = kmToModelMeters(NEPTUNE_MEAN_DISTANCE_KM) / 1000;
    const proximaKm = (PROXIMA_AU * SCALE.metersPerAU) / 1000;
    return (
      <div className="panel" style={{ display: "grid", gap: 10 }}>
        <p style={{ fontWeight: 600, margin: 0 }}>Llegaste a la última estación del recorrido.</p>
        <FinalJourney />
        <p className="small muted" style={{ margin: 0 }}>
          A esta escala, Neptuno estaría a unos {Math.round(neptuneKm)} km del Sol, más allá de San Fabián, hacia la
          cordillera. Y la estrella más cercana, Próxima Centauri, a unos{" "}
          {formatNumber(Math.round(proximaKm / 10_000) * 10_000)} km: más lejos que la Luna real (384.400 km).
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn btn--primary btn--small" href="/bitacora">
            Ver mi bitácora del recorrido
          </Link>
          {previous && (
            <Link className="btn btn--small" href={stationPath(previous.station.id)}>
              <Icon name="arrow-left" size={18} />
              {previous.station.name}
            </Link>
          )}
        </div>
      </div>
    );
  }

  const leg = legDistances(current, next);
  const km = leg.alongRouteMeters ?? leg.modelMeters;
  const proposed = next.status !== "verificada";

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Link className="next-sign" href={stationPath(next.station.id)}>
        <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 600, fontSize: "1.15rem" }}>
          <span
            aria-hidden="true"
            style={{ width: 14, height: 14, borderRadius: "50%", background: next.body.color }}
          />
          Siguiente: {next.station.name}
        </span>
        <span className="next-sign__km tabular">{formatDistance(km)}</span>
        <span className="small muted">
          por la ruta hacia San Fabián{proposed ? " (distancia según la escala; ubicación por confirmar)" : ""}
        </span>
        <Icon name="arrow-right" />
      </Link>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link className="btn btn--small" href={`${stationPath(current.station.id)}/orientarme`}>
          <Icon name="compass" size={18} />
          Cómo llegar
        </Link>
        {previous && (
          <Link className="btn btn--small" href={stationPath(previous.station.id)}>
            <Icon name="arrow-left" size={18} />
            {previous.station.name}
          </Link>
        )}
      </div>
    </div>
  );
}
