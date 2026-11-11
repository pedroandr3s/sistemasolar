"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { stationPath } from "@/config/site";
import { useLastStation } from "@/lib/progress";

interface Mode {
  key: "planeta" | "donde" | "mapa" | "aprender";
  label: string;
  icon: IconName;
  suffix: string;
  global: string;
}

/*
 * Cuatro modos, con palabras de niño. «Sistema solar» (los planetas por fecha) dejó
 * la barra: se confundía con el mapa y no hace falta para avanzar por la ruta. Sigue
 * en su misma dirección y se abre desde Aprender y desde «Quiero saber más».
 */
const MODES: Mode[] = [
  { key: "planeta", label: "Planeta", icon: "planet", suffix: "", global: "" },
  { key: "donde", label: "Dónde voy", icon: "compass", suffix: "/orientarme", global: "/orientarme" },
  { key: "mapa", label: "Mapa", icon: "map", suffix: "/mapa", global: "/mapa" },
  { key: "aprender", label: "Aprender", icon: "learn", suffix: "/aprender", global: "/aprender" },
];

/**
 * Barra inferior con los cuatro modos. Dentro de una estación, todos los
 * enlaces conservan la estación del QR (/estacion/<id>/...). Fuera de una
 * estación, «Planeta» lleva a la última estación abierta en este teléfono.
 */
export function ModeNav({ stationId }: { stationId?: string }) {
  const pathname = usePathname();
  const lastStation = useLastStation();

  return (
    <nav className="mode-nav" aria-label="Modos de la experiencia">
      <ul>
        {MODES.map((m) => {
          let href: string;
          if (stationId) href = `${stationPath(stationId)}${m.suffix}`;
          else if (m.key === "planeta") href = stationPath(lastStation ?? "sol");
          else href = m.global;
          const active = stationId ? pathname === href : m.key !== "planeta" && pathname === m.global;
          return (
            <li key={m.key}>
              <Link href={href} aria-current={active ? "page" : undefined}>
                <Icon name={m.icon} size={24} />
                <span>{m.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
