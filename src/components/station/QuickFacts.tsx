import type { Body } from "@/data/bodies";
import { LIGHT_SPEED_KM_S, AU_KM } from "@/data/bodies";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/format";

interface Fact {
  icon: IconName;
  value: string;
  label: string;
}

const EARTH_DIAMETER_KM = 12_756;

/** Los tres datos que se ven de inmediato: tamaño, duración del año y lunas (o, en el Sol, calor y luz). */
export function quickFacts(body: Body): [Fact, Fact, Fact] {
  const ratio = body.diameterKm / EARTH_DIAMETER_KM;
  const size: Fact =
    body.id === "tierra"
      ? { icon: "ruler", value: `${formatNumber(body.diameterKm)} km`, label: "de ancho" }
      : ratio >= 1
        ? { icon: "ruler", value: `${formatNumber(ratio, ratio < 20 ? 1 : 0)} Tierras`, label: "caben a lo ancho" }
        : {
            icon: "ruler",
            value: `${formatNumber(ratio * 100, 0)} %`,
            label: "del ancho de la Tierra",
          };

  if (body.id === "sol") {
    const lightMin = AU_KM / LIGHT_SPEED_KM_S / 60;
    return [
      size,
      { icon: "thermo", value: `${formatNumber(body.meanTempC)} °C`, label: "en su superficie" },
      { icon: "sun", value: `${formatNumber(lightMin, 0)} minutos`, label: "tarda su luz en llegar" },
    ];
  }

  const days = body.orbitalPeriodDays ?? 0;
  const years = days / 365.25;
  const year: Fact =
    days < 700
      ? { icon: "calendar", value: `${formatNumber(days, 0)} días`, label: "dura su año" }
      : { icon: "calendar", value: `${formatNumber(years, years < 20 ? 1 : 0)} años`, label: "dura una vuelta al Sol" };

  const count = body.moons?.count ?? 0;
  const moons: Fact =
    count === 0
      ? { icon: "moon", value: "Sin lunas", label: "ninguna conocida" }
      : { icon: "moon", value: count === 1 ? "1 luna" : `${formatNumber(count)} lunas`, label: "conocidas" };

  return [size, year, moons];
}

export function QuickFacts({ body }: { body: Body }) {
  return (
    <ul className="quick-facts" aria-label={`Tres datos de ${body.nameInSentence}`}>
      {quickFacts(body).map((f) => (
        <li key={f.label}>
          <span className="quick-facts__icon" aria-hidden="true">
            <Icon name={f.icon} size={22} />
          </span>
          <strong>{f.value}</strong>
          <span>{f.label}</span>
        </li>
      ))}
    </ul>
  );
}
