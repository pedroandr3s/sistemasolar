import Link from "next/link";
import { ModeNav } from "@/components/shell/ModeNav";
import { RouteRoad } from "@/components/route/RouteRoad";
import { Icon, type IconName } from "@/components/ui/Icon";
import { getPlacements } from "@/lib/stations";
import { getRoute } from "@/lib/route";
import { formatNumber } from "@/lib/format";
import { SCALE } from "@/config/scale";
import { SAFETY_NOTICE } from "@/config/stations";

const MODES: { icon: IconName; title: string; text: string; href: string }[] = [
  {
    icon: "planet",
    title: "Explorar",
    text: "Gira cada planeta en 3D y descubre qué lo hace especial.",
    href: "/estacion/sol",
  },
  {
    icon: "compass",
    title: "Orientarme",
    text: "Encuentra la estación más cercana y hacia dónde queda la siguiente.",
    href: "/orientarme",
  },
  {
    icon: "orbits",
    title: "Sistema solar",
    text: "Mira dónde está cada planeta hoy, o en cualquier fecha.",
    href: "/sistema-solar",
  },
  { icon: "map", title: "Mapa del recorrido", text: "Las ocho estaciones sobre la Ruta N-31.", href: "/mapa" },
  {
    icon: "learn",
    title: "Aprender",
    text: "Compara tamaños y distancias, y pon a prueba lo que sabes.",
    href: "/aprender",
  },
];

export default function HomePage() {
  const placements = getPlacements();
  const last = placements[placements.length - 1];
  const routeKm = getRoute().length / 1000;
  const uranusKm = (last?.alongRouteMeters ?? 0) / 1000;
  const marsKm = (placements.find((p) => p.station.id === "marte")?.modelMeters ?? 0) / 1000;

  return (
    <div className="with-nav">
      <header className="top-bar">
        <span className="brand">
          <span
            aria-hidden="true"
            style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-sol)" }}
          />
          Sistema solar a escala
        </span>
        <span>Ñuble, Chile</span>
      </header>

      <main id="contenido">
        <section className="wrap" style={{ paddingTop: 28 }}>
          <h1 className="display" style={{ fontSize: "clamp(2.9rem, 13vw, 5.4rem)", margin: 0 }}>
            El sistema solar cabe en el camino a San Fabián
          </h1>
          <p className="lead" style={{ marginTop: 18, maxWidth: "36rem" }}>
            Ocho esculturas a lo largo de la Ruta N-31 muestran el Sol y los planetas hasta Urano a una misma escala:
            cada {formatNumber(SCALE.metersPerAU / 1000)} km de camino equivalen a la distancia entre la Tierra y el
            Sol.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
            <Link href="/estacion/sol" className="btn btn--primary">
              Empezar en el Sol
              <Icon name="arrow-right" size={20} />
            </Link>
            <Link href="/mapa" className="btn">
              Ver el mapa del recorrido
            </Link>
          </div>
          <p className="small muted" style={{ marginTop: 16 }}>
            En cada estación hay un código QR que abre su página. También puedes recorrer todo desde aquí.
          </p>
        </section>

        <section className="wrap section" aria-labelledby="camino">
          <h2 id="camino" className="section-title">
            El camino, a escala
          </h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Los cuatro planetas rocosos caben en los primeros {formatNumber(marsKm, 1)} km. Después, los gigantes se
            separan tanto que Urano queda en el km {formatNumber(uranusKm, 1)} de los {formatNumber(routeKm, 1)} km del
            trazado.
          </p>
          <RouteRoad />
          <p className="small muted">
            Las posiciones son teóricas, calculadas con la escala sobre el trazado de la ruta. La ubicación definitiva
            de cada escultura todavía debe definirse en terreno.
          </p>
        </section>

        <section className="wrap section" aria-labelledby="modos">
          <h2 id="modos" className="section-title">
            Cinco formas de recorrerlo
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {MODES.map((m) => (
              <li key={m.title} style={{ borderTop: "1px solid var(--line)" }}>
                <Link
                  href={m.href}
                  style={{
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
                    padding: "14px 0",
                    textDecoration: "none",
                  }}
                >
                  <span style={{ color: "var(--color-sol)", marginTop: 2 }}>
                    <Icon name={m.icon} size={26} />
                  </span>
                  <span>
                    <span style={{ display: "block", fontWeight: 600 }}>{m.title}</span>
                    <span className="muted small">{m.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="wrap section">
          <div className="notice">
            <Icon name="warning" />
            <span>{SAFETY_NOTICE}</span>
          </div>
          <p className="small muted" style={{ marginTop: 18 }}>
            Datos de NASA y de la Unión Astronómica Internacional. Posiciones planetarias calculadas con Astronomy
            Engine. Trazado de la ruta: © colaboradores de OpenStreetMap.
          </p>
          <div className="link-row small">
            <Link className="text-link text-link--block" href="/fuentes">
              Fuentes, licencias y métodos
            </Link>
            <Link className="text-link text-link--block" href="/diagnostico">
              Diagnóstico para pruebas
            </Link>
          </div>
        </section>
      </main>
      <ModeNav />
    </div>
  );
}
