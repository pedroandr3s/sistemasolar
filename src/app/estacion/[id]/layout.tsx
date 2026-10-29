import Link from "next/link";
import { notFound } from "next/navigation";
import { ModeNav } from "@/components/shell/ModeNav";
import { RouteRuler } from "@/components/route/RouteRuler";
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
    <div className="with-nav">
      <header>
        <div className="top-bar">
          <Link href="/" className="brand">
            <span
              aria-hidden="true"
              style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-sol)" }}
            />
            Sistema solar a escala
          </Link>
          <span className="tabular">
            Estación {placement.station.order + 1} de {total}
          </span>
        </div>
        <div className="ruler-wrap">
          <RouteRuler currentId={id} />
        </div>
      </header>
      <main id="contenido">{children}</main>
      <ModeNav stationId={id} />
    </div>
  );
}
