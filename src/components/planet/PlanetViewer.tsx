"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import type { Body } from "@/data/bodies";
import { Icon } from "@/components/ui/Icon";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { formatDurationHours, formatNumber } from "@/lib/format";
import { useClientValue, useReducedMotion } from "@/lib/useClient";
import { detectQuality, detectWebGL } from "./quality";
import type { EarthNow } from "./PlanetCanvas";
import type { TextureStatus } from "./useTextures";
import { ArButton } from "./ArButton";

const PlanetCanvas = dynamic(() => import("./PlanetCanvas"), {
  ssr: false,
  loading: () => <StageStatus>Preparando el modelo 3D…</StageStatus>,
});

function StageStatus({ children }: { children: React.ReactNode }) {
  return (
    <div className="stage__status" role="status">
      <p>{children}</p>
    </div>
  );
}

/** Vista simplificada cuando el navegador no tiene WebGL. */
function FlatFallback({ body }: { body: Body }) {
  const tex = body.render.texture?.low;
  return (
    <div className="stage__status" style={{ pointerEvents: "auto" }}>
      <div style={{ display: "grid", justifyItems: "center", gap: 16 }}>
        <div
          aria-hidden="true"
          style={{
            width: 170,
            height: 170,
            borderRadius: "50%",
            backgroundColor: body.color,
            backgroundImage: tex
              ? `radial-gradient(circle at 35% 35%, rgb(255 255 255 / 0.15), rgb(0 0 0 / 0.55) 75%), url(${tex})`
              : `radial-gradient(circle at 35% 35%, #fff6d0, ${body.color} 45%, #9a4a10 100%)`,
            backgroundSize: "cover, 200% 100%",
            backgroundPosition: "center, 30% 50%",
          }}
        />
        <p className="small" style={{ maxWidth: 300 }}>
          Este navegador no puede mostrar modelos 3D (WebGL no está disponible). Se muestra una vista simplificada; el
          resto de la información funciona igual.
        </p>
      </div>
    </div>
  );
}

