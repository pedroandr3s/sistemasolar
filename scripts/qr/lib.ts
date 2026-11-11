/**
 * Generación reproducible de los códigos QR de las estaciones.
 * Usado por scripts/qr/generate.ts (línea de comandos) y por las pruebas.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { STATIONS } from "../../src/config/stations";
import { BODIES } from "../../src/data/bodies";
import { stationPath, stationUrl, validateSiteUrl, type SiteUrlPurpose } from "../../src/config/site";

export interface QrOptions {
  baseUrl: string | null | undefined;
  mode: SiteUrlPurpose;
  outDir: string;
  /** Fecha fija para resultados reproducibles en pruebas. */
  now?: Date;
}

export interface QrStationResult {
  id: string;
  name: string;
  order: number;
  body: string;
  url: string;
  path: string;
  png: string;
  svg: string;
  svgLabeled: string;
  pngSha256: string;
}

export interface QrResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  baseUrl: string | null;
  stations: QrStationResult[];
  files: string[];
}

const ECC = "Q" as const; // corrección de errores ~25 %: tolera suciedad y desgaste al aire libre
const MARGIN = 4; // zona silenciosa de 4 módulos (mínimo recomendado por la norma)
const PNG_WIDTH = 1200;

const MM = 72 / 25.4; // puntos PDF por milímetro

/** pdf-lib con fuentes estándar usa WinAnsi: se reemplazan los caracteres que no admite. */
function pdfText(s: string): string {
  return s
    .replace(/[–—]/g, "-")
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/→/g, "->")
    .replace(/[^\x20-\x7E -ÿ]/g, "");
}

