import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Imagen para compartir (Open Graph): la que aparece al enviar el enlace de una
 * estación por mensajería o redes. Se genera al compilar, sin servicios externos.
 * Tipografías Barlow (OFL) convertidas a TTF, el formato que admite ImageResponse.
 */
export const OG_SIZE = { width: 1200, height: 630 };

const fonts = Promise.all([
  readFile(join(process.cwd(), "src/fonts/og/barlow-condensed-latin-700-normal.ttf")),
  readFile(join(process.cwd(), "src/fonts/og/barlow-latin-500-normal.ttf")),
]);

export async function renderOgImage({
  kicker,
  title,
  line,
  color,
  footer,
}: {
  kicker: string;
  title: string;
  line: string;
  color: string;
  footer: string;
}): Promise<ImageResponse> {
  const [condensed, regular] = await fonts;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#0f1830",
        color: "#eef2f7",
        fontFamily: "Barlow",
        position: "relative",
      }}
    >
      {/* El cuerpo celeste, cortado por el borde derecho */}
      <div
        style={{
          position: "absolute",
          right: -150,
          top: 75,
          width: 480,
          height: 480,
          borderRadius: 9999,
          background: color,
          boxShadow: `0 0 120px ${color}55`,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 80px",
          width: 820,
        }}
      >
        <div style={{ fontSize: 30, color: "#f4b860", display: "flex" }}>{kicker}</div>
        <div
          style={{
            fontFamily: "Barlow Condensed",
            fontSize: 150,
            lineHeight: 1,
            marginTop: 8,
            display: "flex",
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 36, lineHeight: 1.3, marginTop: 24, color: "#eef2f7", display: "flex" }}>{line}</div>
        <div style={{ fontSize: 24, marginTop: 40, color: "#a7b2c9", display: "flex" }}>{footer}</div>
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: [
        { name: "Barlow Condensed", data: condensed, style: "normal", weight: 700 },
        { name: "Barlow", data: regular, style: "normal", weight: 500 },
      ],
    },
  );
}
