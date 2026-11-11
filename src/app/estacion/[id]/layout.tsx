import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModeNav } from "@/components/shell/ModeNav";
import { StationProgress } from "@/components/station/StationProgress";
import { findPlacement, getPlacements, getStationIds } from "@/lib/stations";

export const dynamicParams = false;

export function generateStaticParams() {
  return getStationIds().map((id) => ({ id }));
}

export default async function StationLayout({ children, params }: LayoutProps<"/estacion/[id]">) {
  const { id } = await params;
  const placement = findPlacement(id);
  if (!placement) notFound();
  const total = getPlacements().length;

  return (
    // --body: el color del astro tiñe la página de su estación (ver globals.css).
    <div className="with-nav" style={{ "--body": placement.body.color } as CSSProperties}>
      <header>
        <div className="top-bar">
          <Link href="/" className="brand">
            <span className="brand__mark" aria-hidden="true" />
            Sistema solar a escala
          </Link>
          <span className="tabular">
            Parada {placement.station.order + 1} de {total}
          </span>
        </div>
        <StationProgress currentId={id} />
      </header>
      <main id="contenido">{children}</main>
      <ModeNav stationId={id} />
    </div>
  );
}
