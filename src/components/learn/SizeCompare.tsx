"use client";

import { useState } from "react";
import { BODIES, BODY_ORDER, type BodyId } from "@/data/bodies";
import { formatNumber } from "@/lib/format";

/**
 * Comparar tamaños: los dos círculos se dibujan con sus diámetros reales en
 * la misma escala (sin exagerar). Si uno es diminuto, se marca con un anillo.
 */
export function SizeCompare({ initialA = "tierra", initialB = "jupiter" }: { initialA?: BodyId; initialB?: BodyId }) {
  const [a, setA] = useState<BodyId>(initialA);
  const [b, setB] = useState<BodyId>(initialB);
  const A = BODIES[a];
  const B = BODIES[b];
  const big = Math.max(A.diameterKm, B.diameterKm);
  const W = 320;
  const H = 190;
  const maxD = 170;
  const rA = (A.diameterKm / big) * (maxD / 2);
  const rB = (B.diameterKm / big) * (maxD / 2);
  const gap = 24;
  const total = rA * 2 + rB * 2 + gap;
  const xA = (W - total) / 2 + rA;
  const xB = xA + rA + gap + rB;
  const baseY = H - 10;
  const ratio = A.diameterKm >= B.diameterKm ? A.diameterKm / B.diameterKm : B.diameterKm / A.diameterKm;
  const larger = A.diameterKm >= B.diameterKm ? A : B;
  const smaller = larger === A ? B : A;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label className="field">
          Primero
          <select value={a} onChange={(e) => setA(e.target.value as BodyId)}>
            {BODY_ORDER.map((id) => (
              <option key={id} value={id}>
                {BODIES[id].name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Segundo
          <select value={b} onChange={(e) => setB(e.target.value as BodyId)}>
            {BODY_ORDER.map((id) => (
              <option key={id} value={id}>
                {BODIES[id].name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ maxWidth: 520, display: "block", margin: "14px auto 0" }}
        role="img"
        aria-label={`${A.name} y ${B.name} dibujados a la misma escala`}
      >
        <line x1={0} x2={W} y1={baseY} y2={baseY} stroke="var(--line-strong)" />
        {[
          { x: xA, r: rA, body: A },
          { x: xB, r: rB, body: B },
        ].map(({ x, r, body }, i) => (
          <g key={i}>
            <circle cx={x} cy={baseY - Math.max(r, 0.6)} r={Math.max(r, 0.6)} fill={body.color} />
            {r < 4 && (
              <circle cx={x} cy={baseY - 6} r={10} fill="none" stroke="var(--color-snow)" strokeDasharray="2 2" />
            )}
            <text
              x={x}
              y={baseY - Math.max(r * 2, 20) - 8}
              textAnchor="middle"
              fill="var(--color-snow)"
              fontSize="12"
              fontWeight="600"
            >
              {body.name}
            </text>
          </g>
        ))}
      </svg>
      <p style={{ marginTop: 12 }}>
        {a === b ? (
          "Elige dos cuerpos distintos para compararlos."
        ) : (
          <>
            {larger.name} es <strong>{formatNumber(ratio, ratio < 10 ? 1 : 0)} veces más ancho</strong> que{" "}
            {smaller.nameInSentence}.
          </>
        )}
      </p>
      <p className="small muted" style={{ margin: 0 }}>
        Diámetros reales: {A.name}, {formatNumber(A.diameterKm)} km; {B.name}, {formatNumber(B.diameterKm)} km. Ambos se
        dibujan a la misma escala, sin exagerar ninguno.
      </p>
    </div>
  );
}
