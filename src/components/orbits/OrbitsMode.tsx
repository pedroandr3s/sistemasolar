"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { BODIES, lightMinutes } from "@/data/bodies";
import {
  ORBIT_PLANETS,
  auToKm,
  distanceAU,
  heliocentricEcliptic,
  length,
  type DistanceMode,
  type PlanetId,
} from "@/lib/astro";
import { chileUtcLabel, formatChileDateTime, formatUtc, parseChileInputValue, toChileInputValue } from "@/lib/time";
import { formatAU, formatMillionKm, formatMinutes, formatNumber } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useClientValue } from "@/lib/useClient";
import { detectQuality, detectWebGL } from "@/components/planet/quality";
import type { OrbitSceneProps } from "./OrbitScene";

const OrbitScene = dynamic(() => import("./OrbitScene"), {
  ssr: false,
  loading: () => (
    <div className="stage__status" role="status">
      <p>Calculando posiciones…</p>
    </div>
  ),
});

const SPEEDS = [
  { label: "1 día por segundo", days: 1 },
  { label: "1 semana por segundo", days: 7 },
  { label: "1 mes por segundo", days: 30.44 },
  { label: "1 año por segundo", days: 365.25 },
] as const;

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const YEAR_MS = 365.25 * 86_400_000;

function clampDate(ms: number): number {
  const min = Date.UTC(MIN_YEAR, 0, 1);
  const max = Date.UTC(MAX_YEAR, 11, 31, 23, 59);
  return Math.min(max, Math.max(min, ms));
}

