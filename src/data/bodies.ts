import type { SourceId } from "./sources";

/**
 * Datos científicos y contenidos de los ocho cuerpos del recorrido.
 *
 * - Cifras físicas y orbitales: NASA Planetary Fact Sheet (métrica) y Sun Fact Sheet.
 * - Lunas: páginas de NASA Science, con fecha de referencia.
 * - Los textos de los tres niveles (Descubrir, Entender, Profundizar) están
 *   escritos para este proyecto a partir de esas fuentes.
 *
 * Para actualizar una cifra, cambia el valor aquí y su `source`/`asOf`:
 * los componentes leen todo desde este archivo.
 */

export const AU_KM = 149_597_870.7; // IAU 2012, exacta por definición
export const LIGHT_SPEED_KM_S = 299_792.458;

export type BodyId = "sol" | "mercurio" | "venus" | "tierra" | "marte" | "jupiter" | "saturno" | "urano";

export type BodyKind = "Estrella" | "Planeta rocoso" | "Gigante gaseoso" | "Gigante de hielo";

export interface MoonCount {
  count: number;
  /** Fecha a la que corresponde la cifra (las lunas conocidas cambian con los descubrimientos). */
  asOf: string;
  source: SourceId;
}

export interface QuizQuestion {
  question: string;
  options: [string, string, string];
  correct: 0 | 1 | 2;
  explanation: string;
}

export interface SurfaceLabel {
  text: string;
  /** Latitud y longitud en grados, en el sistema de la textura usada. */
  lat: number;
  lon: number;
  /** Si se indica, la etiqueta se ubica sobre los anillos a este radio (km). */
  ringKm?: number;
  /** Etiquetas que solo aparecen con un modo especial (p. ej. radar de Venus). */
  mode?: "radar";
}

export interface RingSpec {
  texture: string;
  innerKm: number;
  outerKm: number;
  /** Indica si el brillo de los anillos se realzó para que se vean. */
  enhanced: boolean;
}

export type SpecialAction =
  | { kind: "compare-earth"; label: string }
  | { kind: "radar"; label: string }
  | { kind: "daynight"; label: string }
  | { kind: "focus-label"; label: string; target: string }
  | { kind: "axis"; label: string }
  | { kind: "rings"; label: string };

export interface BodyRender {
  /** Texturas por calidad. `null` = material procedural en el cliente (Sol). */
  texture: { low: string; high: string } | null;
  bump?: string;
  clouds?: { texture: string; opacity: number; illustrative: boolean };
  /** Capa de nubes que cubre la superficie (Venus); la superficie se ve con «radar». */
  cloudCover?: string;
  /** Aplanamiento: diámetro polar / diámetro ecuatorial. */
  polarRatio: number;
  rings?: RingSpec;
  /** Segundos que tarda en dar una vuelta en la animación (tiempo acelerado). */
  spinSeconds: number;
  /** Sentido de giro visto desde el norte de su órbita. */
  retrograde: boolean;
  labels: SurfaceLabel[];
  special: SpecialAction;
  /** La textura es una representación artística (no un mapa real). */
  artisticSurface: boolean;
}

export interface Body {
  id: BodyId;
  name: string;
  /** Nombre con artículo para frases: «el Sol», «Mercurio». */
  nameInSentence: string;
  kind: BodyKind;
  /** Posición desde el Sol (0 = Sol). */
  order: number;
  color: string;
  colorSoft: string;

  diameterKm: number;
  polarDiameterKm?: number;
  massKg: number;
  massEarths: number;
  densityKgM3: number;
  gravityMs2: number;
  /** Distancia media al Sol (semieje mayor), km. */
  meanDistanceKm: number | null;
  perihelionKm: number | null;
  aphelionKm: number | null;
  orbitalPeriodDays: number | null;
  /** Período de rotación sideral, horas. Negativo = rotación retrógrada. */
  rotationPeriodHours: number;
  /** Duración del día solar, horas. */
  lengthOfDayHours: number | null;
  obliquityDeg: number;
  orbitalInclinationDeg: number | null;
  eccentricity: number | null;
  meanTempC: number;
  tempContext: string;
  moons: MoonCount | null;
  hasRings: boolean;
  dataSource: SourceId;

  hook: string;
  keyIdea: string;
  discover: string[];
  understand: string[];
  deep: string[];
  curiosity: string;
  comparison: string;
  composition: string;
  rotationNote: string;
  dataNotes: string[];
  stationQuestion: { question: string; answer: string };
  quiz: [QuizQuestion, QuizQuestion, QuizQuestion];
  render: BodyRender;
}

const MOONS_FS: Omit<MoonCount, "count"> = { asOf: "2025-03", source: "nasa-planet-factsheet" };

