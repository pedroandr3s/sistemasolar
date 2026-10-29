/**
 * Abre un túnel HTTPS temporal de Cloudflare hacia el servidor local y genera
 * los QR de prueba con esa dirección. Sirve para probar GPS, brújula y QR desde
 * el teléfono sin comprar un dominio.
 *
 *   1. En una terminal:  npm run build  y luego  npm start
 *   2. En otra terminal: npm run tunel            (o: npm run tunel -- --puerto 3001)
 *
 * Requiere `cloudflared` instalado (gratuito, sin cuenta):
 *   Windows: winget install --id Cloudflare.cloudflared
 *   macOS:   brew install cloudflared
 *
 * El túnel solo existe mientras esta terminal esté abierta (Ctrl+C para cerrarlo).
 * Su dirección cambia cada vez: este script vuelve a generar los QR en cada inicio.
 */
import { spawn, spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import QRCode from "qrcode";
import { generateQrSet } from "../qr/lib";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const port = Number(arg("puerto") ?? 3000);
// 127.0.0.1 y no «localhost»: en Windows «localhost» puede resolverse a IPv6 (::1)
// y fallar si el servidor solo escucha en IPv4.
const local = `http://127.0.0.1:${port}`;

async function serverIsUp(): Promise<boolean> {
  try {
    const res = await fetch(local, { method: "GET", signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const check = spawnSync("cloudflared", ["--version"], { encoding: "utf8" });
  if (check.error || check.status !== 0) {
    console.error("No se encontró «cloudflared». Instálalo una vez (gratuito, sin cuenta):");
    console.error("  Windows: winget install --id Cloudflare.cloudflared   (luego abre una terminal nueva)");
    console.error("  macOS:   brew install cloudflared");
    console.error(
      "  Otras:   https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/",
    );
    process.exit(1);
  }

  if (!(await serverIsUp())) {
    console.error(`No hay un servidor respondiendo en ${local}.`);
    console.error("En otra terminal ejecuta primero:  npm run build  y luego  npm start");
    console.error("(o «npm run dev» si quieres probar la versión de desarrollo).");
    process.exit(1);
  }

  console.log(`Abriendo un túnel HTTPS hacia ${local}…`);
  const child = spawn("cloudflared", ["tunnel", "--no-autoupdate", "--url", local], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  let announced = false;
  const onData = async (chunk: Buffer) => {
    const text = chunk.toString();
    if (process.argv.includes("--verbose")) process.stderr.write(text);
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (!match || announced) return;
    announced = true;
    const url = match[0];

    const outDir = resolve(join("artifacts", "qr", "desarrollo"));
    const result = await generateQrSet({ baseUrl: url, mode: "desarrollo", outDir });
    console.log(`\nTúnel listo: ${url}`);
    console.log("(Puede tardar unos segundos más en responder la primera vez.)\n");
    if (result.ok) {
      console.log(`QR de prueba regenerados con esta dirección en ${outDir}`);
      for (const s of result.stations) console.log(`  ${s.order}. ${s.name.padEnd(9)} ${s.url}`);
    } else {
      for (const e of result.errors) console.error(`  Error al generar QR: ${e}`);
    }
    console.log(`\nEn el computador, abre ${url}/qr para ver los ocho códigos en pantalla.`);
    console.log("Escanea este código con la cámara del teléfono para abrir la página de inicio:\n");
    console.log(await QRCode.toString(url, { type: "terminal", small: true, errorCorrectionLevel: "M" }));
    console.log("Deja esta terminal abierta mientras pruebas. Ctrl+C cierra el túnel.");
  };
  child.stdout.on("data", onData);
  child.stderr.on("data", onData);

  const stop = () => {
    child.kill("SIGINT");
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  child.on("exit", (code) => {
    if (!announced) console.error("cloudflared terminó antes de entregar una dirección. Prueba con --verbose.");
    else console.log("\nTúnel cerrado. Los QR de prueba ya no funcionarán hasta abrir otro túnel.");
    process.exit(code ?? 0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
