/**
 * Formato numérico en español de Chile: punto para miles y coma decimal.
 * Se implementa a mano para que sea idéntico en todos los navegadores
 * (algunos no agrupan los números de cuatro cifras en «es»).
 */
export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  const fixed = Math.abs(value).toFixed(decimals);
  const [int, frac] = fixed.split(".");
  const grouped = (int ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const sign = value < 0 && Number(fixed) !== 0 ? "−" : "";
  return frac ? `${sign}${grouped},${frac}` : `${sign}${grouped}`;
}

/** Número con decimales «inteligentes» según su magnitud. */
export function formatSmart(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 100) return formatNumber(value, 0);
  if (abs >= 10) return formatNumber(value, 1);
  if (abs >= 1) return formatNumber(value, 2);
  return formatNumber(value, 3);
}

/** Distancia de recorrido: «650 m», «0,8 km», «38,3 km». */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 950) return `${formatNumber(Math.round(meters / 10) * 10)} m`;
  if (meters < 9_950) return `${formatNumber(meters / 1000, 2).replace(/0$/, "")} km`;
  return `${formatNumber(meters / 1000, 1)} km`;
}

/** Kilómetro del recorrido: «km 2,0». */
export function formatKmMark(meters: number): string {
  return `km ${formatNumber(meters / 1000, 1)}`;
}

/** Millones de kilómetros: «149,6 millones de km». */
export function formatMillionKm(km: number): string {
  const m = km / 1e6;
  if (m >= 1000) return `${formatNumber(m / 1000, 2)} mil millones de km`;
  return `${formatNumber(m, m >= 100 ? 1 : 1)} millones de km`;
}

export function formatAU(au: number): string {
  return `${formatNumber(au, au >= 10 ? 2 : 3)} UA`;
}

/** Notación científica legible: 1,988 × 10³⁰ */
export function formatScientific(value: number, digits = 3): string {
  if (value === 0) return "0";
  const exp = Math.floor(Math.log10(Math.abs(value)));
  const mant = value / 10 ** exp;
  const sup: Record<string, string> = {
    "-": "⁻",
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
  };
  const expStr = String(exp)
    .split("")
    .map((c) => sup[c] ?? c)
    .join("");
  return `${formatNumber(mant, digits)} × 10${expStr}`;
}

/** Duración en horas expresada en la unidad más natural. */
export function formatDurationHours(hours: number): string {
  const h = Math.abs(hours);
  if (h < 48) {
    const whole = Math.floor(h);
    const min = Math.round((h - whole) * 60);
    if (min === 60) return `${whole + 1} h`;
    return min ? `${whole} h ${min} min` : `${whole} h`;
  }
  const days = h / 24;
  if (days < 800) return `${formatNumber(days, days < 10 ? 1 : 0)} días`;
  return `${formatNumber(days / 365.25, 1)} años`;
}

export function formatDays(days: number): string {
  if (days < 800) return `${formatNumber(days, days < 10 ? 1 : 0)} días`;
  return `${formatNumber(days / 365.25, 1)} años`;
}

export function formatMinutes(min: number): string {
  if (min < 1) return `${formatNumber(min * 60, 0)} s`;
  if (min < 120) {
    const m = Math.floor(min);
    const s = Math.round((min - m) * 60);
    return s ? `${m} min ${s} s` : `${m} min`;
  }
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatPercent(fraction: number, decimals = 0): string {
  return `${formatNumber(fraction * 100, decimals)} %`;
}