function drawCentered(page: PDFPage, text: string, font: PDFFont, size: number, y: number, color = rgb(0, 0, 0)) {
  const t = pdfText(text);
  const w = font.widthOfTextAtSize(t, size);
  page.drawText(t, { x: (page.getWidth() - w) / 2, y, size, font, color });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = pdfText(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Corta una URL (sin espacios) en líneas, de preferencia después de «/». */
function wrapUrl(url: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let rest = pdfText(url);
  while (rest.length) {
    if (font.widthOfTextAtSize(rest, size) <= maxWidth) {
      lines.push(rest);
      break;
    }
    let cut = rest.length;
    while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth) cut--;
    const slash = rest.lastIndexOf("/", cut - 1);
    if (slash > cut * 0.5) cut = slash + 1;
    lines.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  return lines;
}

function decodePng(buffer: Buffer): string | null {
  const png = PNG.sync.read(buffer);
  const code = jsQR(
    new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.length),
    png.width,
    png.height,
  );
  return code?.data ?? null;
}

/** SVG del QR con el nombre de la estación debajo (para imprenta). */
function labeledSvg(qrSvg: string, name: string, url: string): string {
  const viewBox = qrSvg.match(/viewBox="0 0 (\d+) (\d+)"/);
  const size = viewBox ? Number(viewBox[1]) : 41;
  const inner = qrSvg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const labelH = size * 0.32;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size + labelH}" shape-rendering="crispEdges">
  <rect width="${size}" height="${size + labelH}" fill="#ffffff"/>
  <g>${inner}</g>
  <text x="${size / 2}" y="${size + labelH * 0.5}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${(size * 0.12).toFixed(2)}" fill="#000000">${esc(name)}</text>
  <text x="${size / 2}" y="${size + labelH * 0.85}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${(size * 0.045).toFixed(2)}" fill="#333333">${esc(url)}</text>
</svg>
`;
}

export async function generateQrSet(opts: QrOptions): Promise<QrResult> {
  const check = validateSiteUrl(opts.baseUrl, opts.mode);
  const result: QrResult = {
    ok: false,
    errors: [...check.errors],
    warnings: [...check.warnings],
    baseUrl: check.url,
    stations: [],
    files: [],
  };
  if (!check.ok || !check.url) return result;
  const base = check.url;
  const now = opts.now ?? new Date();
  const out = opts.outDir;

  await rm(out, { recursive: true, force: true });
  await mkdir(join(out, "png"), { recursive: true });
  await mkdir(join(out, "svg"), { recursive: true });

  const stations = [...STATIONS].sort((a, b) => a.order - b.order);
  const pngBuffers = new Map<string, Buffer>();

  for (const s of stations) {
    const url = stationUrl(base, s.id);
    const png = await QRCode.toBuffer(url, {
      errorCorrectionLevel: ECC,
      margin: MARGIN,
      width: PNG_WIDTH,
      color: { dark: "#000000", light: "#ffffff" },
    });
    const decoded = decodePng(png);
    if (decoded !== url) {
      result.errors.push(`El QR de ${s.name} no se pudo verificar (leído: ${decoded ?? "nada"}).`);
      continue;
    }
    const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: ECC, margin: MARGIN });
    const pngName = `png/qr-${s.order + 1}-${s.id}.png`;
    const svgName = `svg/qr-${s.order + 1}-${s.id}.svg`;
    const svgLabeledName = `svg/qr-${s.order + 1}-${s.id}-con-nombre.svg`;
    await writeFile(join(out, pngName), png);
    await writeFile(join(out, svgName), svg);
    await writeFile(join(out, svgLabeledName), labeledSvg(svg, s.name, url));
    pngBuffers.set(s.id, png);
    result.stations.push({
      id: s.id,
      name: s.name,
      order: s.order + 1,
      body: BODIES[s.bodyId].name,
      url,
      path: stationPath(s.id),
      png: pngName,
      svg: svgName,
      svgLabeled: svgLabeledName,
      pngSha256: createHash("sha256").update(png).digest("hex"),
    });
    result.files.push(pngName, svgName, svgLabeledName);
  }
  if (result.errors.length) return result;

  const modeLabel = opts.mode === "produccion" ? "PRODUCCIÓN" : "SOLO PARA PRUEBAS";

  // ---------------------------------------------------------------- PDF imprimible
  {
    const pdf = await PDFDocument.create();
    pdf.setTitle("Códigos QR - Sistema solar a escala San Carlos-San Fabián");
    pdf.setCreationDate(now);
    pdf.setModificationDate(now);
    pdf.setProducer("sistema-solar scripts/qr");
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const reg = await pdf.embedFont(StandardFonts.Helvetica);
    const A4: [number, number] = [210 * MM, 297 * MM];

    // Hoja de contactos
    const sheet = pdf.addPage(A4);
    drawCentered(sheet, "Sistema solar a escala San Carlos - San Fabián", bold, 15, A4[1] - 20 * MM);
    drawCentered(sheet, `Códigos QR de las estaciones (${modeLabel})`, reg, 10, A4[1] - 27 * MM);
    const cols = 2;
    const cell = { w: 85 * MM, h: 60 * MM };
    for (const [i, st] of result.stations.entries()) {
      const img = await pdf.embedPng(pngBuffers.get(st.id)!);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x0 = 20 * MM + col * (cell.w + 10 * MM);
      const y0 = A4[1] - 38 * MM - (row + 1) * cell.h;
      const q = 42 * MM;
      sheet.drawImage(img, { x: x0, y: y0 + 12 * MM, width: q, height: q });
      sheet.drawText(pdfText(`${st.order}. ${st.name}`), { x: x0 + q + 4 * MM, y: y0 + 44 * MM, size: 13, font: bold });
      const lines = wrapUrl(st.url, reg, 7.5, cell.w - q - 6 * MM);
      lines.forEach((l, li) =>
        sheet.drawText(l, { x: x0 + q + 4 * MM, y: y0 + 38 * MM - li * 9, size: 7.5, font: reg }),
      );
    }
    sheet.drawText(pdfText(`Generado: ${now.toISOString().slice(0, 16).replace("T", " ")} UTC | Base: ${base}`), {
      x: 20 * MM,
      y: 12 * MM,
      size: 7,
      font: reg,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Una página grande por estación (panel informativo)
    for (const st of result.stations) {
      const page = pdf.addPage(A4);
      const img = await pdf.embedPng(pngBuffers.get(st.id)!);
      const q = 140 * MM;
      page.drawImage(img, { x: (A4[0] - q) / 2, y: 95 * MM, width: q, height: q });
      drawCentered(page, st.name, bold, 44, 70 * MM);
      drawCentered(page, "Escanea con la cámara de tu teléfono", reg, 14, 58 * MM);
      drawCentered(page, st.url, reg, 10, 48 * MM, rgb(0.25, 0.25, 0.25));
      if (opts.mode !== "produccion") {
        drawCentered(page, "SOLO PARA PRUEBAS - NO INSTALAR", bold, 16, A4[1] - 25 * MM, rgb(0.75, 0.1, 0.1));
      }
      drawCentered(page, `Estación ${st.order} de ${result.stations.length}`, reg, 9, 20 * MM, rgb(0.4, 0.4, 0.4));
    }
    const bytes = await pdf.save();
    await writeFile(join(out, "qr-imprimible.pdf"), bytes);
    result.files.push("qr-imprimible.pdf");
  }

  // ---------------------------------------------------------------- Fichas de prueba
  {
    const pdf = await PDFDocument.create();
    pdf.setTitle("Fichas de prueba de los códigos QR");
    pdf.setCreationDate(now);
    pdf.setModificationDate(now);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const reg = await pdf.embedFont(StandardFonts.Helvetica);
    const A4: [number, number] = [210 * MM, 297 * MM];
    const perPage = 3;
    for (let i = 0; i < result.stations.length; i += perPage) {
      const page = pdf.addPage(A4);
      drawCentered(page, `Fichas de prueba de QR (${modeLabel})`, bold, 12, A4[1] - 14 * MM);
      result.stations.slice(i, i + perPage).forEach((st, k) => {
        const top = A4[1] - 22 * MM - k * 90 * MM;
        page.drawRectangle({
          x: 15 * MM,
          y: top - 84 * MM,
          width: 180 * MM,
          height: 84 * MM,
          borderColor: rgb(0.6, 0.6, 0.6),
          borderWidth: 0.8,
        });
        page.drawText(pdfText(`${st.order}. ${st.name}`), { x: 80 * MM, y: top - 14 * MM, size: 16, font: bold });
        wrapUrl(`URL: ${st.url}`, reg, 9, 108 * MM).forEach((l, li) =>
          page.drawText(l, { x: 80 * MM, y: top - 22 * MM - li * 11, size: 9, font: reg }),
        );
        const expected = `Resultado esperado: se abre la página de la estación ${st.name} (${st.path}) con el modelo 3D de ${st.body}, su nombre y el acceso a la siguiente estación.`;
        wrapText(expected, reg, 9, 108 * MM).forEach((l, li) =>
          page.drawText(l, { x: 80 * MM, y: top - 36 * MM - li * 11, size: 9, font: reg }),
        );
        const checks = ["Android (cámara nativa)", "iPhone (cámara nativa)", "Se ve el planeta en 3D"];
        checks.forEach((c, ci) => {
          const y = top - 60 * MM - ci * 7 * MM;
          page.drawRectangle({
            x: 80 * MM,
            y: y - 1,
            width: 9,
            height: 9,
            borderColor: rgb(0, 0, 0),
            borderWidth: 0.8,
          });
          page.drawText(pdfText(c), { x: 80 * MM + 14, y, size: 9, font: reg });
        });
        page.drawText(pdfText("Observaciones: ______________________"), {
          x: 140 * MM,
          y: top - 60 * MM,
          size: 8,
          font: reg,
        });
      });
      // Los QR se dibujan aparte (la incrustación es asíncrona)
      for (const [k, st] of result.stations.slice(i, i + perPage).entries()) {
        const top = A4[1] - 22 * MM - k * 90 * MM;
        const img = await pdf.embedPng(pngBuffers.get(st.id)!);
        page.drawImage(img, { x: 20 * MM, y: top - 74 * MM, width: 55 * MM, height: 55 * MM });
      }
    }
    const bytes = await pdf.save();
    await writeFile(join(out, "fichas-de-prueba.pdf"), bytes);
    result.files.push("fichas-de-prueba.pdf");
  }

  // ---------------------------------------------------------------- Manifiesto
  const manifest = {
    proyecto: "Sistema solar a escala San Carlos–San Fabián",
    modo: opts.mode,
    urlBase: base,
    generado: now.toISOString(),
    correccionErrores: ECC,
    margenModulos: MARGIN,
    anchoPngPx: PNG_WIDTH,
    estaciones: result.stations,
  };
  await writeFile(join(out, "manifiesto.json"), JSON.stringify(manifest, null, 2) + "\n");
  const csvRows = [
    ["orden", "id", "nombre", "url", "png", "svg", "svg_con_nombre", "sha256_png"],
    ...result.stations.map((s) => [String(s.order), s.id, s.name, s.url, s.png, s.svg, s.svgLabeled, s.pngSha256]),
  ];
  // BOM UTF-8 al inicio: sin él, Excel en Windows muestra «JÃºpiter» en vez de «Júpiter».
  await writeFile(
    join(out, "manifiesto.csv"),
    "\uFEFF" + csvRows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\r\n") + "\r\n",
  );
  result.files.push("manifiesto.json", "manifiesto.csv");

  const readme = `CÓDIGOS QR — ${opts.mode === "produccion" ? "PRODUCCIÓN" : "DESARROLLO (solo pruebas)"}
=============================================================

URL base: ${base}
Generados: ${now.toISOString()}
Corrección de errores: ${ECC} (≈25 %). Margen: ${MARGIN} módulos.

Contenido
- png/  Un PNG de ${PNG_WIDTH} px por estación (para imprimir hasta ~15 cm sin perder nitidez).
- svg/  Un SVG vectorial por estación, y una versión con el nombre debajo (-con-nombre.svg).
- qr-imprimible.pdf    Hoja de contactos + una página A4 por estación.
- fichas-de-prueba.pdf Fichas para registrar la prueba con Android y iPhone.
- manifiesto.json / manifiesto.csv  Estación, nombre, URL y archivo de cada código.

Cada PNG se verificó automáticamente: se decodificó y su contenido coincide con la URL.

Recomendaciones de impresión
- Tamaño mínimo del código: 3 cm de lado para leer a ~30 cm; para un panel visto a 1 m, al menos 10 cm.
- Imprimir en negro sobre blanco, sin logotipos encima ni recortes de la zona blanca exterior.
- Usar material mate y resistente a la intemperie (los reflejos dificultan la lectura).
- Probar cada código impreso con la cámara nativa de un Android y de un iPhone antes de instalar.

Para regenerar
- Desarrollo: npm run qr:dev -- --base https://TU-TUNEL.trycloudflare.com
- Producción: configura NEXT_PUBLIC_SITE_URL=https://tu-dominio.cl en .env.production.local y ejecuta npm run qr:prod
`;
  await writeFile(join(out, "LEEME.txt"), readme);
  result.files.push("LEEME.txt");

  result.ok = true;
  return result;
}

/** Decodifica un PNG del conjunto (usado por las pruebas). */
export async function decodeQrFile(path: string): Promise<string | null> {
  return decodePng(await readFile(path));
}
