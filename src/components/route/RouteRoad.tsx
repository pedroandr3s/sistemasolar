import Link from "next/link";
import { getRoute } from "@/lib/route";
import { asteroidBeltModelMeters, getPlacements, type StationPlacement } from "@/lib/stations";
import { SCALE } from "@/config/scale";
import { stationPath } from "@/config/site";
import { formatKmMark, formatNumber } from "@/lib/format";
import { PlanetOrb } from "@/components/ui/PlanetOrb";

const ROAD_H = 1080;
const TOP = 56;
const MIN_GAP = 72;
const DOT_X = 30;
const LABEL_X = 64;

type Item =
  | {
      type: "station";
      along: number;
      p: StationPlacement;
      yDot: number;
      yLabel: number;
    }
  | { type: "belt"; along: number; yDot: number; yLabel: number };

/**
 * El camino de San Carlos a San Fabián dibujado a escala, de arriba hacia abajo.
 * Cada estación aparece en su kilómetro del modelo; los nombres se separan con
 * líneas guía cuando las estaciones quedan muy juntas, como pasa con los
 * planetas interiores en los primeros 3 km.
 */
export function RouteRoad() {
  const route = getRoute();
  const total = route.length;
  const y = (m: number) => TOP + (m / total) * ROAD_H;
  const sun = SCALE.sunAlongRouteMeters;
  const [beltA, beltB] = asteroidBeltModelMeters();

  const raw: Omit<Item, "yLabel" | "yDot">[] = [
    ...getPlacements()
      .filter((p) => p.alongRouteMeters !== null)
      .map((p) => ({
        type: "station" as const,
        along: p.alongRouteMeters!,
        p,
      })),
    { type: "belt" as const, along: sun + (beltA + beltB) / 2 },
  ];
  raw.sort((a, b) => a.along - b.along);

  let lastLabel = -Infinity;
  const items: Item[] = raw.map((r) => {
    const yDot = y(r.along);
    const yLabel = Math.max(yDot - 18, lastLabel + MIN_GAP);
    lastLabel = yLabel;
    return { ...r, yDot, yLabel } as Item;
  });
  const height = Math.max(TOP + ROAD_H + 110, lastLabel + 130);
  const stations = items.filter((i): i is Extract<Item, { type: "station" }> => i.type === "station");

  return (
    <div className="road-road" style={{ height }}>
      <svg className="road-svg" width="100%" height={height} aria-hidden="true">
        <line x1={DOT_X} x2={DOT_X} y1={TOP - 30} y2={TOP + ROAD_H} className="road-line" />
        <rect
          x={DOT_X - 7}
          y={y(sun + beltA)}
          width={14}
          height={y(sun + beltB) - y(sun + beltA)}
          rx={7}
          className="road-belt"
        />
        {[0, 10_000, 20_000, 30_000, 40_000].map((m) => (
          <line key={m} x1={DOT_X - 13} x2={DOT_X - 7} y1={y(m)} y2={y(m)} className="road-tick" />
        ))}
        {items.map((it) => (
          <path
            key={`l-${it.type === "station" ? it.p.station.id : "belt"}`}
            d={`M${DOT_X + 7} ${it.yDot} C ${DOT_X + 22} ${it.yDot}, ${LABEL_X - 22} ${it.yLabel + 22}, ${LABEL_X - 6} ${it.yLabel + 22}`}
            className="road-leader"
          />
        ))}
        {stations.map((it) => (
          <circle
            key={it.p.station.id}
            cx={DOT_X}
            cy={it.yDot}
            r={it.p.station.id === "sol" ? 9 : 5.5}
            fill={it.p.body.color}
            className="road-dot"
          />
        ))}
      </svg>

      <p className="road-town" style={{ top: 0 }}>
        San Carlos, km 0
      </p>

      {items.map((it) => {
        if (it.type === "belt") {
          return (
            <p key="belt" className="road-beltLabel" style={{ top: it.yLabel, left: LABEL_X }}>
              Zona del cinturón de asteroides, del km {formatNumber((sun + beltA) / 1000, 1)} al{" "}
              {formatNumber((sun + beltB) / 1000, 1)}. No hay estación: son millones de rocas pequeñas.
            </p>
          );
        }
        const idx = stations.indexOf(it);
        const prev = stations[idx - 1];
        const gap = prev ? it.along - prev.along : null;
        return (
          <Link
            key={it.p.station.id}
            href={stationPath(it.p.station.id)}
            className="road-item"
            style={{ top: it.yLabel, left: LABEL_X }}
          >
            <PlanetOrb id={it.p.body.id} size={40} />
            <span className="road-text">
              <span className="road-name">{it.p.station.name}</span>
              <span className={`road-km tabular`}>
                {formatKmMark(it.along)}
                {gap !== null && gap > 3000 && `, a ${formatNumber(gap / 1000, 1)} km de ${prev!.p.station.name}`}
              </span>
            </span>
          </Link>
        );
      })}

      <div className="road-end" style={{ top: Math.max(TOP + ROAD_H + 8, lastLabel + 60) }}>
        <p className="road-townEnd">San Fabián de Alico, {formatKmMark(total)}</p>
        <svg viewBox="0 0 400 70" className="road-andes" aria-hidden="true" preserveAspectRatio="none">
          <path d="M0 70 L0 52 L38 40 L62 46 L96 24 L118 34 L146 14 L170 30 L196 22 L222 36 L250 18 L262 10 L276 20 L300 30 L330 26 L356 40 L384 34 L400 42 L400 70 Z" />
          <path d="M146 14 L156 22 L150 24 Z M262 10 L270 17 L258 18 Z" className="road-snow" />
        </svg>
      </div>
    </div>
  );
}
