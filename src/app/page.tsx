import Link from "next/link";
import { ModeNav } from "@/components/shell/ModeNav";
import { RouteRoad } from "@/components/route/RouteRoad";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PlanetOrb } from "@/components/ui/PlanetOrb";
import { getPlacements } from "@/lib/stations";
import { getRoute } from "@/lib/route";
import { formatKmMark, formatNumber } from "@/lib/format";
import { SCALE } from "@/config/scale";
import { SAFETY_NOTICE } from "@/config/stations";
import { stationPath } from "@/config/site";

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

const STEPS = [
  { title: "Escanea el QR", text: "Cada escultura del camino tiene uno. Apunta la cámara y la estación se abre sola." },
  { title: "Míralo en 3D", text: "Gira el planeta con el dedo, acércalo y descubre sus datos." },
  {
    title: "Ponlo en tu espacio",
    text: "Con realidad aumentada, el planeta aparece frente a ti, a través de la cámara.",
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
        <section className="wrap-wide home-hero" aria-labelledby="titulo">
          <div style={{ display: "grid", gap: 20 }}>
            <h1 id="titulo" className="display home-hero__title">
              El sistema solar cabe en el camino a San Fabián
            </h1>
            <p className="lead" style={{ margin: 0, maxWidth: "34rem" }}>
              Ocho esculturas muestran el Sol y los planetas a una misma escala: cada{" "}
              {formatNumber(SCALE.metersPerAU / 1000)} km de camino son la distancia entre la Tierra y el Sol.
            </p>

            <Link href="/escanear" className="scan-cta">
              <span className="scan-cta__icon" aria-hidden="true">
                <Icon name="qr" size={36} />
              </span>
              <span>
                <span className="scan-cta__title">Escanear QR</span>
                <span className="scan-cta__hint">Abre la cámara y mira el planeta en 3D y realidad aumentada</span>
              </span>
              <Icon name="arrow-right" size={26} />
            </Link>

            <div className="home-actions">
              <Link href={stationPath("sol")} className="btn">
                Empezar en el Sol
              </Link>
              <Link href="/mapa" className="btn">
                Mapa del recorrido
              </Link>
            </div>
          </div>
          <div className="home-hero__aside" aria-hidden="true">
            <div style={{ position: "relative", width: 300, height: 300 }}>
              <div style={{ position: "absolute", left: 20, top: 30 }}>
                <PlanetOrb id="saturno" size={190} />
              </div>
              <div style={{ position: "absolute", right: 0, bottom: 0 }}>
                <PlanetOrb id="tierra" size={120} />
              </div>
              <div style={{ position: "absolute", right: 30, top: 0 }}>
                <PlanetOrb id="marte" size={54} />
              </div>
            </div>
          </div>
        </section>

        <section className="wrap-wide section" aria-labelledby="planetas">
          <h2 id="planetas" className="section-title">
            Toca un planeta
          </h2>
          <ul className="planet-strip">
            {placements.map((p) => (
              <li key={p.station.id}>
                <Link href={stationPath(p.station.id)} className="planet-chip">
                  <PlanetOrb id={p.body.id} size={p.body.id === "sol" ? 56 : 52} />
                  <span className="planet-chip__name">{p.station.name}</span>
                  <span className="planet-chip__km tabular">
                    {p.alongRouteMeters !== null ? formatKmMark(p.alongRouteMeters) : "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="wrap-wide section" aria-labelledby="como">
          <h2 id="como" className="section-title">
            Cómo funciona
          </h2>
          <ol className="steps">
            {STEPS.map((s) => (
              <li key={s.title}>
                <span>
                  <strong>{s.title}</strong>
                  <span className="muted small">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="wrap section" aria-labelledby="simulador">
          <h2 id="simulador" className="section-title">
            ¿Aún no estás en la ruta?
          </h2>
          <Link href="/qr" className="sim-card">
            <Icon name="qr" size={30} />
            <span>
              <span style={{ display: "block", fontWeight: 600 }}>Simulador de QR</span>
              <span className="muted small">
                Muestra los ocho códigos en la pantalla de tu computador y escanéalos con el celular para probar.
              </span>
            </span>
          </Link>
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
