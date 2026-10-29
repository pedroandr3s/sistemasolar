import type { Metadata } from "next";
import Link from "next/link";
import { GlobalShell } from "@/components/shell/GlobalShell";
import { SOURCES } from "@/data/sources";
import { ROUTE_META } from "@/lib/route";
import { SCALE, scaleDenominator } from "@/config/scale";
import { formatDistance, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Fuentes, licencias y métodos" };

export default function SourcesPage() {
  return (
    <GlobalShell>
      <div className="wrap" style={{ paddingTop: 14 }}>
        <h1 className="display" style={{ fontSize: "2.4rem", margin: 0 }}>
          Fuentes, licencias y métodos
        </h1>
        <p className="muted" style={{ marginTop: 6 }}>
          Para quien quiera comprobar los datos y distinguir lo medido de lo aproximado.
        </p>

        <section className="section" aria-labelledby="escala">
          <h2 id="escala" className="section-title">
            La escala del recorrido
          </h2>
          <div className="prose-block">
            <p>
              1 unidad astronómica (UA, 149.597.870,7 km por definición de la IAU) se representa con{" "}
              {formatNumber(SCALE.metersPerAU / 1000)} km de camino: una escala de 1 :{" "}
              {formatNumber(scaleDenominator(), 0)}. Se usa la distancia media de cada planeta al Sol (el semieje mayor
              de su órbita), medida sobre el trazado de la ruta desde el Sol.
            </p>
            <p>Hay cuatro distancias distintas que la app nunca mezcla:</p>
            <ol>
              <li>La distancia astronómica real (millones de km).</li>
              <li>La distancia representada a escala (km de recorrido desde el Sol).</li>
              <li>La distancia acumulada por el camino, siguiendo la carretera.</li>
              <li>La distancia geográfica en línea recta entre dos coordenadas.</li>
            </ol>
            <p>
              Mientras no haya ubicaciones verificadas en terreno, cada estación se dibuja en su posición teórica sobre
              el trazado. Esa posición no indica un lugar seguro para detenerse.
            </p>
          </div>
        </section>

        <section className="section" aria-labelledby="ruta">
          <h2 id="ruta" className="section-title">
            El trazado de la ruta
          </h2>
          <p>
            {ROUTE_META.fuente}, perfil «{ROUTE_META.perfil}», entre la {ROUTE_META.origen.nombre} y la{" "}
            {ROUTE_META.destino.nombre}. Largo: {formatDistance(ROUTE_META.largoCompletoOSRMm)}, de los cuales{" "}
            {formatDistance(ROUTE_META.tramoN31m)} van por la Ruta N-31. Simplificación: {ROUTE_META.simplificacion}.
            Obtenido el {ROUTE_META.obtenido}. Licencia: {ROUTE_META.licencia}.
          </p>
        </section>

        <section className="section" aria-labelledby="orbitas">
          <h2 id="orbitas" className="section-title">
            Posiciones de los planetas
          </h2>
          <p>
            Se calculan en el teléfono con Astronomy Engine 2.1.19, que usa una versión truncada del modelo planetario
            VSOP87. Su precisión es del orden de un minuto de arco: suficiente para una visualización, no para
            navegación ni observación profesional. La hora se maneja en UTC y se muestra en hora de Chile continental.
          </p>
        </section>

        <section className="section" aria-labelledby="texturas">
          <h2 id="texturas" className="section-title">
            Imágenes de los planetas
          </h2>
          <ul className="prose-block" style={{ paddingLeft: 18 }}>
            <li>
              Tierra, Marte, Venus (radar), Júpiter, Saturno, Luna y estrellas (catálogo Hipparcos): NASA 3D Resources,
              material de NASA sin derechos de autor.
            </li>
            <li>
              La textura de la Tierra se recoloreó en tonos naturales con la máscara de costas de Natural Earth (dominio
              público): los colores de la tierra indican altura, no vegetación.
            </li>
            <li>
              Mercurio, Urano, las nubes de Venus y de la Tierra, y la superficie animada del Sol son representaciones
              generadas para este proyecto.
            </li>
            <li>
              Los anillos de Saturno y Urano usan los radios publicados por NASA; su estructura fina es ilustrativa y
              los de Urano se realzaron para que se vean.
            </li>
            <li>Tipografía Barlow, licencia SIL Open Font License 1.1.</li>
          </ul>
        </section>

        <section className="section" aria-labelledby="lista">
          <h2 id="lista" className="section-title">
            Lista de fuentes
          </h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {Object.values(SOURCES).map((s) => (
              <li key={s.id} style={{ borderTop: "1px solid var(--line)", padding: "12px 0" }}>
                <a className="text-link text-link--block" href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.title}
                </a>
                <span className="small muted" style={{ display: "block" }}>
                  {s.publisher}
                  {s.version ? `. ${s.version}` : ""}. Consultada el {s.accessed}.
                  {s.license ? ` Licencia: ${s.license}.` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="section" aria-labelledby="limites">
          <h2 id="limites" className="section-title">
            Límites conocidos
          </h2>
          <ul className="prose-block" style={{ paddingLeft: 18 }}>
            <li>Las cifras de lunas cambian con nuevos descubrimientos; cada una indica su fecha.</li>
            <li>Las temperaturas «medias» de los planetas gigantes corresponden al nivel de presión de 1 bar.</li>
            <li>
              La brújula de los teléfonos se refiere al norte magnético y puede alterarse cerca de autos, rejas o
              estructuras metálicas.
            </li>
            <li>El mapa base depende de internet; el trazado y las estaciones están incluidos en la app.</li>
          </ul>
          <p className="small muted">
            ¿Encontraste un error? Los datos están en <code>src/data/bodies.ts</code> y se pueden corregir sin tocar la
            interfaz.{" "}
            <Link className="text-link text-link--block" href="/">
              Volver al inicio
            </Link>
            .
          </p>
        </section>
      </div>
    </GlobalShell>
  );
}
