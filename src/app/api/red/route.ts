import { networkInterfaces } from "node:os";

/**
 * Direcciones del computador en la red local, para que el simulador de QR pueda
 * generar códigos que el teléfono sí pueda abrir (localhost solo existe en el computador).
 * Solo responde a pedidos hechos desde el propio computador o su red local; en un
 * servicio público (Vercel, etc.) no hay red local y devuelve una lista vacía.
 */
export const dynamic = "force-dynamic";

const VIRTUAL = /virtual|vbox|vmware|vethernet|wsl|docker|hyper-v|tailscale|zerotier|loopback|bluetooth/i;

function isPrivate(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || (a === 172 && b !== undefined && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

export async function GET(request: Request) {
  const host = request.headers.get("host") ?? "";
  const hostName = host.replace(/:\d+$/, "");
  const port = host.match(/:(\d+)$/)?.[1] ?? "";
  // Solo tiene sentido (y es seguro) cuando se abre desde el propio equipo o una IP privada.
  const local = hostName === "localhost" || hostName === "127.0.0.1" || hostName === "[::1]" || isPrivate(hostName);
  const found: { name: string; address: string }[] = [];
  if (local) {
    for (const [name, infos] of Object.entries(networkInterfaces())) {
      for (const info of infos ?? []) {
        if (info.family === "IPv4" && !info.internal && isPrivate(info.address))
          found.push({ name, address: info.address });
      }
    }
  }
  // Redes virtuales habituales (VirtualBox 192.168.56.x, Docker 172.17.x) van al final; Wi-Fi primero.
  const score = (a: { name: string; address: string }) =>
    (VIRTUAL.test(a.name) || /^192.168.(56|99)./.test(a.address) || /^172.(17|18)./.test(a.address) ? 10 : 0) +
    (/wi-?fi|wlan|wireless|inal[aá]mbric/i.test(a.name) ? -5 : 0) +
    (a.address.startsWith("192.168.") ? 0 : a.address.startsWith("10.") ? 1 : 2);
  found.sort((x, y) => score(x) - score(y));
  return Response.json({ port, addresses: found }, { headers: { "Cache-Control": "no-store" } });
}
