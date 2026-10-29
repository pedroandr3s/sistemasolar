import type { Metadata } from "next";
import { LearnMode } from "@/components/learn/LearnMode";

export const metadata: Metadata = { title: "Aprender" };

export default async function StationLearnPage({ params }: PageProps<"/estacion/[id]/aprender">) {
  const { id } = await params;
  return <LearnMode stationId={id} />;
}
