import { OG_SIZE, renderOgImage } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Sistema solar a escala San Carlos–San Fabián";

/** Imagen para compartir el sitio (se genera al compilar). */
export default async function Image() {
  return renderOgImage({
    kicker: "Ruta N-31 · Ñuble, Chile",
    title: "Sistema solar a escala",
    line: "Ocho esculturas entre San Carlos y San Fabián: cada 2 km, la distancia de la Tierra al Sol.",
    color: "#F6C453",
    footer: "Escanea el QR de cada estación con la cámara del teléfono",
  });
}
