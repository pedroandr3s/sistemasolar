"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { stationPath } from "@/config/site";
import { useLastStation } from "@/lib/progress";

interface Mode {
  key: "explorar" | "orientarme" | "sistema" | "mapa" | "aprender";
  label: string;
  icon: IconName;
  suffix: string;
  global: string;
}

const MODES: Mode[] = [
  { key: "explorar", label: "Explorar", icon: "planet", suffix: "", global: "" },
  { key: "orientarme", label: "Orientarme", icon: "compass", suffix: "/orientarme", global: "/orientarme" },
  { key: "sistema", label: "Sistema solar", icon: "orbits", suffix: "/sistema-solar", global: "/sistema-solar" },
  { key: "mapa", label: "Mapa", icon: "map", suffix: "/mapa", global: "/mapa" },
  { key: "aprender", label: "Aprender", icon: "learn", suffix: "/aprender", global: "/aprender" },
];

/**
 * Barra inferior con los cinco modos. Dentro de una estación, todos los
 * enlaces conservan la estación del QR (/estacion/<id>/...). Fuera de una
 * estación, «Explorar» lleva a la última estación abierta en este teléfono.
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
          else if (m.key === "explorar") href = stationPath(lastStation ?? "sol");
          else href = m.global;
          const active = stationId ? pathname === href : m.key !== "explorar" && pathname === m.global;
          return (
            <li key={m.key}>
              <Link href={href} aria-current={active ? "page" : undefined}>
                <Icon name={m.icon} size={23} />
                <span>{m.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