export function OrbitsMode({ initialSelected }: { initialSelected?: PlanetId | null }) {
  const webgl = useClientValue(detectWebGL, null);
  const quality = useClientValue(detectQuality, "baja");
  const [nowMs] = useState(() => Date.now());
  const timeRef = useRef<number>(nowMs);
  const [displayMs, setDisplayMs] = useState<number>(nowMs);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [backwards, setBackwards] = useState(false);
  const [mode, setMode] = useState<DistanceMode>("comprimida");
  const [showOrbits, setShowOrbits] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [selected, setSelected] = useState<PlanetId | null>(initialSelected ?? null);
  const [view, setView] = useState<OrbitSceneProps["view"]>({ seq: 0, kind: "inicio" });
  const [inputError, setInputError] = useState<string | null>(null);

  const rateDays = (SPEEDS[speed]?.days ?? 1) * (backwards ? -1 : 1);
  const date = new Date(displayMs);
  const epochMs = Math.round(displayMs / YEAR_MS) * YEAR_MS;

  const onTick = useCallback((ms: number) => {
    const c = clampDate(ms);
    if (c !== ms) {
      timeRef.current = c;
      setPlaying(false);
    }
    setDisplayMs(c);
  }, []);

  function jumpTo(ms: number) {
    const c = clampDate(ms);
    timeRef.current = c;
    setDisplayMs(c);
  }

  function step(dir: 1 | -1) {
    jumpTo(timeRef.current + dir * (SPEEDS[speed]?.days ?? 1) * 86_400_000);
  }

  const states = useMemo(() => {
    const d = new Date(displayMs);
    return Object.fromEntries(ORBIT_PLANETS.map((id) => [id, heliocentricEcliptic(id, d)])) as Record<
      PlanetId,
      ReturnType<typeof heliocentricEcliptic>
    >;
  }, [displayMs]);

  const sel = selected ? states[selected] : null;
  const earth = states.tierra;

  return (
    <div>
      <div className="wrap" style={{ paddingTop: 14 }}>
        <h1 className="display" style={{ fontSize: "2.4rem", margin: 0 }}>
          Dónde están los planetas
        </h1>
        <p style={{ margin: "6px 0 0", fontWeight: 600 }} className="tabular" aria-live="polite">
          {formatChileDateTime(date)}
        </p>
        <p className="small muted" style={{ margin: 0 }}>
          Hora de Chile ({chileUtcLabel(date)}), {formatUtc(date)}
        </p>
      </div>

      <div className="stage stage--orbits" style={{ marginTop: 8 }}>
        {webgl === null ? null : webgl === "ninguno" ? (
          <div className="stage__status">
            <p>Este navegador no puede mostrar la escena 3D. La tabla de posiciones de abajo funciona igual.</p>
          </div>
        ) : (
          <ErrorBoundary
            fallback={
              <div className="stage__status">
                <p>No se pudo iniciar la escena 3D. La tabla de posiciones de abajo funciona igual.</p>
              </div>
            }
          >
            <OrbitScene
              timeRef={timeRef}
              playing={playing}
              rate={rateDays}
              distanceMode={mode}
              showOrbits={showOrbits}
              showLabels={showLabels}
              selected={selected}
              onSelect={setSelected}
              onTick={onTick}
              view={view}
              quality={quality}
              epochMs={epochMs}
            />
          </ErrorBoundary>
        )}
        <div className="stage__zoom" data-label-avoid>
          <button
            type="button"
            className="icon-btn"
            aria-label="Vista superior"
            title="Vista superior"
            onClick={() => setView((v) => ({ seq: v.seq + 1, kind: "superior" }))}
          >
            <Icon name="orbits" />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Vista oblicua"
            title="Vista oblicua"
            onClick={() => setView((v) => ({ seq: v.seq + 1, kind: "oblicua" }))}
          >
            <Icon name="eye" />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Restablecer la vista"
            title="Restablecer"
            onClick={() => setView((v) => ({ seq: v.seq + 1, kind: "inicio" }))}
          >
            <Icon name="reset" />
          </button>
        </div>
      </div>

      <div className="wrap">
        <p className="small muted" style={{ marginTop: 8 }}>
          Tamaños de los planetas aumentados para que se vean (no a escala). Distancias{" "}
          {mode === "comprimida"
            ? "comprimidas: se dibujan según la raíz cuadrada de la distancia real, conservando la dirección de cada planeta."
            : "a escala entre sí: la del Sol a cada planeta es proporcional a la real."}{" "}
          {playing && "El tiempo está acelerado."}
        </p>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" className="icon-btn" aria-label="Retroceder un paso" onClick={() => step(-1)}>
            <Icon name="step-back" />
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setPlaying((p) => !p)}
            aria-pressed={playing}
            style={{ minWidth: 128 }}
          >
            <Icon name={playing ? "pause" : "play"} size={18} />
            {playing ? "Pausar" : "Reproducir"}
          </button>
          <button type="button" className="icon-btn" aria-label="Avanzar un paso" onClick={() => step(1)}>
            <Icon name="step-forward" />
          </button>
          <button
            type="button"
            className="btn btn--small"
            onClick={() => {
              jumpTo(Date.now());
              setPlaying(false);
            }}
          >
            <Icon name="clock" size={18} />
            Ahora
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12, marginTop: 14 }}>
          <label className="field">
            Velocidad
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              {SPEEDS.map((s, i) => (
                <option key={s.label} value={i}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Sentido
            <select value={backwards ? "atras" : "adelante"} onChange={(e) => setBackwards(e.target.value === "atras")}>
              <option value="adelante">Hacia el futuro</option>
              <option value="atras">Hacia el pasado</option>
            </select>
          </label>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            Elegir fecha y hora (hora de Chile)
            <input
              type="datetime-local"
              value={toChileInputValue(date)}
              min={`${MIN_YEAR}-01-01T00:00`}
              max={`${MAX_YEAR}-12-31T23:59`}
              onChange={(e) => {
                const d = parseChileInputValue(e.target.value);
                if (!d) {
                  setInputError("Fecha no válida.");
                  return;
                }
                const y = d.getUTCFullYear();
                if (y < MIN_YEAR || y > MAX_YEAR) {
                  setInputError(`Elige una fecha entre ${MIN_YEAR} y ${MAX_YEAR}.`);
                  return;
                }
                setInputError(null);
                setPlaying(false);
                jumpTo(d.getTime());
              }}
            />
          </label>
        </div>
        {inputError && (
          <p className="notice notice--error" role="alert" style={{ marginTop: 10 }}>
            {inputError}
          </p>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
          <button type="button" className="chip" aria-pressed={showOrbits} onClick={() => setShowOrbits((v) => !v)}>
            Órbitas
          </button>
          <button type="button" className="chip" aria-pressed={showLabels} onClick={() => setShowLabels((v) => !v)}>
            Nombres
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={mode === "real"}
            onClick={() => setMode((m) => (m === "real" ? "comprimida" : "real"))}
          >
            Distancias a escala
          </button>
        </div>

        <section className="section" aria-labelledby="planetas-lista">
          <h2 id="planetas-lista" className="section-title" style={{ fontSize: "1.4rem" }}>
            Planetas
          </h2>
          <p className="small muted" style={{ marginTop: 0 }}>
            Toca un planeta en la escena o en la lista para ver sus distancias.
          </p>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(9.5rem, 1fr))",
              gap: 8,
            }}
          >
            {ORBIT_PLANETS.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  className="chip"
                  aria-pressed={selected === id}
                  onClick={() => setSelected(selected === id ? null : id)}
                  style={{ width: "100%", justifyContent: "space-between" }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span
                      aria-hidden="true"
                      style={{ width: 10, height: 10, borderRadius: "50%", background: BODIES[id].color }}
                    />
                    {BODIES[id].name}
                  </span>
                  <span className="tabular small">{formatNumber(length(states[id]), 2)} UA</span>
                </button>
              </li>
            ))}
          </ul>

          {selected && sel && (
            <div className="panel" style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "1.2rem" }}>{BODIES[selected].name}</p>
                <button
                  type="button"
                  className="btn btn--small"
                  onClick={() => setView((v) => ({ seq: v.seq + 1, kind: "centrar" }))}
                >
                  <Icon name="crosshair" size={18} />
                  Centrar
                </button>
              </div>
              <dl className="facts" style={{ marginTop: 8 }}>
                <div>
                  <dt>Distancia al Sol</dt>
                  <dd>
                    {formatAU(length(sel))}
                    <small>
                      {formatMillionKm(auToKm(length(sel)))}. La luz del Sol tarda{" "}
                      {formatMinutes(lightMinutes(auToKm(length(sel))))} en llegar.
                    </small>
                  </dd>
                </div>
                {selected !== "tierra" && (
                  <div>
                    <dt>Distancia a la Tierra</dt>
                    <dd>
                      {formatAU(distanceAU(sel, earth))}
                      <small>{formatMillionKm(auToKm(distanceAU(sel, earth)))} en este momento.</small>
                    </dd>
                  </div>
                )}
              </dl>
              <details className="qa" style={{ marginTop: 6 }}>
                <summary>Distancia a los demás planetas</summary>
                <div>
                  <dl className="facts">
                    {ORBIT_PLANETS.filter((o) => o !== selected).map((o) => (
                      <div key={o}>
                        <dt>{BODIES[o].name}</dt>
                        <dd>
                          {formatAU(distanceAU(sel, states[o]))}
                          <small>{formatMillionKm(auToKm(distanceAU(sel, states[o])))}</small>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </details>
            </div>
          )}
        </section>

        <section className="section" aria-labelledby="por-que">
          <h2 id="por-que" className="section-title" style={{ fontSize: "1.4rem" }}>
            ¿Por qué cambian de lugar?
          </h2>
          <div className="prose-block">
            <p>
              Los planetas nunca se detienen: dan vueltas alrededor del Sol, cada uno a su ritmo. Mercurio completa una
              vuelta en 88 días; Urano tarda 84 años. Por eso su posición en el espacio cambia todos los días.
            </p>
            <p>
              Las esculturas del camino no se mueven: muestran solo la distancia media de cada planeta al Sol, puestas
              una detrás de otra en una línea. Es un modelo de las distancias, no una foto de dónde está cada planeta
              hoy. Esa foto es la que ves en esta pantalla.
            </p>
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>
            Posiciones heliocéntricas calculadas con Astronomy Engine (modelo VSOP87 truncado), en el plano de la
            eclíptica J2000. La precisión es del orden de un minuto de arco: suficiente para visualizar, pero no es una
            efeméride profesional. Las órbitas se dibujan con esas mismas posiciones, incluida su inclinación.
          </p>
        </section>
      </div>
    </div>
  );
}
