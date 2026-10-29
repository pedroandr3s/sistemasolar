import { notFound } from "next/navigation";
import { getPlacements, findPlacement, getStationIds } from "@/lib/stations";
import { OG_SIZE, renderOgImage } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Estación del recorrido Sistema solar a escala San Carlos–San Fabián";

export function generateStaticParams() {
  return getStationIds().map((id) => ({ id }));
}

/** Imagen para compartir cada estación (se genera al compilar). */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = findPlacement(id);
  if (!p) notFound();
  return renderOgImage({
    kicker: `Estación ${p.station.order + 1} de ${getPlacements().length}`,
    title: p.body.name,
    line: p.body.hook,
    color: p.body.color,
    footer: "Sistema solar a escala · San Carlos–San Fabián, Ñuble",
  });
}