export const BODIES: Record<BodyId, Body> = {
  sol: {
    id: "sol",
    name: "Sol",
    nameInSentence: "el Sol",
    kind: "Estrella",
    order: 0,
    color: "#F6C453",
    colorSoft: "#7A5A1E",
    diameterKm: 1_391_400,
    massKg: 1.9884e30,
    massEarths: 332_900,
    densityKgM3: 1408,
    gravityMs2: 274.0,
    meanDistanceKm: null,
    perihelionKm: null,
    aphelionKm: null,
    orbitalPeriodDays: null,
    rotationPeriodHours: 609.12,
    lengthOfDayHours: null,
    obliquityDeg: 7.25,
    orbitalInclinationDeg: null,
    eccentricity: null,
    meanTempC: 5499,
    tempContext:
      "Temperatura efectiva de la superficie visible (5.772 K). El núcleo alcanza unos 15,7 millones de kelvin.",
    moons: null,
    hasRings: false,
    dataSource: "nasa-sun-factsheet",
    hook: "Una estrella común en la galaxia, pero tan grande que cabrían en ella más de un millón de Tierras.",
    keyIdea: "El Sol es una estrella y concentra casi toda la masa del sistema solar.",
    discover: [
      "El Sol es una estrella: una enorme esfera de gas muy caliente que produce su propia luz.",
      "La luz y el calor que recibimos en la Tierra vienen de él.",
      "Su luz tarda poco más de 8 minutos en llegar hasta nosotros.",
      "Nunca lo mires directamente, ni con binoculares ni con telescopio: puede dañar tus ojos para siempre.",
    ],
    understand: [
      "En su núcleo, a unos 15 millones de grados, los núcleos de hidrógeno se fusionan y forman helio. Esa reacción libera la energía que hace brillar al Sol.",
      "Reúne el 99,8 % de la masa del sistema solar. Su gravedad mantiene a los planetas girando a su alrededor.",
      "Su superficie visible, la fotosfera, está a unos 5.500 °C.",
      "No gira como un cuerpo sólido: cerca del ecuador da una vuelta en unos 25 días y cerca de los polos tarda unos 35.",
    ],
    deep: [
      "Radio medio volumétrico: 695.700 km, unas 109 veces el de la Tierra. Masa: 1,988 × 10³⁰ kg (332.900 Tierras).",
      "Luminosidad: 3,828 × 10²⁶ W. Tipo espectral G2 V: una estrella de secuencia principal, en la etapa estable de su vida, con unos 4.600 millones de años.",
      "Período de rotación sideral: 609,12 h (25,4 días) medido a 16° de latitud. Su eje está inclinado 7,25° respecto del plano de la órbita terrestre (la eclíptica).",
      "En este recorrido, 1 unidad astronómica (la distancia media Tierra–Sol) equivale a 2 km. A esa misma escala, una escultura del Sol debería medir unos 18,6 m de diámetro.",
    ],
    curiosity:
      "La energía que hoy sale de la superficie del Sol se produjo en su núcleo hace muchos miles de años: tarda muchísimo en abrirse paso hacia afuera.",
    comparison: "Si el Sol fuera tan alto como una puerta (2 m), la Tierra sería una bolita de menos de 2 cm.",
    composition: "Cerca de 73 % hidrógeno y 25 % helio (en masa), con pequeñas cantidades de otros elementos.",
    rotationNote: "Rotación diferencial: el ecuador gira más rápido que los polos.",
    dataNotes: [
      "La ficha de NASA da la rotación sideral a 16° de latitud; el ecuador gira algo más rápido.",
      "La temperatura de 5.500 °C corresponde a la temperatura efectiva de 5.772 K.",
    ],
    stationQuestion: {
      question: "¿Por qué el Sol se ve mucho más grande y brillante que las demás estrellas?",
      answer:
        "Porque está muchísimo más cerca. La siguiente estrella más cercana, Próxima Centauri, está unas 270.000 veces más lejos que el Sol. Muchas estrellas del cielo nocturno son incluso más grandes y brillantes que él.",
    },
    quiz: [
      {
        question: "¿Qué es el Sol?",
        options: ["Un planeta muy caliente", "Una estrella", "Una bola de fuego"],
        correct: 1,
        explanation:
          "Es una estrella: produce energía por fusión nuclear en su núcleo. No es fuego, porque no hay combustión como la de una fogata.",
      },
      {
        question: "¿Cuánto tarda la luz del Sol en llegar a la Tierra?",
        options: ["Un segundo", "Poco más de 8 minutos", "Un día"],
        correct: 1,
        explanation:
          "Viaja a casi 300.000 km por segundo y recorre unos 150 millones de km: unos 8 minutos y 20 segundos.",
      },
      {
        question: "¿Qué parte de la masa del sistema solar está en el Sol?",
        options: ["Cerca de la mitad", "Cerca del 75 %", "El 99,8 %"],
        correct: 2,
        explanation: "Todos los planetas, lunas, asteroides y cometas juntos suman apenas un 0,2 %.",
      },
    ],
    render: {
      texture: null,
      polarRatio: 1,
      spinSeconds: 60,
      retrograde: false,
      labels: [
        { text: "Fotosfera: la superficie visible", lat: 20, lon: -30 },
        { text: "Polo norte solar", lat: 88, lon: 0 },
      ],
      special: { kind: "compare-earth", label: "Poner la Tierra al lado" },
      artisticSurface: true,
    },
  },

  mercurio: {
    id: "mercurio",
    name: "Mercurio",
    nameInSentence: "Mercurio",
    kind: "Planeta rocoso",
    order: 1,
    color: "#A9A39B",
    colorSoft: "#4C4843",
    diameterKm: 4879,
    massKg: 0.33e24,
    massEarths: 0.055,
    densityKgM3: 5429,
    gravityMs2: 3.7,
    meanDistanceKm: 57.9e6,
    perihelionKm: 46.0e6,
    aphelionKm: 69.8e6,
    orbitalPeriodDays: 88.0,
    rotationPeriodHours: 1407.6,
    lengthOfDayHours: 4222.6,
    obliquityDeg: 0.034,
    orbitalInclinationDeg: 7.0,
    eccentricity: 0.206,
    meanTempC: 167,
    tempContext:
      "Promedio de la ficha de NASA. En la práctica va de unos 430 °C de día a unos −180 °C de noche, porque casi no tiene atmósfera.",
    moons: { count: 0, ...MOONS_FS },
    hasRings: false,
    dataSource: "nasa-planet-factsheet",
    hook: "El planeta más pequeño y el más cercano al Sol: allí un año dura solo 88 días.",
    keyIdea: "Sin atmósfera que guarde el calor, Mercurio pasa del calor extremo al frío extremo.",
    discover: [
      "Mercurio es un poco más grande que nuestra Luna.",
      "Su superficie está llena de cráteres: marcas que dejaron rocas espaciales al chocar.",
      "Casi no tiene aire. Por eso, de día supera los 400 °C y de noche baja a unos −180 °C.",
    ],
    understand: [
      "Da una vuelta al Sol en 88 días terrestres, más rápido que cualquier otro planeta: recorre su órbita a unos 47 km por segundo.",
      "Gira muy lento sobre sí mismo: una rotación toma 58,6 días terrestres. Como además avanza por su órbita, el Sol tarda 176 días terrestres en volver al mismo punto de su cielo.",
      "Tiene un núcleo de hierro enorme para su tamaño, que ocupa cerca del 85 % de su radio.",
    ],
    deep: [
      "Diámetro: 4.879 km. Masa: 0,330 × 10²⁴ kg (0,055 Tierras). Densidad: 5.429 kg/m³, la segunda más alta tras la Tierra.",
      "Semieje mayor: 57,9 millones de km (0,387 UA). Es la órbita más excéntrica de los planetas (e = 0,206): su distancia al Sol varía entre 46,0 y 69,8 millones de km. Inclinación orbital: 7,0°.",
      "Resonancia 3:2: gira tres veces sobre su eje cada dos vueltas alrededor del Sol.",
      "En este recorrido su estación está a 0,77 km del Sol. A la misma escala, Mercurio mediría 6,5 cm.",
    ],
    curiosity:
      "Aunque está tan cerca del Sol, en el fondo de algunos cráteres de sus polos, donde nunca llega la luz, la sonda MESSENGER encontró evidencia de hielo de agua.",
    comparison: "Si la Tierra fuera una pelota de fútbol (22 cm), Mercurio sería una mandarina de 8,4 cm.",
    composition: "Roca y metal; un gran núcleo de hierro y un manto rocoso delgado.",
    rotationNote: "Una rotación dura 58,6 días, pero un día solar completo dura 176 días terrestres.",
    dataNotes: [
      "La textura de Mercurio es una representación artística generada para este proyecto: muestra el tipo de relieve, no un mapa real.",
      "La temperatura media de 167 °C es un promedio entre extremos muy distintos.",
    ],
    stationQuestion: {
      question: "Si Mercurio es el más cercano al Sol, ¿por qué de noche es tan frío?",
      answer:
        "Porque casi no tiene atmósfera. En la Tierra, el aire funciona como una manta que guarda el calor durante la noche. En Mercurio no hay manta: el calor se escapa al espacio y la temperatura cae a unos −180 °C.",
    },
    quiz: [
      {
        question: "¿Cuánto dura un año en Mercurio?",
        options: ["88 días terrestres", "365 días terrestres", "12 años terrestres"],
        correct: 0,
        explanation: "Está tan cerca del Sol que completa su órbita en solo 88 días.",
      },
      {
        question: "¿Qué cubre la superficie de Mercurio?",
        options: ["Océanos", "Cráteres", "Nubes espesas"],
        correct: 1,
        explanation: "Sin atmósfera que frene las rocas espaciales, los impactos dejaron miles de cráteres.",
      },
      {
        question: "¿A qué se parece más su tamaño?",
        options: ["Al de la Luna", "Al de Júpiter", "Al del Sol"],
        correct: 0,
        explanation: "Mide 4.879 km: es un poco más grande que la Luna (3.475 km).",
      },
    ],
    render: {
      texture: { low: "/textures/mercury_1k.webp", high: "/textures/mercury_2k.webp" },
      bump: "/textures/mercury_bump_1k.webp",
      polarRatio: 1,
      spinSeconds: 70,
      retrograde: false,
      labels: [{ text: "Cráteres (representación artística)", lat: 15, lon: -40 }],
      special: { kind: "compare-earth", label: "Comparar con la Tierra" },
      artisticSurface: true,
    },
  },

  venus: {
    id: "venus",
    name: "Venus",
    nameInSentence: "Venus",
    kind: "Planeta rocoso",
    order: 2,
    color: "#E6CF9A",
    colorSoft: "#6E5F3C",
    diameterKm: 12_104,
    massKg: 4.87e24,
    massEarths: 0.815,
    densityKgM3: 5243,
    gravityMs2: 8.9,
    meanDistanceKm: 108.2e6,
    perihelionKm: 107.5e6,
    aphelionKm: 108.9e6,
    orbitalPeriodDays: 224.7,
    rotationPeriodHours: -5832.5,
    lengthOfDayHours: 2802.0,
    obliquityDeg: 177.4,
    orbitalInclinationDeg: 3.4,
    eccentricity: 0.007,
    meanTempC: 464,
    tempContext: "Casi igual de día y de noche: su atmósfera espesa reparte y retiene el calor.",
    moons: { count: 0, ...MOONS_FS },
    hasRings: false,
    dataSource: "nasa-planet-factsheet",
    hook: "El planeta más caliente, aunque no sea el más cercano al Sol.",
    keyIdea: "Una atmósfera muy densa puede atrapar tanto calor que vuelve a un planeta un horno.",
    discover: [
      "Venus es casi del mismo tamaño que la Tierra.",
      "Está cubierto por nubes muy espesas que no dejan ver su superficie.",
      "Después del Sol y la Luna, es lo más brillante del cielo. En el campo se le llama «lucero»: aparece al amanecer o al atardecer.",
    ],
    understand: [
      "Su atmósfera es casi toda dióxido de carbono y es tan densa que, en la superficie, la presión es 92 veces la de la Tierra.",
      "Ese aire espeso atrapa el calor del Sol (un efecto invernadero muy intenso): en la superficie hay unos 464 °C.",
      "Gira al revés que la mayoría de los planetas y muy lento: una rotación tarda 243 días terrestres, más que su año de 225 días.",
      "Su superficie se conoce gracias al radar, que atraviesa las nubes. La sonda Magellan de NASA la mapeó en los años noventa.",
    ],
    deep: [
      "Diámetro: 12.104 km (95 % del terrestre). Masa: 0,815 Tierras. Gravedad superficial: 8,9 m/s².",
      "Semieje mayor: 108,2 millones de km (0,723 UA). Su órbita es la más circular de los planetas (e = 0,007).",
      "Rotación sideral retrógrada de 243 días; inclinación del eje de 177,4°, que equivale a girar «cabeza abajo». Un día solar dura unos 117 días terrestres.",
      "Las nubes contienen gotas de ácido sulfúrico. Los colores del mapa de radar son falsos: indican cómo refleja el radar el terreno, no su color real.",
    ],
    curiosity:
      "En Venus el Sol sale por el oeste y se pone por el este, porque el planeta gira en sentido contrario al de la Tierra.",
    comparison: "Si la Tierra fuera una pelota de fútbol (22 cm), Venus sería otra pelota apenas más chica, de 21 cm.",
    composition: "Planeta rocoso con atmósfera de dióxido de carbono (96,5 %) y nitrógeno, y nubes de ácido sulfúrico.",
    rotationNote: "Rotación retrógrada y muy lenta: su día sideral (243 días) es más largo que su año (225 días).",
    dataNotes: [
      "La vista normal muestra una capa de nubes ilustrativa. La vista «bajo las nubes» usa un mapa de radar de NASA en falso color.",
    ],
    stationQuestion: {
      question: "¿Por qué Venus es más caliente que Mercurio, si está más lejos del Sol?",
      answer:
        "Por su atmósfera. Venus está envuelto en una capa de dióxido de carbono muy densa que deja entrar la luz del Sol pero no deja escapar el calor. Mercurio, casi sin atmósfera, pierde su calor hacia el espacio.",
    },
    quiz: [
      {
        question: "¿Por qué no vemos la superficie de Venus con un telescopio?",
        options: ["Porque está muy lejos", "Porque la tapan nubes espesas", "Porque es oscura"],
        correct: 1,
        explanation: "Sus nubes cubren todo el planeta. Para ver el suelo se usa radar.",
      },
      {
        question: "¿Qué hace tan caliente a Venus?",
        options: ["Su atmósfera atrapa el calor", "Tiene volcanes activos en todas partes", "Está pegado al Sol"],
        correct: 0,
        explanation: "Es un efecto invernadero extremo causado por su atmósfera de dióxido de carbono.",
      },
      {
        question: "¿Cómo gira Venus?",
        options: ["Igual que la Tierra", "Al revés y muy lento", "No gira"],
        correct: 1,
        explanation: "Gira en sentido retrógrado y tarda 243 días terrestres en dar una vuelta.",
      },
    ],
    render: {
      texture: { low: "/textures/venus_surface_1k.webp", high: "/textures/venus_surface_1k.webp" },
      cloudCover: "/textures/venus_clouds_1k.webp",
      polarRatio: 1,
      spinSeconds: 90,
      retrograde: true,
      labels: [
        { text: "Nubes de ácido sulfúrico", lat: 25, lon: -20 },
        { text: "Relieve visto con radar (falso color)", lat: -10, lon: 20, mode: "radar" },
      ],
      special: { kind: "radar", label: "Ver bajo las nubes" },
      artisticSurface: false,
    },
  },

  tierra: {
    id: "tierra",
    name: "Tierra",
    nameInSentence: "la Tierra",
    kind: "Planeta rocoso",
    order: 3,
    color: "#5B9BD5",
    colorSoft: "#20476B",
    diameterKm: 12_756,
    polarDiameterKm: 12_714,
    massKg: 5.97e24,
    massEarths: 1,
    densityKgM3: 5514,
    gravityMs2: 9.8,
    meanDistanceKm: 149.6e6,
    perihelionKm: 147.1e6,
    aphelionKm: 152.1e6,
    orbitalPeriodDays: 365.2,
    rotationPeriodHours: 23.9,
    lengthOfDayHours: 24.0,
    obliquityDeg: 23.4,
    orbitalInclinationDeg: 0.0,
    eccentricity: 0.017,
    meanTempC: 15,
    tempContext: "Promedio global de la superficie.",
    moons: { count: 1, ...MOONS_FS },
    hasRings: false,
    dataSource: "nasa-planet-factsheet",
    hook: "El único lugar donde sabemos que hay vida. Tú estás aquí, en Ñuble.",
    keyIdea: "La inclinación del eje de la Tierra produce las estaciones del año.",
    discover: [
      "La Tierra es el tercer planeta desde el Sol y el único donde sabemos que existe vida.",
      "Más de dos tercios de su superficie están cubiertos por agua líquida.",
      "La línea entre el día y la noche que ves en el modelo está calculada para este mismo momento.",
      "Tiene una sola luna natural: la Luna.",
    ],
    understand: [
      "La Tierra gira sobre sí misma en casi 24 horas (rotación). Eso produce el día y la noche.",
      "Da una vuelta completa alrededor del Sol en un año, unos 365 días (traslación).",
      "Su eje está inclinado 23,4°. Cuando el hemisferio sur se inclina hacia el Sol, en Ñuble es verano; cuando se aleja, es invierno.",
      "La atmósfera nos protege de la radiación y mantiene una temperatura media cercana a 15 °C.",
    ],
    deep: [
      "Diámetro ecuatorial: 12.756 km; polar: 12.714 km. Masa: 5,97 × 10²⁴ kg. Es el planeta más denso (5.514 kg/m³).",
      "La unidad astronómica (UA) vale exactamente 149.597.870,7 km por definición de la IAU (2012). La distancia media Tierra–Sol en la ficha de NASA es 149,6 millones de km.",
      "Rotación sideral: 23,9 h (23 h 56 min); día solar: 24 h. La diferencia se debe a que la Tierra avanza en su órbita mientras gira.",
      "El terminador (línea día/noche) se calcula con Astronomy Engine a partir de la posición del punto subsolar para la hora del teléfono.",
    ],
    curiosity:
      "La Tierra no es una esfera perfecta: por su rotación es un poco más ancha en el ecuador. El diámetro ecuatorial supera al polar en unos 42 km.",
    comparison:
      "En este recorrido, la estación de la Tierra está a 2 km del Sol. Esos 2 km representan 150 millones de km.",
    composition:
      "Núcleo de hierro y níquel, manto de roca, corteza delgada; atmósfera de nitrógeno (78 %) y oxígeno (21 %).",
    rotationNote: "La rotación dura 23 h 56 min; el día solar, 24 h.",
    dataNotes: [
      "Mapa de relieve y batimetría de NASA, recoloreado en tonos naturales para este proyecto: los tonos de tierra indican altura del terreno, no vegetación.",
      "Las nubes son ilustrativas: no corresponden al clima de hoy.",
    ],
    stationQuestion: {
      question: "¿Por qué hay estaciones del año?",
      answer:
        "Por la inclinación del eje de la Tierra, no por la distancia al Sol. De hecho, la Tierra pasa más cerca del Sol a comienzos de enero: es verano en Ñuble, pero invierno en el hemisferio norte.",
    },
    quiz: [
      {
        question: "¿Qué produce el día y la noche?",
        options: ["La rotación de la Tierra", "La traslación alrededor del Sol", "Las nubes"],
        correct: 0,
        explanation: "Al girar sobre sí misma, cada lugar pasa por el lado iluminado y por el lado oscuro.",
      },
      {
        question: "¿Por qué existen las estaciones del año?",
        options: ["Porque la Tierra se acerca y aleja del Sol", "Por la inclinación del eje", "Por la Luna"],
        correct: 1,
        explanation: "La inclinación de 23,4° hace que cada hemisferio reciba más o menos luz según la época.",
      },
      {
        question: "En este recorrido, ¿cuánto representa la distancia Sol–Tierra?",
        options: ["200 m", "2 km", "20 km"],
        correct: 1,
        explanation: "La escala del proyecto es de 2 km por cada unidad astronómica.",
      },
    ],
    render: {
      texture: { low: "/textures/earth_1k.webp", high: "/textures/earth_2k.webp" },
      clouds: { texture: "/textures/earth_clouds_1k.webp", opacity: 0.55, illustrative: true },
      polarRatio: 12_714 / 12_756,
      spinSeconds: 40,
      retrograde: false,
      labels: [
        { text: "Ñuble: estás aquí", lat: -36.42, lon: -71.96 },
        { text: "Océano Pacífico", lat: -15, lon: -125 },
        { text: "Antártida", lat: -80, lon: 0 },
      ],
      special: { kind: "daynight", label: "Ver Ñuble ahora" },
      artisticSurface: false,
    },
  },

  marte: {
    id: "marte",
    name: "Marte",
    nameInSentence: "Marte",
    kind: "Planeta rocoso",
    order: 4,
    color: "#D2694A",
    colorSoft: "#6A2E1E",
    diameterKm: 6792,
    massKg: 0.642e24,
    massEarths: 0.107,
    densityKgM3: 3934,
    gravityMs2: 3.7,
    meanDistanceKm: 228.0e6,
    perihelionKm: 206.7e6,
    aphelionKm: 249.3e6,
    orbitalPeriodDays: 687.0,
    rotationPeriodHours: 24.6,
    lengthOfDayHours: 24.7,
    obliquityDeg: 25.2,
    orbitalInclinationDeg: 1.8,
    eccentricity: 0.094,
    meanTempC: -65,
    tempContext: "Promedio. Va desde unos 20 °C al mediodía en el ecuador en verano hasta unos −153 °C en los polos.",
    moons: { count: 2, ...MOONS_FS },
    hasRings: false,
    dataSource: "nasa-planet-factsheet",
    hook: "El planeta rojo: su color viene del óxido de hierro, como la herrumbre de una herramienta vieja.",
    keyIdea: "Marte fue más húmedo en el pasado; hoy es un desierto frío con atmósfera muy delgada.",
    discover: [
      "Marte es rojizo porque su suelo tiene mucho óxido de hierro.",
      "Allí está el volcán más grande conocido del sistema solar, el monte Olimpo: unas tres veces más alto que el Everest.",
      "Hoy es un desierto frío, pero tiene huellas de ríos y lagos de hace miles de millones de años.",
      "Tiene dos lunas pequeñas: Fobos y Deimos.",
    ],
    understand: [
      "Un día solar marciano dura unas 24 h 40 min, casi como uno terrestre.",
      "Su eje está inclinado 25,2°, parecido al de la Tierra: también tiene estaciones, pero duran casi el doble porque su año es de 687 días.",
      "Su atmósfera es muy delgada (menos del 1 % de la presión terrestre) y casi toda de dióxido de carbono.",
      "En los polos hay casquetes de hielo de agua y de dióxido de carbono congelado.",
    ],
    deep: [
      "Diámetro: 6.792 km (53 % del terrestre). Masa: 0,107 Tierras. Gravedad: 3,7 m/s², el 38 % de la terrestre.",
      "Semieje mayor: 228,0 millones de km (1,524 UA); excentricidad 0,094, por eso su distancia al Sol varía entre 206,7 y 249,3 millones de km.",
      "Presión superficial media: unos 0,01 bar. Temperatura media: −65 °C.",
      "La textura proviene de NASA (mosaico en color basado en imágenes orbitales). La gran mancha clara del sur es la cuenca de impacto Hellas.",
    ],
    curiosity:
      "Una balanza de baño marcaría allí solo el 38 % de lo que marca en la Tierra: si marca 30 kg aquí, en Marte mostraría unos 11 kg. Tu masa no cambia; cambia la fuerza con que el planeta te atrae.",
    comparison: "Si la Tierra fuera una pelota de fútbol (22 cm), Marte sería un pomelo de 12 cm.",
    composition:
      "Planeta rocoso con núcleo de hierro; suelo rico en óxido de hierro; atmósfera de dióxido de carbono (95 %).",
    rotationNote: "Rotación sideral de 24,6 h; día solar de 24,7 h.",
    dataNotes: ["Las etiquetas del relieve se ubican con coordenadas aproximadas sobre la textura."],
    stationQuestion: {
      question: "¿Por qué Marte es rojo?",
      answer:
        "Su suelo y su polvo contienen mucho óxido de hierro, el mismo compuesto de la herrumbre. El viento levanta ese polvo fino y también tiñe el cielo marciano.",
    },
    quiz: [
      {
        question: "¿Qué le da el color rojo a Marte?",
        options: ["Lava caliente", "Óxido de hierro", "El reflejo del Sol"],
        correct: 1,
        explanation: "El óxido de hierro del suelo y del polvo le da su tono rojizo.",
      },
      {
        question: "¿Cuántas lunas tiene Marte?",
        options: ["Ninguna", "Dos", "Doce"],
        correct: 1,
        explanation: "Fobos y Deimos, dos lunas pequeñas y de forma irregular.",
      },
      {
        question: "¿Cuánto dura un día en Marte?",
        options: ["Unas 10 horas", "Casi lo mismo que en la Tierra", "Un mes"],
        correct: 1,
        explanation: "Un día solar marciano dura unas 24 h 40 min.",
      },
    ],
    render: {
      texture: { low: "/textures/mars_1k.webp", high: "/textures/mars_2k.webp" },
      polarRatio: 1,
      spinSeconds: 40,
      retrograde: false,
      labels: [
        { text: "Monte Olimpo", lat: 18.65, lon: -133.8 },
        { text: "Valles Marineris", lat: -13.9, lon: -59.2 },
        { text: "Cuenca Hellas", lat: -42.4, lon: 70.5 },
        { text: "Casquete polar norte", lat: 86, lon: 0 },
      ],
      special: { kind: "focus-label", label: "Buscar el monte Olimpo", target: "Monte Olimpo" },
      artisticSurface: false,
    },
  },

  jupiter: {
    id: "jupiter",
    name: "Júpiter",
    nameInSentence: "Júpiter",
    kind: "Gigante gaseoso",
    order: 5,
    color: "#D8B48A",
    colorSoft: "#6B5136",
    diameterKm: 142_984,
    polarDiameterKm: 133_708,
    massKg: 1898e24,
    massEarths: 317.8,
    densityKgM3: 1326,
    gravityMs2: 23.1,
    meanDistanceKm: 778.5e6,
    perihelionKm: 740.6e6,
    aphelionKm: 816.4e6,
    orbitalPeriodDays: 4331,
    rotationPeriodHours: 9.9,
    lengthOfDayHours: 9.9,
    obliquityDeg: 3.1,
    orbitalInclinationDeg: 1.3,
    eccentricity: 0.049,
    meanTempC: -110,
    tempContext: "Temperatura en el nivel donde la presión es de 1 bar. No tiene superficie sólida.",
    moons: { count: 115, asOf: "2026-09", source: "nasa-jupiter-moons" },
    hasRings: true,
    dataSource: "nasa-planet-factsheet",
    hook: "El gigante del sistema solar: dentro de él cabrían más de 1.300 Tierras.",
    keyIdea: "Júpiter es tan grande que tiene más del doble de la masa de todos los demás planetas juntos.",
    discover: [
      "Júpiter es el planeta más grande. Es una bola gigantesca de gas, sin suelo donde pararse.",
      "Sus franjas de colores son bandas de nubes que se mueven en direcciones opuestas.",
      "La Gran Mancha Roja es una tormenta más ancha que la Tierra, observada desde hace más de 150 años.",
    ],
    understand: [
      "Gira más rápido que cualquier otro planeta: un día dura menos de 10 horas.",
      "Está formado sobre todo por hidrógeno y helio, como el Sol.",
      "Tiene más del doble de la masa de todos los demás planetas juntos.",
      "Tiene 115 lunas reconocidas. Las cuatro más grandes, que descubrió Galileo en 1610, se pueden ver con binoculares.",
    ],
    deep: [
      "Diámetro ecuatorial: 142.984 km; polar: 133.708 km. Su rápida rotación lo achata un 6,5 %, y el modelo 3D lo muestra así.",
      "Masa: 1.898 × 10²⁴ kg (317,8 Tierras). Densidad media: 1.326 kg/m³.",
      "Semieje mayor: 778,5 millones de km (5,20 UA). Período orbital: 4.331 días (11,9 años).",
      "Lunas: 115 reconocidas por la IAU según NASA Science (página actualizada en septiembre de 2026). La cifra cambia con nuevos descubrimientos.",
    ],
    curiosity: "Júpiter también tiene anillos, pero son tenues y oscuros: los descubrió la sonda Voyager 1 en 1979.",
    comparison:
      "Si la Tierra fuera una pelota de fútbol (22 cm), Júpiter sería una esfera de 2,5 m: más alta que una puerta.",
    composition: "Hidrógeno y helio; en su interior, hidrógeno en estado metálico por la enorme presión.",
    rotationNote: "El día más corto del sistema solar: 9,9 horas.",
    dataNotes: [
      "La posición de la Gran Mancha Roja corresponde a la textura de NASA usada; en la realidad la mancha se desplaza en longitud con los años.",
    ],
    stationQuestion: {
      question: "¿Dónde se encuentra la Gran Mancha Roja?",
      answer:
        "En el hemisferio sur de Júpiter, a unos 22° bajo su ecuador. Es un anticiclón: una tormenta gigante que gira en sentido antihorario. En las últimas décadas se ha ido achicando, pero sigue siendo más ancha que la Tierra.",
    },
    quiz: [
      {
        question: "¿De qué está hecho principalmente Júpiter?",
        options: ["Roca y hierro", "Hidrógeno y helio", "Hielo de agua"],
        correct: 1,
        explanation: "Es un gigante gaseoso, con una composición parecida a la del Sol.",
      },
      {
        question: "¿Qué es la Gran Mancha Roja?",
        options: ["Un volcán", "Una tormenta gigante", "Un cráter"],
        correct: 1,
        explanation: "Es un anticiclón más ancho que la Tierra.",
      },
      {
        question: "¿Cuánto dura un día en Júpiter?",
        options: ["Menos de 10 horas", "24 horas", "Un año"],
        correct: 0,
        explanation: "Es el planeta que gira más rápido: 9,9 horas por vuelta.",
      },
    ],
    render: {
      texture: { low: "/textures/jupiter_1k.webp", high: "/textures/jupiter_1k.webp" },
      polarRatio: 133_708 / 142_984,
      spinSeconds: 24,
      retrograde: false,
      labels: [
        { text: "Gran Mancha Roja", lat: -29, lon: -108 },
        { text: "Bandas de nubes", lat: 12, lon: 30 },
      ],
      special: { kind: "focus-label", label: "Buscar la Gran Mancha Roja", target: "Gran Mancha Roja" },
      artisticSurface: false,
    },
  },

  saturno: {
    id: "saturno",
    name: "Saturno",
    nameInSentence: "Saturno",
    kind: "Gigante gaseoso",
    order: 6,
    color: "#E3CF94",
    colorSoft: "#6B5D35",
    diameterKm: 120_536,
    polarDiameterKm: 108_728,
    massKg: 568e24,
    massEarths: 95.2,
    densityKgM3: 687,
    gravityMs2: 9.0,
    meanDistanceKm: 1432.0e6,
    perihelionKm: 1357.6e6,
    aphelionKm: 1506.5e6,
    orbitalPeriodDays: 10_747,
    rotationPeriodHours: 10.7,
    lengthOfDayHours: 10.7,
    obliquityDeg: 26.7,
    orbitalInclinationDeg: 2.5,
    eccentricity: 0.052,
    meanTempC: -140,
    tempContext: "Temperatura en el nivel donde la presión es de 1 bar. No tiene superficie sólida.",
    moons: { count: 293, asOf: "2026-08", source: "nasa-saturn-moons" },
    hasRings: true,
    dataSource: "nasa-planet-factsheet",
    hook: "Sus anillos parecen sólidos, pero son muchísimos trozos de hielo y roca girando a su alrededor.",
    keyIdea:
      "Los anillos de Saturno son enormes de ancho pero muy delgados, y están hechos de innumerables partículas.",
    discover: [
      "Saturno tiene unos anillos gigantescos. Aunque desde lejos parecen sólidos, están formados por muchísimos fragmentos de hielo y roca que orbitan alrededor del planeta.",
      "Es el segundo planeta más grande.",
      "Es tan poco denso que, en una bañera de agua lo bastante grande, flotaría.",
      "Tiene más lunas conocidas que cualquier otro planeta.",
    ],
    understand: [
      "Los anillos están formados principalmente por partículas de hielo, junto con material rocoso y polvo. Sus partículas orbitan el planeta a distintas distancias.",
      "Los anillos principales se extienden unos 280.000 km de punta a punta, pero en general tienen solo unos 10 metros de espesor.",
      "Su eje está inclinado 26,7°. Por eso, a lo largo de su año de 29,4 años terrestres, vemos los anillos desde arriba, de canto y desde abajo.",
      "Un día en Saturno dura unas 10 h 40 min.",
    ],
    deep: [
      "Diámetro ecuatorial: 120.536 km; polar: 108.728 km. Es el planeta más achatado (cerca de 10 %), y el modelo 3D lo muestra así.",
      "Densidad media: 687 kg/m³, menor que la del agua (1.000 kg/m³). Masa: 95,2 Tierras.",
      "Radios de los anillos (NASA NSSDC): anillo C de 74.658 a 91.975 km; anillo B hasta 117.507 km; división de Cassini hasta 122.340 km; anillo A hasta 136.780 km, con el hueco de Encke a 133.410 km; anillo F a 139.826 km.",
      "Lunas: 293 confirmadas a agosto de 2026, según NASA Science. La estructura fina de la textura de los anillos es ilustrativa; los radios de cada anillo son los publicados.",
    ],
    curiosity:
      "La división de Cassini, el hueco oscuro entre los anillos A y B, mide unos 4.800 km de ancho: más que la distancia en línea recta entre Arica y Punta Arenas (unos 3.860 km).",
    comparison:
      "Si la Tierra fuera una pelota de fútbol (22 cm), Saturno mediría 2,1 m y sus anillos principales casi 5 m de punta a punta.",
    composition: "Hidrógeno y helio; anillos de hielo de agua con algo de roca y polvo.",
    rotationNote: "Una vuelta en unas 10 h 40 min; su rápida rotación lo achata visiblemente.",
    dataNotes: ["Los radios de los anillos provienen de la Saturnian Rings Fact Sheet de NASA."],
    stationQuestion: {
      question: "¿Qué planeta tiene los anillos más conocidos y de qué están hechos?",
      answer:
        "Saturno. Sus anillos son millones de partículas de hielo de agua, con algo de roca y polvo, desde granos diminutos hasta bloques del tamaño de una casa. Júpiter, Urano y Neptuno también tienen anillos, pero son mucho más tenues.",
    },
    quiz: [
      {
        question: "¿De qué están hechos los anillos de Saturno?",
        options: ["De una lámina sólida", "De partículas de hielo y roca", "De gas brillante"],
        correct: 1,
        explanation: "Son innumerables fragmentos que orbitan el planeta, cada uno en su propia órbita.",
      },
      {
        question: "¿Qué pasaría con Saturno en una bañera gigante de agua?",
        options: ["Se hundiría", "Flotaría", "Se disolvería"],
        correct: 1,
        explanation: "Su densidad media (687 kg/m³) es menor que la del agua.",
      },
      {
        question: "¿Qué tan gruesos son, en general, los anillos principales?",
        options: ["Unos 10 metros", "Unos 1.000 km", "Tan gruesos como la Tierra"],
        correct: 0,
        explanation: "Son anchísimos pero extremadamente delgados: en general, unos 10 m.",
      },
    ],
    render: {
      texture: { low: "/textures/saturn_1k.webp", high: "/textures/saturn_1k.webp" },
      polarRatio: 108_728 / 120_536,
      spinSeconds: 26,
      retrograde: false,
      rings: { texture: "/textures/saturn_rings.webp", innerKm: 74_000, outerKm: 140_600, enhanced: false },
      labels: [
        { text: "Anillo B, el más brillante", lat: 0, lon: 0, ringKm: 104_000 },
        { text: "División de Cassini", lat: 0, lon: 0, ringKm: 119_900 },
        { text: "Anillo A", lat: 0, lon: 0, ringKm: 129_500 },
      ],
      special: { kind: "rings", label: "Explorar los anillos" },
      artisticSurface: false,
    },
  },

  urano: {
    id: "urano",
    name: "Urano",
    nameInSentence: "Urano",
    kind: "Gigante de hielo",
    order: 7,
    color: "#9FE0E3",
    colorSoft: "#2F6467",
    diameterKm: 51_118,
    massKg: 86.8e24,
    massEarths: 14.5,
    densityKgM3: 1270,
    gravityMs2: 8.7,
    meanDistanceKm: 2867.0e6,
    perihelionKm: 2732.7e6,
    aphelionKm: 3001.4e6,
    orbitalPeriodDays: 30_589,
    rotationPeriodHours: -17.2,
    lengthOfDayHours: 17.2,
    obliquityDeg: 97.8,
    orbitalInclinationDeg: 0.8,
    eccentricity: 0.047,
    meanTempC: -195,
    tempContext: "Temperatura en el nivel de 1 bar. En su atmósfera se han medido mínimos cercanos a −224 °C.",
    moons: { count: 29, asOf: "2026-08", source: "nasa-uranus-moons" },
    hasRings: true,
    dataSource: "nasa-planet-factsheet",
    hook: "El planeta que gira de costado: su eje está inclinado casi 98°.",
    keyIdea: "Urano gira tumbado, por eso cada polo pasa décadas de luz y décadas de oscuridad.",
    discover: [
      "Urano gira como si rodara por su órbita: su eje está casi acostado.",
      "Es un gigante de hielo de color celeste verdoso, por el metano de su atmósfera.",
      "Fue el primer planeta descubierto con telescopio, en 1781.",
      "Es la última estación de este recorrido.",
    ],
    understand: [
      "Por su gran inclinación, cada polo vive unos 42 años de luz continua y luego 42 años de oscuridad.",
      "El metano de su atmósfera absorbe la luz roja; por eso lo vemos celeste.",
      "Es uno de los planetas más fríos: en su atmósfera se han medido temperaturas cercanas a −224 °C.",
      "Tiene 13 anillos conocidos, angostos y muy oscuros, y 29 lunas reconocidas. Las que ya tienen nombre lo llevan de personajes de obras de Shakespeare y de Alexander Pope; las descubiertas más recientemente aún esperan el suyo.",
    ],
    deep: [
      "Diámetro: 51.118 km. Masa: 14,5 Tierras. Semieje mayor: 2.867 millones de km (19,17 UA). Período orbital: 30.589 días (83,7 años).",
      "Inclinación del eje: 97,8°. Rotación retrógrada de 17,2 h.",
      "Radios de los anillos principales (NASA NSSDC): del anillo 6 (41.837 km) al anillo épsilon (51.149 km). En el modelo se realzaron para que se vean: en realidad son casi negros.",
      "Su textura es procedural: la Voyager 2, única nave que lo visitó (1986), lo vio casi sin detalles visibles.",
    ],
    curiosity: "Solo una nave lo ha visitado: la Voyager 2, que pasó junto a él en enero de 1986.",
    comparison: "Si la Tierra fuera una pelota de fútbol (22 cm), Urano sería una pelota de playa de 88 cm.",
    composition:
      "Agua, metano y amoníaco en estados muy densos y calientes («hielos») sobre un núcleo rocoso; atmósfera de hidrógeno, helio y metano.",
    rotationNote: "Gira de costado y en sentido retrógrado; cada polo apunta al Sol durante décadas.",
    dataNotes: ["El brillo de los anillos está realzado. La superficie es una representación procedural."],
    stationQuestion: {
      question: "¿Qué planeta gira de una manera especialmente diferente?",
      answer:
        "Urano, que gira casi de costado (97,8°). Venus también es especial: gira al revés y tan lento que su día sideral dura más que su año. Una hipótesis es que un gran choque en el pasado inclinó a Urano, pero todavía se investiga.",
    },
    quiz: [
      {
        question: "¿Qué tiene de especial el eje de Urano?",
        options: ["Está casi acostado", "No tiene eje", "Apunta siempre al Sol"],
        correct: 0,
        explanation: "Está inclinado 97,8°: Urano gira de costado.",
      },
      {
        question: "¿Por qué Urano se ve celeste?",
        options: ["Por sus océanos", "Por el metano de su atmósfera", "Porque refleja el cielo"],
        correct: 1,
        explanation: "El metano absorbe la luz roja y deja pasar los tonos azulados.",
      },
      {
        question: "¿Cuántas naves han visitado Urano?",
        options: ["Ninguna", "Una", "Diez"],
        correct: 1,
        explanation: "Solo la Voyager 2, en 1986.",
      },
    ],
    render: {
      texture: { low: "/textures/uranus_1k.webp", high: "/textures/uranus_1k.webp" },
      polarRatio: 0.977,
      spinSeconds: 30,
      retrograde: true,
      rings: { texture: "/textures/uranus_rings.webp", innerKm: 41_000, outerKm: 52_000, enhanced: true },
      labels: [{ text: "Polo (eje inclinado 97,8°)", lat: 89, lon: 0 }],
      special: { kind: "axis", label: "Ver su eje inclinado" },
      artisticSurface: true,
    },
  },
};

export const BODY_ORDER: BodyId[] = ["sol", "mercurio", "venus", "tierra", "marte", "jupiter", "saturno", "urano"];
export const PLANET_IDS: BodyId[] = BODY_ORDER.filter((id) => id !== "sol");

export function getBody(id: BodyId): Body {
  return BODIES[id];
}

export function isBodyId(value: string): value is BodyId {
  return (BODY_ORDER as string[]).includes(value);
}

/** Distancia media al Sol en unidades astronómicas. */
export function meanDistanceAU(body: Body): number | null {
  return body.meanDistanceKm === null ? null : body.meanDistanceKm / AU_KM;
}

/** Minutos que tarda la luz en recorrer una distancia en km. */
export function lightMinutes(km: number): number {
  return km / LIGHT_SPEED_KM_S / 60;
}
