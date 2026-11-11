"use client";

import type { CSSProperties } from "react";
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
  /** La primera parada que falta: el siguiente paso sugerido. */
  const pending = stations.find((s) => !progress.visits[s.id]);
  const lastBody = BODIES[stations[stations.length - 1]!.bodyId];

  return (
    <div className="wrap" style={{ paddingTop: 14 }}>
      <h1 className="page-title">Mi viaje</h1>
      <p className="lead" style={{ margin: "8px 0 0" }} role="status">
        {visited.length === 0
          ? "Todavía no tienes sellos. Cada parada que abras te da uno."
          : complete
            ? "¡Completaste el recorrido! Tienes los 8 sellos."
            : visited.length < stations.length / 2
              ? `¡Buen comienzo! Llevas ${visited.length} de ${stations.length} sellos.`
              : `¡Vas por más de la mitad! Llevas ${visited.length} de ${stations.length} sellos.`}
      </p>
      <p className="small muted" style={{ marginTop: 4 }}>
        Tus sellos se guardan solo en este teléfono.
      </p>

      <div className="log-progress" aria-hidden="true">
        {stations.map((s) => (
          <span key={s.id} style={progress.visits[s.id] ? { background: BODIES[s.bodyId].color } : undefined} />
        ))}
      </div>

      {pending && (
        <Link className="btn btn--primary btn--big btn--block" href={stationPath(pending.id)} style={{ marginTop: 18 }}>
          {visited.length === 0 ? "Empezar por el Sol" : `Ir a ${pending.name}`}
          <Icon name="arrow-right" size={24} />
        </Link>
      )}

      {complete && (
        <div className="idea" style={{ marginTop: 22 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: "1.2rem" }}>Recorrido completo</p>
          <p style={{ margin: "6px 0 0" }}>
            Del Sol a Urano recorriste, a escala, {formatMillionKm(lastBody.meanDistanceKm ?? 0)}: la luz tarda unas 2
            horas y 40 minutos en hacer ese viaje. Gracias por explorar con curiosidad.
          </p>
        </div>
      )}

      <ol className="log-list">
        {stations.map((s) => {
          const body = BODIES[s.bodyId];
          const date = progress.visits[s.id];
          const quiz = progress.quiz[s.id];
          return (
            <li
              key={s.id}
              className="log-item"
              data-done={date ? "true" : "false"}
              style={{ "--body": body.color } as CSSProperties}
            >
              <span className="log-item__badge" aria-hidden="true">
                {date && <Icon name="check" size={22} />}
              </span>
              <div>
                <Link href={stationPath(s.id)} className="log-item__name">
                  {s.name}
                </Link>
                {date ? (
                  <>
                    <p className="small muted" style={{ margin: "0 0 6px" }}>
                      Sello obtenido el {formatChileDate(new Date(date))}
                      {quiz !== undefined ? `. Quiz: ${quiz} de 3` : ""}.
                    </p>
                    <p style={{ margin: 0 }}>{body.keyIdea}</p>
                  </>
                ) : (
                  <p className="small muted" style={{ margin: 0 }}>
                    Te falta este sello.
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
        Los sellos reconocen la curiosidad, no la velocidad: no hay premio por llegar primero. Recorre con calma y
        detente solo en lugares seguros.
      </p>
    </div>
  );
}
