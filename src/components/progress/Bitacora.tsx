"use client";

import Link from "next/link";
import { BODIES } from "@/data/bodies";
import { STATIONS } from "@/config/stations";
import { stationPath } from "@/config/site";
import { resetProgress, useProgress } from "@/lib/progress";
import { formatChileDate } from "@/lib/time";
import { formatMillionKm } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

/** Bitácora de exploración: estaciones abiertas, insignias e ideas para recordar. */
export function Bitacora() {
  const progress = useProgress();
  const stations = [...STATIONS].sort((a, b) => a.order - b.order);
  const visited = stations.filter((s) => progress.visits[s.id]);
  const complete = visited.length === stations.length;
  const lastBody = BODIES[stations[stations.length - 1]!.bodyId];

  return (
    <div className="wrap" style={{ paddingTop: 14 }}>
      <h1 className="display" style={{ fontSize: "2.4rem", margin: 0 }}>
        Mi bitácora
      </h1>
      <p className="muted" style={{ marginTop: 6 }}>
        {visited.length === 0
          ? "Todavía no abres ninguna estación. Escanea el código QR de la primera, el Sol."
          : `Abriste ${visited.length} de ${stations.length} estaciones.`}{" "}
        Se guarda solo en este teléfono.
      </p>

      <div aria-hidden="true" style={{ display: "flex", gap: 6, marginTop: 14 }}>
        {stations.map((s) => (
          <span
            key={s.id}
            style={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              background: progress.visits[s.id] ? BODIES[s.bodyId].color : "var(--color-night-3)",
            }}
          />
        ))}
      </div>

      {complete && (
        <div className="idea" style={{ marginTop: 22 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "1.2rem" }}>Recorrido completo</p>
          <p style={{ margin: "6px 0 0" }}>
            Del Sol a Urano recorriste, a escala, {formatMillionKm(lastBody.meanDistanceKm ?? 0)}: la luz tarda unas 2
            horas y 40 minutos en hacer ese viaje. Gracias por explorar con curiosidad.
          </p>
        </div>
      )}

      <ol style={{ listStyle: "none", padding: 0, margin: "22px 0 0" }}>
        {stations.map((s) => {
          const body = BODIES[s.bodyId];
          const date = progress.visits[s.id];
          const quiz = progress.quiz[s.id];
          return (
            <li
              key={s.id}
              style={{
                borderTop: "1px solid var(--line)",
                padding: "14px 0",
                display: "grid",
                gridTemplateColumns: "44px 1fr",
                gap: 12,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  background: date ? body.color : "transparent",
                  border: date ? "none" : "1.5px dashed var(--line-strong)",
                  color: "var(--color-night)",
                }}
              >
                {date && <Icon name="check" size={20} />}
              </span>
              <div>
                <Link
                  href={stationPath(s.id)}
                  style={{
                    fontWeight: 600,
                    textDecoration: "none",
                    fontSize: "1.1rem",
                    display: "inline-flex",
                    alignItems: "center",
                    minHeight: 44,
                  }}
                >
                  {s.name}
                </Link>
                {date ? (
                  <>
                    <p className="small muted" style={{ margin: "2px 0 6px" }}>
                      Insignia obtenida el {formatChileDate(new Date(date))}
                      {quiz !== undefined ? `. Quiz: ${quiz} de 3` : ""}.
                    </p>
                    <p style={{ margin: 0 }}>{body.keyIdea}</p>
                  </>
                ) : (
                  <p className="small muted" style={{ margin: "2px 0 0" }}>
                    Aún no la abres.
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {visited.length > 0 && (
        <button
          type="button"
          className="btn btn--small"
          style={{ marginTop: 18 }}
          onClick={() => {
            if (window.confirm("¿Borrar el progreso guardado en este teléfono?")) resetProgress();
          }}
        >
          Borrar mi progreso
        </button>
      )}
      <p className="small muted" style={{ marginTop: 18 }}>
        Las insignias reconocen la curiosidad, no la velocidad: no hay premio por llegar primero. Recorre con calma y
        detente solo en lugares seguros.
      </p>
    </div>
  );
}
