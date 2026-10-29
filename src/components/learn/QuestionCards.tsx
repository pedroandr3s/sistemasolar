import Link from "next/link";
import { BODIES } from "@/data/bodies";
import { stationPath } from "@/config/site";

function SaturnVisual() {
  return (
    <svg viewBox="0 0 160 90" width="160" height="90" aria-hidden="true">
      <ellipse cx="80" cy="45" rx="70" ry="16" fill="none" stroke="#d8c8a8" strokeWidth="7" opacity="0.85" />
      <ellipse cx="80" cy="45" rx="54" ry="12" fill="none" stroke="#0f1830" strokeWidth="2" />
      <circle cx="80" cy="45" r="26" fill="#e3cf94" />
      <path d="M10 45 A70 16 0 0 0 150 45" fill="none" stroke="#d8c8a8" strokeWidth="7" opacity="0.85" />
      {Array.from({ length: 18 }, (_, i) => (
        <circle key={i} cx={20 + i * 7} cy={58 + Math.sin(i) * 3} r="1.3" fill="#eef2f7" opacity="0.7" />
      ))}
    </svg>
  );
}

function JupiterVisual() {
  return (
    <svg viewBox="0 0 160 90" width="160" height="90" aria-hidden="true">
      <defs>
        <clipPath id="jclip">
          <circle cx="80" cy="45" r="40" />
        </clipPath>
      </defs>
      <g clipPath="url(#jclip)">
        <rect x="40" y="5" width="80" height="80" fill="#d8b48a" />
        {[18, 30, 42, 56, 68].map((y, i) => (
          <rect key={y} x="40" y={y} width="80" height={i % 2 ? 6 : 8} fill={i % 2 ? "#b58a5c" : "#efd9b6"} />
        ))}
        <ellipse cx="66" cy="60" rx="10" ry="6" fill="#c0573b" />
      </g>
      <line x1="40" x2="120" y1="45" y2="45" stroke="#eef2f7" strokeDasharray="3 3" opacity="0.6" />
      <text x="124" y="48" fontSize="9" fill="#a7b2c9">
        ecuador
      </text>
    </svg>
  );
}

function VenusVisual() {
  return (
    <svg viewBox="0 0 160 90" width="160" height="90" aria-hidden="true">
      <circle cx="44" cy="45" r="16" fill="#a9a39b" />
      <path d="M44 25 l0 -14 M58 31 l10 -10 M30 31 l-10 -10" stroke="#f2907a" strokeWidth="2" strokeLinecap="round" />
      <text x="44" y="82" textAnchor="middle" fontSize="9" fill="#a7b2c9">
        el calor escapa
      </text>
      <circle cx="116" cy="45" r="30" fill="#e6cf9a" opacity="0.35" />
      <circle cx="116" cy="45" r="22" fill="#e6cf9a" />
      <path d="M116 29 q-6 8 0 16 q6 8 0 16" stroke="#f2907a" strokeWidth="2" fill="none" />
      <text x="116" y="88" textAnchor="middle" fontSize="9" fill="#a7b2c9">
        el calor queda atrapado
      </text>
    </svg>
  );
}

function AxisVisual() {
  return (
    <svg viewBox="0 0 160 90" width="160" height="90" aria-hidden="true">
      <line x1="10" x2="150" y1="45" y2="45" stroke="#a7b2c9" strokeDasharray="3 4" opacity="0.6" />
      <circle cx="44" cy="45" r="16" fill="#5b9bd5" />
      <line
        x1={44 - Math.sin(0.41) * 28}
        y1={45 + Math.cos(0.41) * 28}
        x2={44 + Math.sin(0.41) * 28}
        y2={45 - Math.cos(0.41) * 28}
        stroke="#eef2f7"
        strokeWidth="1.5"
      />
      <text x="44" y="86" textAnchor="middle" fontSize="9" fill="#a7b2c9">
        Tierra 23°
      </text>
      <circle cx="116" cy="45" r="18" fill="#9fe0e3" />
      <line
        x1={116 - Math.sin(1.707) * 30}
        y1={45 + Math.cos(1.707) * 30}
        x2={116 + Math.sin(1.707) * 30}
        y2={45 - Math.cos(1.707) * 30}
        stroke="#eef2f7"
        strokeWidth="1.5"
      />
      <text x="116" y="86" textAnchor="middle" fontSize="9" fill="#a7b2c9">
        Urano 98°
      </text>
    </svg>
  );
}

