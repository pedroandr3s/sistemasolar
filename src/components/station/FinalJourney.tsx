"use client";

import { useEffect, useRef, useState } from "react";
import { BODIES, PLANET_IDS, lightMinutes, meanDistanceAU } from "@/data/bodies";
import { STATIONS } from "@/config/stations";
import { formatMinutes, formatNumber } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import { useReducedMotion } from "@/lib/useClient";
import { Icon } from "@/components/ui/Icon";

/** Duración de la animación. La luz tarda ~2 h 39 min en llegar a Urano. */
const ANIMATION_MS = 16_000;

const LAST = BODIES.urano;
const TOTAL_MIN = lightMinutes(LAST.meanDistanceKm ?? 0);
const LAST_AU = meanDistanceAU(LAST) ?? 1;
const MIN_PER_SECOND = TOTAL_MIN / (ANIMATION_MS / 1000);

const STOPS = PLANET_IDS.map((id) => {
  const b = BODIES[id];
  return {
    id,
    name: b.name,
    color: b.color,
    minutes: lightMinutes(b.meanDistanceKm ?? 0),
    fraction: (meanDistanceAU(b) ?? 0) / LAST_AU,
  };
});

/** En la pista solo se rotulan los planetas que no quedan amontonados junto al Sol. */
const LABELED = new Set(["tierra", "jupiter", "saturno", "urano"]);

/**
 * Experiencia final del recorrido (estación Urano): la luz del Sol viaja hasta
 * cada planeta a escala lineal de distancia, con el tiempo comprimido y declarado.
 * Objetivo de aprendizaje: las distancias son tan grandes que hasta la luz tarda
 * horas en cruzarlas, y los planetas exteriores están muchísimo más separados.
 */
export function FinalJourney() {
  const reduced = useReducedMotion();
  const progress = useProgress();
  const visited = STATIONS.filter((s) => progress.visits[s.id]).length;
  const [elapsedMin, setElapsedMin] = useState(0);
  const [running, setRunning] = useState(false);
  const frame = useRef<number | null>(null);
  const startedAt = useRef(0);
  const offsetMin = useRef(0);

  useEffect(() => {
    if (!running) return;
    startedAt.current = performance.now();
    const tick = (now: number) => {
      const min = offsetMin.current + ((now - startedAt.current) / 1000) * MIN_PER_SECOND;
      if (min >= TOTAL_MIN) {
        setElapsedMin(TOTAL_MIN);
        setRunning(false);
        return;
      }
      setElapsedMin(min);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [running]);

  const done = elapsedMin >= TOTAL_MIN;
  const launch = () => {
    if (reduced) {
      setElapsedMin(TOTAL_MIN);
      return;
    }
    offsetMin.current = done ? 0 : elapsedMin;
    if (done) setElapsedMin(0);
    setRunning(true);
  };
  const pause = () => {
    offsetMin.current = elapsedMin;
    setRunning(false);
  };

  // La pista es lineal en distancia: como la luz viaja a velocidad constante,
  // su posición es proporcional al tiempo transcurrido.
  const lightFraction = Math.min(1, elapsedMin / TOTAL_MIN);
  const reached = STOPS.filter((s) => elapsedMin >= s.minutes);
  const latest = reached[reached.length - 1];

  return (
    <section className="final-journey" aria-labelledby="viaje-luz">
      <h3 id="viaje-luz" style={{ margin: 0, fontSize: "1.2rem" }}>
        El viaje de la luz
      </h3>
      <p className="small muted" style={{ margin: "4px 0 0" }}>
        Recorriste el sistema solar a escala. Ahora mira cuánto tarda la luz del Sol, lo más rápido que existe, en hacer
        el mismo viaje.
      </p>

      <div className="final-journey__track" aria-hidden="true">
        <span className="final-journey__rail" />
        <span className="final-journey__light" style={{ width: `${lightFraction * 100}%` }} />
        <span className="final-journey__sun" />
        {STOPS.map((s) => (
          <span
            key={s.id}
            className={`final-journey__stop${elapsedMin >= s.minutes ? " is-reached" : ""}`}
            style={{ left: `${s.fraction * 100}%`, ["--stop-color" as string]: s.color }}
          >
            {LABELED.has(s.id) && <span className="final-journey__label">{s.name}</span>}
          </span>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
        {running ? (
          <button type="button" className="btn btn--small" onClick={pause}>
            <Icon name="pause" size={18} />
            Pausar
          </button>
        ) : (
          <button type="button" className="btn btn--primary btn--small" onClick={launch}>
            <Icon name={done ? "reset" : "play"} size={18} />
            {done ? "Repetir el viaje" : elapsedMin > 0 ? "Continuar" : "Lanzar la luz del Sol"}
          </button>
        )}
        <span className="tabular" style={{ fontWeight: 600 }} aria-hidden="true">
          {formatMinutes(elapsedMin)}
        </span>
      </div>
      <p className="small muted" style={{ margin: "6px 0 0" }}>
        Tiempo comprimido: cada segundo de la animación equivale a unos {formatNumber(MIN_PER_SECOND, 0)} minutos
        reales. Las distancias de la pista sí están a escala entre ellas.
      </p>

      <ol className="final-journey__list small">
        {STOPS.map((s) => {
          const on = elapsedMin >= s.minutes;
          return (
            <li key={s.id} className={on ? "is-reached" : undefined}>
              <span aria-hidden="true" className="final-journey__dot" style={{ background: s.color }} />
              <span>{s.name}</span>
              <span className="tabular">{formatMinutes(s.minutes)}</span>
            </li>
          );
        })}
      </ol>

      <p role="status" aria-live="polite" className="small" style={{ margin: "8px 0 0", minHeight: "1.4em" }}>
        {done
          ? `La luz llegó a Urano después de ${formatMinutes(TOTAL_MIN)}. A Júpiter le había llegado a los ${formatMinutes(STOPS.find((s) => s.id === "jupiter")!.minutes)}: más de la mitad del viaje es solo el tramo entre Saturno y Urano.`
          : latest && !running
            ? `La luz ya pasó por ${latest.name}.`
            : ""}
      </p>

      <div className="idea" style={{ marginTop: 12 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>
          {visited === STATIONS.length
            ? "Recorrido completo: abriste las 8 estaciones."
            : `Abriste ${visited} de ${STATIONS.length} estaciones en este teléfono.`}
        </p>
        <p className="small" style={{ margin: "4px 0 0" }}>
          La idea para llevarse: el espacio entre los planetas es enorme comparado con su tamaño, y crece mucho más allá
          de Marte. Por eso los cuatro planetas rocosos caben en los primeros kilómetros y los gigantes se reparten
          hasta San Fabián.
        </p>
      </div>
    </section>
  );
}
