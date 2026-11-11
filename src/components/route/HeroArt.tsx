import { getPlacements } from "@/lib/stations";
import { getRoute } from "@/lib/route";

/** Puntos del camino en la ilustración: sale junto al Sol y sube hacia la cordillera. */
const ROAD = { x0: 128, y0: 212, cx1: 215, cy1: 246, cx2: 300, cy2: 138, x1: 464, y1: 150 };

function onRoad(t: number): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * u * ROAD.x0 + 3 * u * u * t * ROAD.cx1 + 3 * u * t * t * ROAD.cx2 + t * t * t * ROAD.x1,
    y: u * u * u * ROAD.y0 + 3 * u * u * t * ROAD.cy1 + 3 * u * t * t * ROAD.cy2 + t * t * t * ROAD.y1,
  };
}

/**
 * Ilustración de la portada: el Sol en San Carlos, el camino punteado y la cordillera
 * al fondo, con cada estación en su fracción real del recorrido. Por eso los cuatro
 * planetas rocosos quedan apretados junto al Sol: es la idea central del proyecto.
 * Es decorativa (aria-hidden); el mismo contenido está, con cifras, en «El camino, a escala».
 */
export function HeroArt() {
  const total = getRoute().length;
  const stops = getPlacements()
    .filter((p) => p.alongRouteMeters !== null && p.station.id !== "sol")
    .map((p) => ({
      id: p.station.id,
      color: p.body.color,
      big: p.body.order > 4,
      ...onRoad(0.04 + 0.9 * (p.alongRouteMeters! / total)),
    }));

  return (
    <svg className="hero__art" viewBox="0 0 480 270" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <radialGradient id="hero-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff3cf" />
          <stop offset="42%" stopColor="#fbc35f" />
          <stop offset="100%" stopColor="#ee8f2b" />
        </radialGradient>
        <radialGradient id="hero-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f7ba5c" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#f7ba5c" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#f7ba5c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hero-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1226" stopOpacity="0" />
          <stop offset="100%" stopColor="#0b1226" stopOpacity="1" />
        </linearGradient>
      </defs>

      {/* Cordillera de los Andes, hacia San Fabián */}
      <path
        d="M196 270 L252 198 L278 214 L314 158 L336 182 L368 116 L386 142 L408 104 L424 132 L446 112 L480 152 L480 270 Z"
        fill="#1a2752"
      />
      <path d="M282 270 L336 212 L360 226 L398 176 L420 198 L456 164 L480 186 L480 270 Z" fill="#223160" />
      <path
        d="M368 116 L378 131 L370 135 L362 128 Z M408 104 L418 121 L410 125 L401 118 Z"
        fill="#f3f6fb"
        opacity="0.85"
      />

      {/* El Sol, en la plaza de San Carlos */}
      <circle cx="46" cy="196" r="190" fill="url(#hero-glow)" />
      <circle cx="46" cy="196" r="72" fill="url(#hero-sun)" />

      {/* El camino */}
      <path
        d={`M${ROAD.x0} ${ROAD.y0} C ${ROAD.cx1} ${ROAD.cy1}, ${ROAD.cx2} ${ROAD.cy2}, ${ROAD.x1} ${ROAD.y1}`}
        fill="none"
        stroke="#f3f6fb"
        strokeOpacity="0.7"
        strokeWidth="2.2"
        strokeDasharray="9 7"
        strokeLinecap="round"
      />
      {stops.map((s) => (
        <circle key={s.id} cx={s.x} cy={s.y} r={s.big ? 7 : 4.5} fill={s.color} stroke="#0b1226" strokeWidth="2" />
      ))}

      <rect x="0" y="196" width="480" height="74" fill="url(#hero-fade)" />
    </svg>
  );
}
