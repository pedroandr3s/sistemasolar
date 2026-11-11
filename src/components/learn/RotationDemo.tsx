"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useReducedMotion } from "@/lib/useClient";

const ORBIT_S = 14; // una vuelta al Sol en 14 s
const SPIN_S = 1.4; // un día en 1,4 s (10 días por año: no está a escala)

/**
 * Rotación y traslación: un planeta gira sobre sí mismo (marca blanca) y a la
 * vez da vueltas alrededor del Sol. El lado opuesto al Sol queda de noche.
 */
export function RotationDemo() {
  const reduced = useReducedMotion();
  const [spin, setSpin] = useState(true);
  const [orbit, setOrbit] = useState(true);
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const playing = userPlaying ?? !reduced;
  const [angles, setAngles] = useState({ orbit: 0.6, spin: 0 });

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      setAngles((a) => ({
        orbit: orbit ? a.orbit + (dt / ORBIT_S) * Math.PI * 2 : a.orbit,
        spin: spin ? a.spin + (dt / SPIN_S) * Math.PI * 2 : a.spin,
      }));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, orbit, spin]);

  const cx = 160;
  const cy = 112;
  const R = 82;
  const px = cx + R * Math.cos(angles.orbit);
  const py = cy + R * 0.55 * Math.sin(angles.orbit);
  const toSun = Math.atan2(cy - py, cx - px);
  const pr = 15;
  const markX = px + pr * 0.82 * Math.cos(angles.spin);
  const markY = py + pr * 0.82 * Math.sin(angles.spin);
  const markDay = Math.cos(angles.spin - toSun) > 0;
  // Mitad nocturna: semicírculo opuesto a la dirección del Sol.
  const nx = Math.cos(toSun + Math.PI / 2) * pr;
  const ny = Math.sin(toSun + Math.PI / 2) * pr;
  const night = `M${px + nx} ${py + ny} A${pr} ${pr} 0 0 1 ${px - nx} ${py - ny} Z`;

  return (
    <div>
      <svg
        viewBox="0 0 320 224"
        width="100%"
        style={{ display: "block", maxWidth: 520, margin: "0 auto" }}
        role="img"
        aria-label="Un planeta que gira sobre sí mismo mientras da vueltas alrededor del Sol"
      >
        <ellipse cx={cx} cy={cy} rx={R} ry={R * 0.55} fill="none" stroke="var(--line-strong)" strokeDasharray="4 5" />
        <circle cx={cx} cy={cy} r={20} fill="#f6c453" />
        <circle cx={px} cy={py} r={pr} fill="#5b9bd5" />
        <path d={night} fill="rgb(8 12 26 / 0.72)" />
        <circle cx={markX} cy={markY} r={3.2} fill={markDay ? "#ffffff" : "#a7b2c9"} stroke="#0f1830" strokeWidth={1} />
        <text x={14} y={214} fontSize="11" fill="var(--color-mist)">
          Tiempo acelerado: un año = {ORBIT_S} s y un día = {String(SPIN_S).replace(".", ",")} s (no a escala)
        </text>
      </svg>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 10 }}>
        <button type="button" className="chip" aria-pressed={playing} onClick={() => setUserPlaying(!playing)}>
          <Icon name={playing ? "pause" : "play"} size={16} />
          {playing ? "Pausar" : "Animar"}
        </button>
        <button type="button" className="chip" aria-pressed={spin} onClick={() => setSpin((v) => !v)}>
          Rotación
        </button>
        <button type="button" className="chip" aria-pressed={orbit} onClick={() => setOrbit((v) => !v)}>
          Traslación
        </button>
      </div>
      <div className="prose-block" style={{ marginTop: 14 }}>
        <p>
          <strong>Rotación:</strong> el planeta gira sobre su propio eje. Mira la marca blanca: pasa del lado iluminado
          al lado oscuro. Así se producen el día y la noche.
        </p>
        <p>
          <strong>Traslación:</strong> el planeta da vueltas alrededor del Sol. Una vuelta completa es un año. Apaga una
          de las dos para ver cada movimiento por separado.
        </p>
      </div>
    </div>
  );
}
