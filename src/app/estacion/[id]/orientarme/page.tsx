import type { Metadata } from "next";
import { OrientMode } from "@/components/orient/OrientMode";
import { findPlacement } from "@/lib/stations";

export async function generateMetadata({ params }: PageProps<"/estacion/[id]/orientarme">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Orientarme desde ${findPlacement(id)?.station.name ?? "la estación"}` };
}

export default async function StationOrientPage({ params }: PageProps<"/estacion/[id]/orientarme">) {
  const { id } = await params;
  return <OrientMode stationId={id} />;
}
