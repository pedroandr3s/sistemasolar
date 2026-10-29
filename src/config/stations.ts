import type { BodyId } from "@/data/bodies";

/**
 * Configuración editable de las estaciones físicas.
 *
 * IMPORTANTE: ninguna ubicación está verificada en terreno todavía.
 * Mientras una estación tenga `location.status = "propuesta-escala"`, la app
 * calcula una posición TEÓRICA sobre el trazado según la escala (src/config/scale.ts)
 * y la muestra siempre como «ubicación propuesta, no verificada».
 *
 * Cuando se defina el lugar real de una escultura (tras evaluar seguridad,
 * accesibilidad, permisos y viabilidad), reemplaza su `location` por:
 *
 *   location: {
 *     status: "verificada",
 *     lat: -36.4xxxxx,
 *     lng: -71.9xxxxx,
 *     verifiedBy: "Nombre / institución",
 *     verifiedOn: "2027-01-15",
 *     notes: "Berma ensanchada frente a ...",
 *   }
 *
 * Usa `status: "pendiente"` para ocultar una estación del mapa y de la
 * orientación hasta tener datos (su página por QR sigue funcionando).
 *
 * Los identificadores (`id`) forman la URL de cada QR (/estacion/<id>):
 * no los cambies después de imprimir los códigos.
 */

export type StationLocation =
  | {
      status: "verificada";
      lat: number;
      lng: number;
      verifiedBy: string;
      verifiedOn: string;
      notes?: string;
    }
  | { status: "propuesta-escala" }
  | { status: "pendiente"; notes?: string };

export interface StationSiteInfo {
  /** Indica si esta información fue verificada en terreno. */
  verified: boolean;
  pedestrianAccess?: string;
  parking?: string;
  accessibility?: string;
  nearby?: string[];
  services?: string[];
  safetyWarnings?: string[];
}

export interface StationConfig {
  id: string;
  bodyId: BodyId;
  /** Orden en el recorrido desde San Carlos (0 = Sol). */
  order: number;
  name: string;
  description: string;
  location: StationLocation;
  site: StationSiteInfo | null;
}

export const STATIONS: StationConfig[] = [
  {
    id: "sol",
    bodyId: "sol",
    order: 0,
    name: "Sol",
    description: "Punto de partida del modelo: todas las distancias del recorrido se miden desde aquí.",
    location: { status: "propuesta-escala" },
    site: null,
  },
  {
    id: "mercurio",
    bodyId: "mercurio",
    order: 1,
    name: "Mercurio",
    description: "El planeta más cercano al Sol.",
    location: { status: "propuesta-escala" },
    site: null,
  },
  {
    id: "venus",
    bodyId: "venus",
    order: 2,
    name: "Venus",
    description: "El planeta más caliente, envuelto en nubes.",
    location: { status: "propuesta-escala" },
    site: null,
  },
  {
    id: "tierra",
    bodyId: "tierra",
    order: 3,
    name: "Tierra",
    description: "Nuestro planeta: aquí 2 km del recorrido equivalen a 150 millones de km.",
    location: { status: "propuesta-escala" },
    site: null,
  },
  {
    id: "marte",
    bodyId: "marte",
    order: 4,
    name: "Marte",
    description: "El planeta rojo, último de los planetas rocosos.",
    location: { status: "propuesta-escala" },
    site: null,
  },
  {
    id: "jupiter",
    bodyId: "jupiter",
    order: 5,
    name: "Júpiter",
    description: "El más grande. Antes de llegar aquí se cruza la zona del cinturón de asteroides.",
    location: { status: "propuesta-escala" },
    site: null,
  },
  {
    id: "saturno",
    bodyId: "saturno",
    order: 6,
    name: "Saturno",
    description: "El planeta de los anillos.",
    location: { status: "propuesta-escala" },
    site: null,
  },
  {
    id: "urano",
    bodyId: "urano",
    order: 7,
    name: "Urano",
    description: "El planeta que gira de costado y final del recorrido.",
    location: { status: "propuesta-escala" },
    site: null,
  },
];

/** Radio (m) dentro del cual se considera que el visitante está en una estación. */
export const AT_STATION_RADIUS_M = 60;

/** Advertencia de seguridad que se muestra en los modos que usan ubicación. */
export const SAFETY_NOTICE =
  "Detente en un lugar seguro antes de usar el teléfono. No uses esta app mientras conduces ni te detengas en la calzada.";
