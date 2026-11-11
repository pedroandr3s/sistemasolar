import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { stationPath } from "@/config/site";
import { formatDistance } from "@/lib/format";
import { legDistances, type StationPlacement } from "@/lib/stations";

/**
 * El siguiente paso, siempre a la vista: un botón fijo sobre la barra inferior.
 * Se dibuja como señal de carretera, igual que el resto de la señalética del camino.
 * En la última parada lleva a la bitácora («mi viaje»).
 */
export function NextBar({ current, next }: { current: StationPlacement; next: StationPlacement | null }) {
  if (!next) {
    return (
      <Link className="next-bar next-bar--end" href="/bitacora">
        <span className="next-bar__icon" aria-hidden="true">
          <Icon name="flag" size={26} />
        </span>
        <span className="next-bar__text">
          <strong>¡Terminaste! Ver mi viaje</strong>
          <span>Llegaste a la última parada</span>
        </span>
        <Icon name="arrow-right" size={26} />
      </Link>
    );
  }
  const leg = legDistances(current, next);
  const meters = leg.alongRouteMeters ?? leg.modelMeters;
  return (
    <Link className="next-bar" href={stationPath(next.station.id)}>
      <span className="next-bar__dot" aria-hidden="true" style={{ background: next.body.color }} />
      <span className="next-bar__text">
        <strong>
          {current.station.id === "sol" ? `Ir a ${next.station.name}` : `Siguiente: ${next.station.name}`}
        </strong>
        <span>a {formatDistance(meters)} de aquí por el camino</span>
      </span>
      <Icon name="arrow-right" size={26} />
    </Link>
  );
}
