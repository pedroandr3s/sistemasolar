import type { Body } from "@/data/bodies";
import { meanDistanceAU } from "@/data/bodies";
import {
  formatAU,
  formatDays,
  formatDurationHours,
  formatMillionKm,
  formatNumber,
  formatScientific,
} from "@/lib/format";
import { formatYearMonth } from "@/lib/time";
import { SOURCES } from "@/data/sources";

/** Datos clave del cuerpo, en unidades del SI con equivalencias cotidianas. */
export function KeyFacts({ body }: { body: Body }) {
  const au = meanDistanceAU(body);
  const rows: { label: string; value: string; note?: string }[] = [
    { label: "Tipo", value: body.kind },
    {
      label: "Diámetro",
      value: `${formatNumber(body.diameterKm)} km`,
      note:
        body.id === "tierra"
          ? "Ecuatorial."
          : `${formatNumber(body.diameterKm / 12_756, body.diameterKm > 12_756 ? 1 : 2)} veces el de la Tierra.`,
    },
    {
      label: "Masa",
      value: `${formatScientific(body.massKg)} kg`,
      note:
        body.id === "tierra"
          ? undefined
          : `${formatNumber(body.massEarths, body.massEarths < 10 ? 3 : 1)} veces la masa de la Tierra.`,
    },
  ];
  if (body.meanDistanceKm !== null && au !== null) {
    rows.push({
      label: "Distancia media al Sol",
      value: formatMillionKm(body.meanDistanceKm),
      note: `${formatAU(au)} (unidades astronómicas).`,
    });
  }
  if (body.orbitalPeriodDays !== null) {
    rows.push({
      label: "Duración del año",
      value: formatDays(body.orbitalPeriodDays),
      note: "Una vuelta completa alrededor del Sol.",
    });
  }
  rows.push({ label: "Rotación", value: formatDurationHours(body.rotationPeriodHours), note: body.rotationNote });
  rows.push({
    label: "Temperatura representativa",
    value: `${formatNumber(body.meanTempC)} °C`,
    note: body.tempContext,
  });
  rows.push({
    label: "Gravedad",
    value: `${formatNumber(body.gravityMs2, 1)} m/s²`,
    note: body.id === "tierra" ? undefined : `${formatNumber(body.gravityMs2 / 9.8, 2)} veces la terrestre.`,
  });
  if (body.moons) {
    rows.push({
      label: "Lunas conocidas",
      value: formatNumber(body.moons.count),
      note: `Cifra a ${formatYearMonth(body.moons.asOf)} (${SOURCES[body.moons.source].publisher}).`,
    });
  }
  rows.push({ label: "Composición", value: body.composition });

  return (
    <dl className="facts">
      {rows.map((r) => (
        <div key={r.label}>
          <dt>{r.label}</dt>
          <dd>
            {r.value}
            {r.note && <small>{r.note}</small>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
