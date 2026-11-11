import Link from "next/link";
import { ModeNav } from "@/components/shell/ModeNav";
import { RouteRoad } from "@/components/route/RouteRoad";
import { HeroArt } from "@/components/route/HeroArt";
import { QrScanner } from "@/components/qr/QrScanner";
import { Icon, type IconName } from "@/components/ui/Icon";
import { getPlacements } from "@/lib/stations";
import { getRoute } from "@/lib/route";
import { formatNumber } from "@/lib/format";
import { SCALE } from "@/config/scale";
import { SAFETY_NOTICE } from "@/config/stations";

const MORE: { icon: IconName; title: string; text: string; href: string }[] = [
  { icon: "compass", title: "Dónde voy", text: "Cuánto falta para la parada siguiente.", href: "/orientarme" },
  { icon: "map", title: "Mapa", text: "Las ocho paradas sobre el camino.", href: "/mapa" },
  { icon: "learn", title: "Aprender", text: "Juegos para comparar tamaños y distancias.", href: "/aprender" },
  {
    icon: "orbits",
    title: "Los planetas hoy",
    text: "Dónde está cada planeta en este momento.",
    href: "/sistema-solar",
  },
  { icon: "star", title: "Mi viaje", text: "Las paradas que ya abriste y tus sellos.", href: "/bitacora" },
];

const STEPS = [
  "Busca la escultura y su código QR.",
  "Escanea el código con este botón o con tu cámara.",
  "Gira el planeta, míralo con la cámara y sigue al siguiente.",
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
          <span className="brand__mark" aria-hidden="true" />
          Sistema solar a escala
        </span>
        <span>Ñuble, Chile</span>
      </header>

      <main id="contenido">
        <section className="hero">
          <HeroArt />
          <div className="wrap hero__text">
            <h1 className="display hero__title">El sistema solar cabe en el camino a San Fabián</h1>
            <p className="lead hero__lead">
              Ocho esculturas, del Sol a Urano. Cada {formatNumber(SCALE.metersPerAU / 1000)} km de camino son la
              distancia de la Tierra al Sol.
            </p>
            <div className="hero__actions">
              <QrScanner />
              <Link href="/estacion/sol" className="btn btn--big btn--block">
                <Icon name="sun" size={24} />
                Empezar por el Sol
              </Link>
            </div>
          </div>
        </section>

        <div className="home-grid">
          <div>
            <section className="wrap section" aria-labelledby="como">
              <h2 id="como" className="section-title">
                Cómo se juega
              </h2>
              <ol className="steps">
                {STEPS.map((t, i) => (
                  <li key={t}>
                    <span className="steps__n" aria-hidden="true">
                      {i + 1}
                    </span>
                    {t}
                  </li>
                ))}
              </ol>
            </section>

            <section className="wrap section" aria-labelledby="camino">
              <h2 id="camino" className="section-title">
                El camino, a escala
              </h2>
              <p style={{ marginTop: 0 }}>
                Los cuatro primeros planetas caben en {formatNumber(marsKm, 0)} km. Urano queda en el km{" "}
                {formatNumber(uranusKm, 0)} de {formatNumber(routeKm, 0)}.
              </p>
              <details className="more">
                <summary>
                  <Icon name="route" size={24} />
                  <span>
                    Ver el camino completo
                    <small>Cada parada en su kilómetro</small>
                  </span>
                </summary>
                <div className="more__body">
                  <RouteRoad />
                  <p className="small muted">
                    Las posiciones son teóricas: se calculan con la escala sobre el camino. El lugar definitivo de cada
                    escultura todavía no está decidido.
                  </p>
                </div>
              </details>
            </section>
          </div>

          <div className="home-grid__side">
            <section className="wrap section" aria-labelledby="mas">
              <h2 id="mas" className="section-title">
                Más para explorar
              </h2>
              <ul className="mode-cards">
                {MORE.map((m) => (
                  <li key={m.title}>
                    <Link href={m.href} className="mode-card">
                      <span className="mode-card__icon">
                        <Icon name={m.icon} size={26} />
                      </span>
                      <span>
                        <span className="mode-card__title">{m.title}</span>
                        <span className="mode-card__text">{m.text}</span>
                      </span>
                      <span className="mode-card__arrow">
                        <Icon name="arrow-right" size={20} />
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
                Datos de NASA y de la Unión Astronómica Internacional. Trazado de la ruta: © colaboradores de
                OpenStreetMap.
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
          </div>
        </div>
      </main>
      <ModeNav />
    </div>
  );
}
