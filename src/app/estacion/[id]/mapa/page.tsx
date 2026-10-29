import type { Metadata } from "next";
import { MapMode } from "@/components/map/MapMode";

export const metadata: Metadata = { title: "Mapa del recorrido" };

export default async function StationMapPage({ params }: PageProps<"/estacion/[id]/mapa">) {
  const { id } = await params;
  return <MapMode stationId={id} />;
}
