import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanetViewer } from "@/components/planet/PlanetViewer";
import { LevelTabs } from "@/components/station/LevelTabs";
import { KeyFacts } from "@/components/station/KeyFacts";
import { NextStation } from "@/components/station/NextStation";
import { Quiz } from "@/components/station/Quiz";
import { VisitRecorder } from "@/components/station/VisitRecorder";
import { ScaleBlock } from "@/components/station/ScaleBlock";
import { SOURCES } from "@/data/sources";
import { findPlacement, nextPlacement, previousPlacement } from "@/lib/stations";
import { SAFETY_NOTICE } from "@/config/stations";

const ORDINALS = [
  "",
  "el más cercano al Sol",
  "el segundo desde el Sol",
  "el tercero desde el Sol",
  "el cuarto desde el Sol",
  "el quinto desde el Sol",
  "el sexto desde el Sol",
  "el séptimo desde el Sol",
];

export async function generateMetadata({ params }: PageProps<"/estacion/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = findPlacement(id);
  if (!p) return {};
  return {
    title: p.body.name,
    description: p.body.hook,
    // Título y texto propios al compartir el enlace (la imagen sale de opengraph-image.tsx).
    openGraph: {
      title: `${p.body.name} · Sistema solar a escala San Carlos–San Fabián`,
      description: p.body.hook,
      locale: "es_CL",
      type: "website",
    },
  };
}

export default async function ExplorePage({ params }: PageProps<"/estacion/[id]">) {
  const { id } = await params;
  const placement = findPlacement(id);
  if (!placement) notFound();
  const { body } = placement;
  const next = nextPlacement(id);
  const prev = previousPlacement(id);
  const kindLine = body.id === "sol" ? "Estrella, centro del sistema solar" : `${body.kind}, ${ORDINALS[body.order]}`;
  const sources = Array.from(new Set([body.dataSource, ...(body.moons ? [body.moons.source] : [])])).map(
    (s) => SOURCES[s],
  );

  return (
    <>
      <VisitRecorder stationId={id} />
      <PlanetViewer body={body} />

      <div className="wrap">
        <div style={{ marginTop: 18 }}>
          <p className="kind-line" style={{ margin: 0 }}>
            <span className="dot" style={{ background: body.color }} aria-hidden="true" />
            {kindLine}
          </p>
          <h1 className="display planet-name">{body.name}</h1>
          <p className="lead" style={{ marginTop: 10 }}>
            {body.hook}
          </p>
        </div>

        <div style={{ marginTop: 22 }}>
          <NextStation current={placement} next={next} previous={prev} />
        </div>

        <section className="section" aria-labelledby="niveles">
          <h2 id="niveles" className="sr-only">
            Información sobre {body.name}
          </h2>
          <LevelTabs
            panels={{
              descubrir: (
                <div className="prose-block">
                  {body.discover.map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                  <div className="idea" style={{ marginTop: 20 }}>
                    <p className="small muted" style={{ margin: 0 }}>
                      Para recordar
                    </p>
                    <p style={{ margin: "4px 0 0", fontWeight: 600 }}>{body.keyIdea}</p>
                  </div>
                  <p style={{ marginTop: 20 }}>
                    <strong>Para imaginarlo: </strong>
                    {body.comparison}
                  </p>
                  <p>
                    <strong>Curiosidad: </strong>
                    {body.curiosity}
                  </p>
                </div>
              ),
              entender: (
                <div className="prose-block">
                  {body.understand.map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                  <ScaleBlock placement={placement} />
                  <h3 className="section-title" style={{ marginTop: 28, fontSize: "1.35rem" }}>
                    Datos clave
                  </h3>
                  <KeyFacts body={body} />
                </div>
              ),
              profundizar: (
                <div className="prose-block">
                  {body.deep.map((t) => (
                    <p key={t}>{t}</p>
                  ))}
                  {body.dataNotes.length > 0 && (
                    <div className="notice notice--info" style={{ marginTop: 18 }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600 }}>Sobre los datos y el modelo</p>
                        <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                          {body.dataNotes.map((n) => (
                            <li key={n}>{n}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                  <p className="small muted" style={{ marginTop: 18 }}>
                    Fuentes:{" "}
                    {sources.map((s, i) => (
                      <span key={s.id}>
                        {i > 0 && "; "}
                        <a className="text-link" href={s.url} target="_blank" rel="noopener noreferrer">
                          {s.publisher}, {s.title}
                        </a>
                        {s.version ? ` (${s.version})` : ""}
                      </span>
                    ))}
                    .
                  </p>
                  <div className="link-row small">
                    <Link className="text-link text-link--block" href="/fuentes">
                      Métodos, licencias y todas las fuentes
                    </Link>
                  </div>
                </div>
              ),
            }}
          />
        </section>

        <section className="section" aria-labelledby="pregunta">
          <h2 id="pregunta" className="section-title">
            La pregunta de esta estación
          </h2>
          <details className="qa">
            <summary>{body.stationQuestion.question}</summary>
            <div>
              <p style={{ margin: 0 }}>{body.stationQuestion.answer}</p>
            </div>
          </details>
        </section>

        <section className="section" aria-labelledby="quiz">
          <h2 id="quiz" className="section-title">
            Tres preguntas rápidas
          </h2>
          <Quiz stationId={id} questions={body.quiz} />
        </section>

        <hr className="divider" />
        <p className="small muted">{SAFETY_NOTICE}</p>
      </div>
    </>
  );
}
