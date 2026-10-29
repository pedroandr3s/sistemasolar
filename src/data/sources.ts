/**
 * Registro de fuentes. Cada dato científico de la app apunta a una de estas
 * entradas mediante su `id`, para que pueda revisarse y actualizarse.
 * Fecha de consulta: 17 de octubre de 2026.
 */
export type SourceId =
  | "nasa-planet-factsheet"
  | "nasa-sun-factsheet"
  | "nasa-saturn-rings-factsheet"
  | "nasa-uranus-rings-factsheet"
  | "nasa-jupiter-moons"
  | "nasa-saturn-moons"
  | "nasa-uranus-moons"
  | "nasa-science-planets"
  | "iau-2012-au"
  | "astronomy-engine"
  | "nasa-3d-resources"
  | "natural-earth"
  | "osm-osrm"
  | "nasa-proxima"
  | "noaa-wmm2025";

export interface Source {
  id: SourceId;
  title: string;
  publisher: string;
  url: string;
  /** Fecha de la versión consultada o "última actualización" declarada por la fuente. */
  version?: string;
  accessed: string;
  license?: string;
}

const ACCESSED = "2026-10-17";

export const SOURCES: Record<SourceId, Source> = {
  "nasa-planet-factsheet": {
    id: "nasa-planet-factsheet",
    title: "Planetary Fact Sheet – Metric",
    publisher: "NASA Goddard Space Flight Center (NSSDC)",
    url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/",
    version: "Actualizada el 18 de marzo de 2025",
    accessed: ACCESSED,
  },
  "nasa-sun-factsheet": {
    id: "nasa-sun-factsheet",
    title: "Sun Fact Sheet",
    publisher: "NASA Goddard Space Flight Center (NSSDC)",
    url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html",
    version: "Actualizada el 9 de mayo de 2024",
    accessed: ACCESSED,
  },
  "nasa-saturn-rings-factsheet": {
    id: "nasa-saturn-rings-factsheet",
    title: "Saturnian Rings Fact Sheet",
    publisher: "NASA Goddard Space Flight Center (NSSDC)",
    url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/satringfact.html",
    version: "Actualizada el 19 de abril de 2022",
    accessed: ACCESSED,
  },
  "nasa-uranus-rings-factsheet": {
    id: "nasa-uranus-rings-factsheet",
    title: "Uranian Rings Fact Sheet",
    publisher: "NASA Goddard Space Flight Center (NSSDC)",
    url: "https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranringfact.html",
    version: "Actualizada el 14 de octubre de 2015",
    accessed: ACCESSED,
  },
  "nasa-jupiter-moons": {
    id: "nasa-jupiter-moons",
    title: "Jupiter Moons",
    publisher: "NASA Science",
    url: "https://science.nasa.gov/jupiter/jupiter-moons/",
    version: "Página actualizada el 21 de septiembre de 2026",
    accessed: ACCESSED,
  },
  "nasa-saturn-moons": {
    id: "nasa-saturn-moons",
    title: "Saturn Moons",
    publisher: "NASA Science",
    url: "https://science.nasa.gov/saturn/moons/",
    version: "Cifra «a agosto de 2026»; página actualizada el 22 de septiembre de 2026",
    accessed: ACCESSED,
  },
  "nasa-uranus-moons": {
    id: "nasa-uranus-moons",
    title: "Uranus Moons",
    publisher: "NASA Science",
    url: "https://science.nasa.gov/uranus/moons/",
    version: "Cifra «a agosto de 2026»",
    accessed: ACCESSED,
  },
  "nasa-science-planets": {
    id: "nasa-science-planets",
    title: "Páginas de planetas y del Sol (Facts)",
    publisher: "NASA Science",
    url: "https://science.nasa.gov/solar-system/",
    accessed: ACCESSED,
  },
  "iau-2012-au": {
    id: "iau-2012-au",
    title: "Resolución B2 (2012): redefinición de la unidad astronómica",
    publisher: "Unión Astronómica Internacional (IAU)",
    url: "https://www.iau.org/static/resolutions/IAU2012_English.pdf",
    accessed: ACCESSED,
  },
  "astronomy-engine": {
    id: "astronomy-engine",
    title: "Astronomy Engine 2.1.19 (modelo VSOP87 truncado)",
    publisher: "Don Cross",
    url: "https://github.com/cosinekitty/astronomy",
    accessed: ACCESSED,
    license: "MIT",
  },
  "nasa-3d-resources": {
    id: "nasa-3d-resources",
    title: "NASA 3D Resources – Images and Textures",
    publisher: "NASA",
    url: "https://github.com/nasa/NASA-3D-Resources",
    accessed: ACCESSED,
    license: "Material de NASA sin derechos de autor; ver pautas de uso de medios de NASA",
  },
  "natural-earth": {
    id: "natural-earth",
    title: "Natural Earth 1:50m (vía world-atlas 2.0.2)",
    publisher: "Natural Earth / Mike Bostock",
    url: "https://www.naturalearthdata.com/",
    accessed: ACCESSED,
    license: "Dominio público (datos); ISC (paquete world-atlas)",
  },
  "osm-osrm": {
    id: "osm-osrm",
    title: "Trazado vial calculado con OSRM sobre OpenStreetMap",
    publisher: "Colaboradores de OpenStreetMap / Project OSRM",
    url: "https://www.openstreetmap.org/copyright",
    accessed: ACCESSED,
    license: "ODbL 1.0",
  },
  "noaa-wmm2025": {
    id: "noaa-wmm2025",
    title: "World Magnetic Model 2025 (declinación magnética de la brújula), vía la biblioteca magvar 2.2.0",
    publisher: "NOAA NCEI / British Geological Survey",
    url: "https://www.ncei.noaa.gov/products/world-magnetic-model",
    version: "WMM2025, válido de 2025,0 a 2030,0; verificado con los valores de prueba oficiales",
    accessed: ACCESSED,
    license: "Modelo de dominio público (NOAA); magvar con licencia MIT",
  },
  "nasa-proxima": {
    id: "nasa-proxima",
    title: "Proxima Centauri b",
    publisher: "NASA Science (Exoplanet Exploration)",
    url: "https://science.nasa.gov/exoplanet-catalog/proxima-centauri-b/",
    accessed: ACCESSED,
  },
};

export function sourceById(id: SourceId): Source {
  return SOURCES[id];
}
