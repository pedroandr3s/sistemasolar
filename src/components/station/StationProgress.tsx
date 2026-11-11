"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { BODIES } from "@/data/bodies";
import { STATIONS } from "@/config/stations";
import { stationPath } from "@/config/site";
import { useProgress } from "@/lib/progress";

const ORDERED = [...STATIONS].sort((a, b) => a.order - b.order);

/**
 * Progreso del recorrido: las ocho paradas como puntos del color de su astro.
 * La actual va resaltada, las ya abiertas en este teléfono llevan un visto, y
 * todas se pueden tocar para ir a ellas.
 */
export function StationProgress({ currentId }: { currentId: string }) {
  const progress = useProgress();
  return (
    <nav className="stops" aria-label="Paradas del recorrido">
      <ol>
        {ORDERED.map((s) => {
          const current = s.id === currentId;
          const visited = Boolean(progress.visits[s.id]);
          return (
            <li key={s.id}>
              <Link
                href={stationPath(s.id)}
                // Sin precarga: ocho páginas de golpe compiten con la descarga del modelo 3D.
                prefetch={false}
                className="stops__stop"
                aria-current={current ? "step" : undefined}
                aria-label={`Parada ${s.order + 1}: ${s.name}${current ? " (estás aquí)" : visited ? " (ya la abriste)" : ""}`}
                data-visited={visited ? "true" : "false"}
                style={{ "--dot": BODIES[s.bodyId].color } as CSSProperties}
              >
                <span className="stops__dot" aria-hidden="true" />
                <span className="stops__name" aria-hidden="true">
                  {s.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
