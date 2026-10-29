/**
 * Genera los códigos QR de las ocho estaciones.
 *
 *   npm run qr:dev                       (red local: detecta la IP del computador)
 *   npm run qr:dev  -- --base https://abc-123.trycloudflare.com
 *   npm run qr:prod                      (usa NEXT_PUBLIC_SITE_URL)
 *
 * Opciones:
 *   --modo desarrollo|produccion   (lo fija cada script npm)
 *   --base <url>                   URL base. Si se omite: NEXT_PUBLIC_SITE_URL en producción;
 *                                  en desarrollo, http://<IP de la red local>:<puerto>
 *   --puerto <n>                   puerto del servidor local (desarrollo, por defecto 3000)
 *   --out <carpeta>                por defecto artifacts/qr/<modo>
 *
 * En producción la URL debe ser HTTPS, pública y definitiva: se rechazan
 * localhost, direcciones de red local, túneles temporales y dominios de ejemplo.
 */
import { loadEnvConfig } from "@next/env";
import { join, resolve } from "node:path";
import QRCode from "qrcode";
import { generateQrSet } from "./lib";
import { detectLanAddresses } from "../lib/network";
import type { SiteUrlPurpose } from "../../src/config/site";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const modeArg = arg("modo") ?? "desarrollo";
  if (modeArg !== "desarrollo" && modeArg !== "produccion") {
    console.error(`Modo desconocido: ${modeArg}. Usa «desarrollo» o «produccion».`);
    process.exit(2);
  }
  const mode = modeArg as SiteUrlPurpose;
  const outDir = resolve(arg("out") ?? join("artifacts", "qr", mode));

  let base: string | undefined = arg("base");
  if (mode === "produccion") {
    // Carga .env, .env.production y .env.production.local como lo hace `next build`.
    loadEnvConfig(process.cwd(), false);
    base ??= process.env.NEXT_PUBLIC_SITE_URL;
  } else if (!base) {
    // Desarrollo sin --base: la dirección del computador en la red local.
    const lan = detectLanAddresses();
    const port = arg("puerto") ?? "3000";
    if (lan.length === 0) {
      console.error("No se encontró una dirección de red local. Conecta el computador al Wi-Fi o indica la URL:");
      console.error("  npm run qr:dev -- --base https://abc-123.trycloudflare.com");
      process.exit(1);
    }
    base = `http://${lan[0]!.address}:${port}`;
    console.log(`Dirección detectada en la red local: ${lan[0]!.address} (${lan[0]!.name})`);
    if (lan.length > 1) {
      console.log(
        `  Otras: ${lan
          .slice(1)
          .map((a) => `${a.address} (${a.name})`)
          .join(", ")}`,
      );
      console.log("  Si el teléfono no abre los códigos, usa otra con --base http://<IP>:3000");
    }
  }

  console.log(`Generando QR (${mode}) para: ${base ?? "(sin URL)"}`);
  const result = await generateQrSet({ baseUrl: base, mode, outDir });
  for (const w of result.warnings) console.warn(`  Aviso: ${w}`);
  if (!result.ok) {
    for (const e of result.errors) console.error(`  Error: ${e}`);
    if (mode === "produccion") {
      console.error("\nConfigura la URL definitiva en .env.production.local, por ejemplo:");
      console.error("  NEXT_PUBLIC_SITE_URL=https://sistemasolar.tudominio.cl");
    } else {
      console.error("\nIndica la URL con la que abrirás la app en el teléfono, por ejemplo:");
      console.error("  npm run qr:dev -- --base https://abc-123.trycloudflare.com");
    }
    process.exit(1);
  }
  console.log(`\nListo: ${result.stations.length} códigos verificados en ${outDir}`);
  for (const s of result.stations) console.log(`  ${s.order}. ${s.name.padEnd(9)} ${s.url}`);
  console.log(
    "\nArchivos: png/, svg/, qr-imprimible.pdf, fichas-de-prueba.pdf, manifiesto.json, manifiesto.csv, LEEME.txt",
  );
  if (mode === "desarrollo" && result.baseUrl) {
    console.log("\nEscanea este código con el teléfono para abrir la página de inicio:\n");
    console.log(await QRCode.toString(result.baseUrl, { type: "terminal", small: true, errorCorrectionLevel: "M" }));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
