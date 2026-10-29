"use client";

import { cardinal, normalizeDegrees } from "@/lib/geo";

interface Props {
  /** Rumbo geográfico hacia el objetivo (grados desde el norte). */
  bearing: number | null;
  /** Orientación del teléfono; si es `null`, el dial se dibuja con el norte arriba. */
  heading: number | null;
  /** Semiancho del abanico de incertidumbre (grados). */
  uncertainty: number;
  /** Ocultar la flecha si la precisión no permite indicar una dirección. */
  hideArrow: boolean;
  targetColor: string;
}

const C = 150;
const R = 128;

function polar(angleDeg: number, r: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function wedge(center: number, half: number, r: number): string {
  const h = Math.min(Math.max(half, 2), 179);
  const [x1, y1] = polar(center - h, r);
  const [x2, y2] = polar(center + h, r);
  const large = h * 2 > 180 ? 1 : 0;
  return `M${C} ${C} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

/**
 * Dial de orientación. Con brújula activa, el dial gira para que la «N»
 * apunte al norte real y la flecha indique la estación respecto del teléfono.
 * Sin brújula, se dibuja con el norte arriba (como un mapa).
 */
export function CompassDial({ bearing, heading, uncertainty, hideArrow, targetColor }: Props) {
  const rotation = heading === null ? 0 : -heading;
  const arrowAngle = bearing === null ? null : normalizeDegrees(bearing + rotation);
  const marks = [
    { a: 0, t: "N" },
    { a: 90, t: "E" },
    { a: 180, t: "S" },
    { a: 270, t: "O" },
  ];

  return (
    <div className="compass">
      <svg
        viewBox="0 0 300 300"
        width="100%"
        height="100%"
        role="img"
        aria-label={
          bearing === null
            ? "Dirección no disponible"
            : `Rumbo ${Math.round(bearing)} grados, hacia el ${cardinal(bearing)}`
        }
      >
        <circle cx={C} cy={C} r={R + 12} fill="var(--color-night-2)" stroke="var(--line-strong)" />
        <g transform={`rotate(${rotation} ${C} ${C})`}>
          {Array.from({ length: 72 }, (_, i) => {
            const a = i * 5;
            const major = a % 30 === 0;
            const [x1, y1] = polar(a, R + 6);
            const [x2, y2] = polar(a, R + (major ? -6 : 0));
            return (
              <line
                key={a}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={a === 0 ? "#f2907a" : "rgb(167 178 201 / 0.55)"}
                strokeWidth={major ? 2 : 1}
              />
            );
          })}
          {marks.map((m) => {
            const [x, y] = polar(m.a, R - 22);
            return (
              <text
                key={m.t}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                transform={`rotate(${-rotation} ${x} ${y})`}
                fill={m.t === "N" ? "#f2907a" : "var(--color-mist)"}
                fontSize="20"
                fontWeight="600"
                fontFamily="var(--font-display)"
              >
                {m.t}
              </text>
            );
          })}
        </g>
        {arrowAngle !== null && !hideArrow && (
          <>
            <path d={wedge(arrowAngle, uncertainty, R - 4)} fill={targetColor} opacity={0.18} />
            <g transform={`rotate(${arrowAngle} ${C} ${C})`}>
              <path
                d={`M${C} ${C - R + 34} L${C + 18} ${C + 6} L${C} ${C - 6} L${C - 18} ${C + 6} Z`}
                fill={targetColor}
                stroke="var(--color-night)"
                strokeWidth={2}
              />
            </g>
          </>
        )}
        <circle cx={C} cy={C} r={6} fill="var(--color-snow)" />
        {heading !== null && (
          <path d={`M${C} 4 L${C - 8} 18 L${C + 8} 18 Z`} fill="var(--color-snow)" aria-hidden="true" />
        )}
      </svg>
    </div>
  );
}
