/**
 * Genera un PDF con un código QR por cuerpo (el Sol y los siete planetas) que abre
 * su estación ofreciendo de inmediato la realidad aumentada (dirección con ?ar=1).
 *
 *   npm run qr:ar -- --base https://sistemasolar-black.vercel.app
 *   npm run qr:ar                      (usa NEXT_PUBLIC_SITE_URL)
 *
 * Salida: artifacts/qr/ar/qr-realidad-aumentada.pdf y un PNG por cuerpo.
 * Cada código se decodifica después de generarlo para comprobar su dirección.
 */
import { loadEnvConfig } from "@next/env";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import jsQR from "jsqr";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { PNG } from "pngjs";
import QRCode from "qrcode";
import { STATIONS } from "../../src/config/stations";
import { sizeAtScaleMeters } from "../../src/config/scale";
import { stationArUrl, validateSiteUrl } from "../../src/config/site";
import { BODIES } from "../../src/data/bodies";

const MM = 72 / 25.4;
const A4: [number, number] = [210 * MM, 297 * MM];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Las fuentes estándar de PDF usan WinAnsi: se quitan los caracteres que no admite. */
function pdfText(s: string): string {
  return s
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E -ÿ]/g, "");
}

function centered(page: PDFPage, text: string, font: PDFFont, size: number, y: number, color = rgb(0, 0, 0)) {
  const t = pdfText(text);
  page.drawText(t, { x: (page.getWidth() - font.widthOfTextAtSize(t, size)) / 2, y, size, font, color });
}

function centeredAt(page: PDFPage, text: string, font: PDFFont, size: number, cx: number, y: number, gray = 0) {
  const t = pdfText(text);
  page.drawText(t, { x: cx - font.widthOfTextAtSize(t, size) / 2, y, size, font, color: rgb(gray, gray, gray) });
}

function sizeText(meters: number): string {
  const n = (v: number, d: number) => v.toLocaleString("es-CL", { minimumFractionDigits: d, maximumFractionDigits: d });
  if (meters >= 1) return `${n(meters, 1)} m`;
  const cm = meters * 100;
  return `${n(cm, cm < 10 ? 1 : 0)} cm`;
}

function decode(png: Buffer): string | null {
  const img = PNG.sync.read(png);
  return (
    jsQR(new Uint8ClampedArray(img.data.buffer, img.data.byteOffset, img.data.length), img.width, img.height)?.data ??
    null
  );
}

async function main() {
  loadEnvConfig(process.cwd(), false);
  const check = validateSiteUrl(arg("base") ?? process.env.NEXT_PUBLIC_SITE_URL, "produccion");
  for (const w of check.warnings) console.warn(`  Aviso: ${w}`);
  if (!check.ok || !check.url) {
    for (const e of check.errors) console.error(`  Error: ${e}`);
    console.error("\nIndica la dirección publicada del sitio, por ejemplo:");
    console.error("  npm run qr:ar -- --base https://sistemasolar-black.vercel.app");
    process.exit(1);
  }
  const base = check.url;
  const outDir = resolve(arg("out") ?? join("artifacts", "qr", "ar"));
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const stations = [...STATIONS].sort((a, b) => a.order - b.order);
  const items: { name: string; url: string; size: string; png: Buffer }[] = [];
  for (const s of stations) {
    const url = stationArUrl(base, s.id);
    const png = await QRCode.toBuffer(url, {
      errorCorrectionLevel: "Q",
      margin: 4,
      width: 1200,
      color: { dark: "#000000", light: "#ffffff" },
    });
    if (decode(png) !== url) throw new Error(`El QR de ${s.name} no se pudo verificar.`);
    await writeFile(join(outDir, `qr-ar-${s.order + 1}-${s.id}.png`), png);
    items.push({ name: s.name, url, size: sizeText(sizeAtScaleMeters(BODIES[s.bodyId].diameterKm)), png });
  }

  const pdf = await PDFDocument.create();
  pdf.setTitle("Códigos QR de realidad aumentada - Sistema solar a escala San Carlos-San Fabián");
  pdf.setProducer("sistema-solar scripts/qr/ar");
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);

  // Hoja resumen: los ocho códigos.
  {
    const page = pdf.addPage(A4);
    centered(page, "El Sol y los planetas en realidad aumentada", bold, 20, A4[1] - 24 * MM);
    centered(page, "Sistema solar a escala San Carlos - San Fabián", reg, 11, A4[1] - 31 * MM, rgb(0.3, 0.3, 0.3));
    centered(
      page,
      "Escanea un código con la cámara del teléfono y pulsa «Ver en realidad aumentada».",
      reg,
      10.5,
      A4[1] - 41 * MM,
    );
    centered(
      page,
      "Cada cuerpo aparece al tamaño que tiene en el recorrido (1 unidad astronómica = 2 km).",
      reg,
      10.5,
      A4[1] - 46.5 * MM,
    );
    const colX = [A4[0] / 2 - 46 * MM, A4[0] / 2 + 46 * MM];
    for (let i = 0; i < items.length; i++) {
      const it = items[i]!;
      const cx = colX[i % 2]!;
      const top = A4[1] - 52 * MM - Math.floor(i / 2) * 55 * MM;
      const size = 44 * MM;
      page.drawImage(await pdf.embedPng(it.png), { x: cx - size / 2, y: top - size, width: size, height: size });
      centeredAt(page, it.name, bold, 13, cx, top - size - 5 * MM);
      centeredAt(page, `${it.size} de diámetro a escala`, reg, 8.5, cx, top - size - 9 * MM, 0.35);
    }
    centered(
      page,
      "Android: Chrome en un teléfono con ARCore. iPhone: Safari. Úsalo detenido, en un lugar abierto y seguro.",
      reg,
      8.5,
      10 * MM,
      rgb(0.35, 0.35, 0.35),
    );
  }

  // Una hoja por cuerpo, con el código grande.
  for (const it of items) {
    const page = pdf.addPage(A4);
    centered(page, "Realidad aumentada", reg, 16, A4[1] - 30 * MM, rgb(0.3, 0.3, 0.3));
    centered(page, it.name, bold, 60, A4[1] - 56 * MM);
    const q = 130 * MM;
    page.drawImage(await pdf.embedPng(it.png), { x: (A4[0] - q) / 2, y: 88 * MM, width: q, height: q });
    centered(page, "Escanea con la cámara de tu teléfono", bold, 16, 74 * MM);
    centered(page, "y pulsa «Ver en realidad aumentada».", reg, 14, 66 * MM);
    centered(page, `Lo verás al tamaño del recorrido: ${it.size} de diámetro.`, reg, 12, 54 * MM);
    centered(page, it.url, reg, 9.5, 40 * MM, rgb(0.3, 0.3, 0.3));
    centered(
      page,
      "Android: Chrome en un teléfono con ARCore. iPhone: Safari. Detente en un lugar abierto y seguro.",
      reg,
      8.5,
      18 * MM,
      rgb(0.4, 0.4, 0.4),
    );
  }

  const file = join(outDir, "qr-realidad-aumentada.pdf");
  await writeFile(file, await pdf.save());
  console.log(`Listo: ${items.length} códigos verificados.`);
  for (const it of items) console.log(`  ${it.name.padEnd(9)} ${it.url}`);
  console.log(`\nPDF: ${file}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
