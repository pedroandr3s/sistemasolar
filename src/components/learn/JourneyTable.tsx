import { BODIES, PLANET_IDS, lightMinutes, meanDistanceAU } from "@/data/bodies";
import { kmToModelMeters } from "@/config/scale";
import { formatAU, formatDistance, formatMinutes, formatNumber } from "@/lib/format";

const CAR_KMH = 100;

/** Viajar desde el Sol hasta cada planeta: luz, auto y recorrido. */
export function JourneyTable({ highlight }: { highlight?: string }) {
  return (
    <div style={{ overflowX: "auto" }} tabIndex={0} role="region" aria-label="Tabla de tiempos de viaje desde el Sol">
      <table className="small tabular" style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
        <caption className="sr-only">Tiempo de viaje desde el Sol</caption>
        <thead>
          <tr style={{ textAlign: "left", color: "var(--color-mist)" }}>
            <th scope="col" style={{ padding: "8px 6px 8px 0", fontWeight: 500 }}>
              Hasta
            </th>
            <th scope="col" style={{ padding: 8, fontWeight: 500 }}>
              Distancia media
            </th>
            <th scope="col" style={{ padding: 8, fontWeight: 500 }}>
              La luz tarda
            </th>
            <th scope="col" style={{ padding: 8, fontWeight: 500 }}>
              En auto a {CAR_KMH} km/h
            </th>
            <th scope="col" style={{ padding: 8, fontWeight: 500 }}>
              En el recorrido
            </th>
          </tr>
        </thead>
        <tbody>
          {PLANET_IDS.map((id) => {
            const b = BODIES[id];
            const km = b.meanDistanceKm ?? 0;
            const years = km / CAR_KMH / 24 / 365.25;
            const on = id === highlight;
            return (
              <tr
                key={id}
                style={{ borderTop: "1px solid var(--line)", background: on ? "rgb(244 184 96 / 0.08)" : undefined }}
              >
                <th scope="row" style={{ padding: "10px 6px 10px 0", textAlign: "left", fontWeight: 600 }}>
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-block",
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: b.color,
                      marginRight: 8,
                    }}
                  />
                  {b.name}
                </th>
                <td style={{ padding: 8 }}>{formatAU(meanDistanceAU(b) ?? 0)}</td>
                <td style={{ padding: 8 }}>{formatMinutes(lightMinutes(km))}</td>
                <td style={{ padding: 8 }}>{formatNumber(years, 0)} años</td>
                <td style={{ padding: 8 }}>{formatDistance(kmToModelMeters(km))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
