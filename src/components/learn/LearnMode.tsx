import Link from "next/link";
import { isBodyId, type BodyId } from "@/data/bodies";
import { SizeCompare } from "./SizeCompare";
import { DistanceCompare } from "./DistanceCompare";
import { RotationDemo } from "./RotationDemo";
import { QuestionCards } from "./QuestionCards";
import { JourneyTable } from "./JourneyTable";
import { Icon } from "@/components/ui/Icon";

/**
 * Modo Aprender: cada bloque tiene un solo objetivo de aprendizaje y se
 * entiende interactuando, no leyendo.
 */
export function LearnMode({ stationId }: { stationId?: string }) {
  const bodyId: BodyId | undefined = stationId && isBodyId(stationId) ? stationId : undefined;
  const sizeA: BodyId = bodyId && bodyId !== "tierra" ? bodyId : "jupiter";

  return (
    <div className="wrap" style={{ paddingTop: 14 }}>
      <h1 className="display" style={{ fontSize: "2.4rem", margin: 0 }}>
        Aprender jugando con el sistema solar
      </h1>
      <p className="muted" style={{ marginTop: 6 }}>
        Toca, compara y descubre. Cada actividad explica una sola idea.
      </p>

      <section className="section" aria-labelledby="tamanos">
        <h2 id="tamanos" className="section-title">
          ¿Qué tan grandes son?
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Idea: los planetas tienen tamaños muy distintos. Elige dos y compáralos a escala real.
        </p>
        <SizeCompare initialA="tierra" initialB={sizeA} />
      </section>

      <section className="section" aria-labelledby="distancias">
        <h2 id="distancias" className="section-title">
          ¿Qué tan lejos están?
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Idea: las distancias entre planetas son enormes y crecen mucho hacia afuera.
        </p>
        <DistanceCompare
          initialA={bodyId && bodyId !== "sol" ? bodyId : "tierra"}
          initialB={bodyId === "urano" ? "saturno" : "urano"}
        />
      </section>

      <section className="section" aria-labelledby="movimientos">
        <h2 id="movimientos" className="section-title">
          Rotación y traslación
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Idea: un planeta hace dos movimientos a la vez.
        </p>
        <RotationDemo />
      </section>

      <section className="section" aria-labelledby="viaje">
        <h2 id="viaje" className="section-title">
          Un viaje desde el Sol
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Idea: incluso la luz, lo más rápido que existe, tarda horas en llegar a los planetas lejanos.
        </p>
        <JourneyTable highlight={bodyId} />
      </section>

      <section className="section" aria-labelledby="preguntas">
        <h2 id="preguntas" className="section-title">
          Preguntas para descubrir
        </h2>
        <QuestionCards />
      </section>

      <section className="section" aria-labelledby="tiempo">
        <h2 id="tiempo" className="section-title">
          Los planetas se mueven
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Idea: no todos tardan lo mismo en dar la vuelta al Sol. Adelanta el tiempo y míralo.
        </p>
        <Link className="btn" href={stationId ? `/estacion/${stationId}/sistema-solar` : "/sistema-solar"}>
          <Icon name="orbits" size={20} />
          Abrir la simulación de órbitas
        </Link>
      </section>

      <section className="section" aria-labelledby="bitacora">
        <h2 id="bitacora" className="section-title">
          Tu bitácora
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Las estaciones que abras quedan guardadas en este teléfono, con una idea para recordar de cada planeta. Sin
          registro ni datos personales.
        </p>
        <Link className="btn" href="/bitacora">
          Ver mi bitácora
        </Link>
      </section>

      <p className="small muted" style={{ marginTop: 32 }}>
        La ciencia no es memorizar datos: es observar, hacer preguntas, construir modelos como este recorrido y
        revisarlos cuando aprendemos algo nuevo.
      </p>
      <div className="link-row small">
        <Link className="text-link text-link--block" href="/fuentes">
          De dónde vienen los datos y cómo se calculan
        </Link>
      </div>
    </div>
  );
}