function SpacingVisual() {
  const au = [0.387, 0.723, 1, 1.524, 5.204, 9.572, 19.165];
  const colors = ["#a9a39b", "#e6cf9a", "#5b9bd5", "#d2694a", "#d8b48a", "#e3cf94", "#9fe0e3"];
  return (
    <svg viewBox="0 0 160 90" width="160" height="90" aria-hidden="true">
      <line x1="8" x2="154" y1="45" y2="45" stroke="#a7b2c9" opacity="0.5" />
      <circle cx="8" cy="45" r="5" fill="#f6c453" />
      {au.map((a, i) => (
        <circle key={a} cx={8 + (a / 20) * 146} cy="45" r="3" fill={colors[i]} />
      ))}
      <line
        x1={8 + (2.7 / 20) * 146}
        x2={8 + (2.7 / 20) * 146}
        y1="32"
        y2="58"
        stroke="#f4b860"
        strokeDasharray="2 2"
      />
      <text x={8 + (2.7 / 20) * 146 + 4} y="26" fontSize="8.5" fill="#a7b2c9">
        línea de congelamiento (~2,7 UA)
      </text>
    </svg>
  );
}

const QUESTIONS = [
  {
    q: BODIES.saturno.stationQuestion.question,
    a: BODIES.saturno.stationQuestion.answer,
    Visual: SaturnVisual,
    href: stationPath("saturno"),
    link: "Explorar los anillos en 3D",
  },
  {
    q: BODIES.jupiter.stationQuestion.question,
    a: BODIES.jupiter.stationQuestion.answer,
    Visual: JupiterVisual,
    href: stationPath("jupiter"),
    link: "Buscar la Gran Mancha Roja en 3D",
  },
  {
    q: BODIES.venus.stationQuestion.question,
    a: BODIES.venus.stationQuestion.answer,
    Visual: VenusVisual,
    href: stationPath("venus"),
    link: "Ver Venus bajo sus nubes",
  },
  {
    q: BODIES.urano.stationQuestion.question,
    a: BODIES.urano.stationQuestion.answer,
    Visual: AxisVisual,
    href: stationPath("urano"),
    link: "Ver el eje de Urano",
  },
  {
    q: "¿Por qué los planetas exteriores están tan lejos del Sol?",
    a: "No hay una regla exacta, pero sí una explicación de cómo se formaron. Los planetas nacieron de un disco de gas y polvo que rodeaba al Sol joven. Cerca del Sol hacía tanto calor que solo la roca y el metal pudieron solidificarse: así se formaron planetas rocosos y pequeños. Más lejos, pasada la llamada línea de congelamiento, el agua y otras sustancias se congelaron y hubo mucho más material para crecer: allí se formaron los gigantes, cuyas órbitas son mucho más amplias. Los científicos aún estudian si los planetas gigantes se desplazaron desde donde nacieron.",
    Visual: SpacingVisual,
    href: "/sistema-solar",
    link: "Ver las órbitas",
  },
];

/** Preguntas con respuesta y un esquema visual. */
export function QuestionCards() {
  return (
    <div>
      {QUESTIONS.map(({ q, a, Visual, href, link }) => (
        <details key={q} className="qa">
          <summary>{q}</summary>
          <div style={{ display: "grid", gap: 12 }}>
            <Visual />
            <p style={{ margin: 0 }}>{a}</p>
            <Link className="text-link text-link--block small" href={href}>
              {link}
            </Link>
          </div>
        </details>
      ))}
    </div>
  );
}
