"use client";

import { useState } from "react";
import { BODIES, PLANET_IDS, lightMinutes, meanDistanceAU, type BodyId } from "@/data/bodies";
import { SCALE, kmToModelMeters } from "@/config/scale";
import { formatAU, formatDistance, formatMillionKm, formatMinutes } from "@/lib/format";

/** Comparar distancias medias al Sol en una escala lineal. */
export function DistanceCompare({
  initialA = "tierra",
  initialB = "jupiter",
}: {
  initialA?: BodyId;
  initialB?: BodyId;
}) {
  const [a, setA] = useState<BodyId>(initialA === "sol" ? "mercurio" : initialA);
  const [b, setB] = useState<BodyId>(initialB === "sol" ? "urano" : initialB);
  const maxAU = 20;
  const W = 340;
  const x = (au: number) => 14 + (au / maxAU) * (W - 28);
  const auA = meanDistanceAU(BODIES[a]) ?? 0;
  const auB = meanDistanceAU(BODIES[b]) ?? 0;
  const diffKm = Math.abs((BODIES[a].meanDistanceKm ?? 0) - (BODIES[b].meanDistanceKm ?? 0));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { v: a, set: setA, label: "Primero" },
          { v: b, set: setB, label: "Segundo" },
        ].map((s) => (
          <label key={s.label} className="field">
            {s.label}
            <select value={s.v} onChange={(e) => s.set(e.target.value as BodyId)}>
              {PLANET_IDS.map((id) => (
                <option key={id} value={id}>
                  {BODIES[id].name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} 86`}
        width="100%"
        style={{ display: "block", maxWidth: 560, margin: "16px auto 0" }}
        role="img"
        aria-label="Distancias medias al Sol en escala lineal"
      >
        <line x1={x(0)} x2={x(maxAU)} y1={44} y2={44} stroke="var(--line-strong)" />
        {[0, 5, 10, 15, 20].map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={40} y2={48} stroke="var(--line-strong)" />
            <text x={x(t)} y={66} textAnchor="middle" fontSize="10" fill="var(--color-mist)">
              {t} UA
            </text>
          </g>
        ))}
        <circle cx={x(0)} cy={44} r={7} fill="#f6c453" />
        {PLANET_IDS.map((id) => {
          const au = meanDistanceAU(BODIES[id]) ?? 0;
          const on = id === a || id === b;
          return <circle key={id} cx={x(au)} cy={44} r={on ? 6 : 3} fill={BODIES[id].color} opacity={on ? 1 : 0.45} />;
        })}
        <line
          x1={x(Math.min(auA, auB))}
          x2={x(Math.max(auA, auB))}
          y1={24}
          y2={24}
          stroke="var(--color-sol)"
          strokeWidth={2}
        />
        <text
          x={(x(auA) + x(auB)) / 2}
          y={16}
          textAnchor="middle"
          fontSize="11"
          fill="var(--color-snow)"
          fontWeight="600"
        >
          {formatAU(Math.abs(auA - auB))}
        </text>
      </svg>
      {a === b ? (
        <p style={{ marginTop: 10 }}>Elige dos planetas distintos.</p>
      ) : (
        <>
          <p style={{ marginTop: 10 }}>
            Entre las órbitas de {BODIES[a].name} y {BODIES[b].name} hay en promedio{" "}
            <strong>{formatMillionKm(diffKm)}</strong>. La luz tarda {formatMinutes(lightMinutes(diffKm))} en
            recorrerlos. En este recorrido son {formatDistance(kmToModelMeters(diffKm))} de camino.
          </p>
          <p className="small muted" style={{ margin: 0 }}>
            Es la diferencia entre sus distancias medias al Sol. La distancia real entre los dos planetas cambia todo el
            tiempo, según dónde esté cada uno en su órbita: puedes verla en «Sistema solar». Escala del recorrido: 1 UA
            = {SCALE.metersPerAU / 1000} km.
          </p>
        </>
      )}
    </div>
  );
}