export function PlanetViewer({ body }: { body: Body }) {
  const reduced = useReducedMotion();
  const webgl = useClientValue(detectWebGL, null);
  const quality = useClientValue(detectQuality, "baja");

  const [rotatePref, setRotatePref] = useState<"auto" | "on" | "off">("auto");
  const [labels, setLabels] = useState(false);
  const [compare, setCompare] = useState(false);
  const [special, setSpecial] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [zoom, setZoom] = useState<{ seq: number; dir: 1 | -1 }>({ seq: 0, dir: 1 });
  const [resetSeq, setResetSeq] = useState(0);
  const [focusSeq, setFocusSeq] = useState(0);
  const [nudge, setNudge] = useState({ seq: 0, azimuth: 0, polar: 0 });
  const [texStatus, setTexStatus] = useState<TextureStatus>("cargando");
  const [earthNow, setEarthNow] = useState<EarthNow | null>(null);
  /** La pista «gira con el dedo» se va con el primer toque o tecla sobre el modelo. */
  const [touched, setTouched] = useState(false);

  const kind = body.render.special.kind;
  const rotating = rotatePref === "auto" ? !reduced && body.id !== "tierra" : rotatePref === "on";
  const compareLabel = body.id === "tierra" ? "Comparar con la Luna" : "Comparar con la Tierra";
  const showCompareChip = kind !== "compare-earth";
  const comparing = compare || (special && kind === "compare-earth");

  const onTextureStatus = useCallback((s: TextureStatus) => setTexStatus(s), []);
  const onEarthNow = useCallback((i: EarthNow) => setEarthNow(i), []);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [expanded]);

  function toggleSpecial() {
    const next = !special;
    setSpecial(next);
    if (next) {
      if (kind === "focus-label" || kind === "daynight") setRotatePref("off");
      setFocusSeq((n) => n + 1);
    } else if (kind === "rings" || kind === "axis" || kind === "focus-label" || kind === "daynight") {
      setResetSeq((n) => n + 1);
    }
  }

  function onStageKey(e: KeyboardEvent<HTMLDivElement>) {
    const step = 12;
    const map: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const d = map[e.key];
    if (d) {
      e.preventDefault();
      setNudge((n) => ({ seq: n.seq + 1, azimuth: d[0], polar: d[1] }));
    } else if (e.key === "+" || e.key === "=") {
      setZoom((z) => ({ seq: z.seq + 1, dir: 1 }));
    } else if (e.key === "-") {
      setZoom((z) => ({ seq: z.seq + 1, dir: -1 }));
    }
  }

  const realRotation = formatDurationHours(body.rotationPeriodHours);
  // Notas de lo que se acaba de activar (se leen al momento).
  const notes: string[] = [];
  if (comparing)
    notes.push(
      body.id === "tierra"
        ? "La Tierra y la Luna se muestran con sus tamaños a escala; la distancia entre ellas no lo está."
        : `Tamaños a escala: ${body.nameInSentence} mide ${formatNumber(body.diameterKm / 12_756, body.diameterKm > 12_756 ? 1 : 2)} veces el diámetro de la Tierra.`,
    );
  if (special && kind === "radar")
    notes.push("Bajo las nubes: mapa de radar de la sonda Magellan (NASA), en colores falsos.");
  if (body.id === "tierra" && earthNow && special) {
    notes.push(
      earthNow.day
        ? `La luz y la sombra son las de este momento: ahora es de día en Ñuble (el Sol está a ${formatNumber(earthNow.sunElevationDeg, 0)}° sobre el horizonte).`
        : `La luz y la sombra son las de este momento: ahora es de noche en Ñuble.`,
    );
  }
  // Aclaraciones permanentes sobre el modelo: van plegadas, para quien quiera leerlas.
  const finePrint: string[] = [
    `El giro está acelerado: una vuelta cada ${body.render.spinSeconds} s. En la realidad tarda ${realRotation}.`,
  ];
  if (body.id === "tierra") finePrint.push("La luz y la sombra de la Tierra corresponden a la hora actual.");
  if (body.render.rings?.enhanced)
    finePrint.push("Los anillos de Urano se realzaron para que se vean: en la realidad son casi negros.");
  if (body.render.artisticSurface && body.id !== "sol")
    finePrint.push("La superficie es una representación artística hecha para este proyecto.");
  if (body.id === "sol") finePrint.push("La superficie es una representación animada, no una imagen real del Sol.");

  return (
    <div>
      <div
        className={`stage ${expanded ? "stage--expanded" : ""}`}
        tabIndex={0}
        role="group"
        aria-roledescription="modelo 3D"
        aria-label={`Modelo 3D de ${body.nameInSentence}. Arrastra para girarlo o usa las flechas del teclado; más y menos para acercar.`}
        onKeyDown={(e) => {
          setTouched(true);
          onStageKey(e);
        }}
        onPointerDown={() => setTouched(true)}
      >
        {webgl === null ? (
          <StageStatus>Preparando el modelo 3D…</StageStatus>
        ) : webgl === "ninguno" ? (
          <FlatFallback body={body} />
        ) : (
          <ErrorBoundary fallback={<FlatFallback body={body} />}>
            <PlanetCanvas
              body={body}
              quality={quality}
              autoRotate={rotating}
              showLabels={labels}
              compare={compare}
              special={special}
              reducedMotion={reduced && rotatePref !== "on"}
              zoomSeq={zoom.seq}
              zoomDir={zoom.dir}
              resetSeq={resetSeq}
              focusSeq={focusSeq}
              nudge={nudge}
              onTextureStatus={onTextureStatus}
              onEarthNow={onEarthNow}
            />
          </ErrorBoundary>
        )}

        {webgl && webgl !== "ninguno" && texStatus !== "lista" && (
          <p className="stage__note" role="status">
            {texStatus === "cargando"
              ? "Cargando la superficie…"
              : "No se pudo descargar la textura: se muestra un color de referencia."}
          </p>
        )}

        {webgl && webgl !== "ninguno" && (
          <>
            {!touched && (
              <p className="drag-hint" aria-hidden="true">
                <Icon name="hand" size={26} />
                Gira con el dedo
              </p>
            )}
            <div className="stage__tools" data-label-avoid>
              <button type="button" className="tool-btn" onClick={() => setZoom((z) => ({ seq: z.seq + 1, dir: 1 }))}>
                <Icon name="plus" size={20} />
                Acercar
              </button>
              <button type="button" className="tool-btn" onClick={() => setZoom((z) => ({ seq: z.seq + 1, dir: -1 }))}>
                <Icon name="minus" size={20} />
                Alejar
              </button>
              <button type="button" className="tool-btn" onClick={() => setResetSeq((n) => n + 1)}>
                <Icon name="reset" size={20} />
                Reiniciar
              </button>
              <button
                type="button"
                className="tool-btn"
                onClick={() => setExpanded((v) => !v)}
                aria-pressed={expanded}
                aria-label={expanded ? "Achicar el modelo" : "Agrandar el modelo a pantalla completa"}
              >
                <Icon name={expanded ? "collapse" : "expand"} size={20} />
                {expanded ? "Achicar" : "Agrandar"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="wrap stage-actions">
        <ArButton body={body} />
        {webgl && webgl !== "ninguno" && (
          <div className="chip-row" role="group" aria-label="Prueba con el modelo">
            <button type="button" className="chip chip--accent" aria-pressed={special} onClick={toggleSpecial}>
              <Icon name="eye" size={18} />
              {body.render.special.label}
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={rotating}
              onClick={() => setRotatePref(rotating ? "off" : "on")}
            >
              <Icon name={rotating ? "pause" : "play"} size={16} />
              {rotating ? "Pausar giro" : "Girar"}
            </button>
            <button type="button" className="chip" aria-pressed={labels} onClick={() => setLabels((v) => !v)}>
              <Icon name="tag" size={18} />
              Nombres
            </button>
            {showCompareChip && (
              <button type="button" className="chip" aria-pressed={compare} onClick={() => setCompare((v) => !v)}>
                <Icon name="ruler" size={18} />
                {compareLabel}
              </button>
            )}
          </div>
        )}
        <div aria-live="polite">
          {notes.map((n) => (
            <p key={n} className="small muted stage-actions__note">
              {n}
            </p>
          ))}
        </div>
        <details className="fine-print">
          <summary>Sobre este modelo 3D</summary>
          <ul>
            {finePrint.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
