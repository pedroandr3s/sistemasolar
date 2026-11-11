/**
 * Fechas y horas.
 * Internamente todo se maneja como instantes UTC (Date / milisegundos).
 * Para mostrar y para el selector de fecha se usa la hora oficial de Chile
 * continental (America/Santiago), que cambia entre UTC−4 y UTC−3.
 */

export const CHILE_TZ = "America/Santiago";

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: CHILE_TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function wallClockIn(date: Date): WallClock {
  const parts = partsFormatter.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

/** Desfase de Chile respecto de UTC (minutos) en un instante dado. Ej.: −180 en verano. */
export function chileOffsetMinutes(date: Date): number {
  const w = wallClockIn(date);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  const truncated = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((asUtc - truncated) / 60000);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Valor para <input type="datetime-local"> en hora de Chile: «AAAA-MM-DDTHH:mm». */
export function toChileInputValue(date: Date): string {
  const w = wallClockIn(date);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}`;
}

/**
 * Convierte una hora local de Chile («AAAA-MM-DDTHH:mm») en un instante UTC.
 * Si la hora no existe (salto al horario de verano) se usa el instante
 * inmediatamente posterior; si es ambigua (fin del horario de verano), la primera.
 */
export function parseChileInputValue(value: string): Date | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4], m[5], m[6] ?? "0"].map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  // Probar los desfases posibles y quedarse con el que reproduce la hora pedida.
  const candidates = [-240, -180, -300, -120].map((off) => guess - off * 60000);
  const valid = candidates
    .filter((t) => {
      const w = wallClockIn(new Date(t));
      return w.year === y && w.month === mo && w.day === d && w.hour === h && w.minute === mi;
    })
    .sort((a, b) => a - b);
  if (valid.length > 0) return new Date(valid[0]!);
  // Hora inexistente (salto de reloj): usar el desfase vigente una hora después.
  const later = new Date(guess + 3600_000);
  return new Date(guess - chileOffsetMinutes(later) * 60000);
}

const dateTimeFmt = new Intl.DateTimeFormat("es-CL", {
  timeZone: CHILE_TZ,
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateFmt = new Intl.DateTimeFormat("es-CL", {
  timeZone: CHILE_TZ,
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** «17 de octubre de 2026, 18:56» en hora de Chile. */
export function formatChileDateTime(date: Date): string {
  return dateTimeFmt.format(date);
}

export function formatChileDate(date: Date): string {
  return dateFmt.format(date);
}

/** Etiqueta del huso horario vigente: «UTC−3» o «UTC−4». */
export function chileUtcLabel(date: Date): string {
  const off = chileOffsetMinutes(date);
  const sign = off <= 0 ? "−" : "+";
  const abs = Math.abs(off);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${pad(m)}` : ""}`;
}

export function formatUtc(date: Date): string {
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export const DAY_MS = 86_400_000;

/** Convierte «AAAA-MM» en una fecha legible: «agosto de 2026». */
export function formatYearMonth(ym: string): string {
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return ym;
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `${months[Number(m[2]) - 1] ?? m[2]} de ${m[1]}`;
}
