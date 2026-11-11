/**
 * Utilidades de red para los scripts de prueba en el teléfono.
 * Solo leen la configuración local del computador; no envían nada.
 */
import { networkInterfaces } from "node:os";

export interface LanAddress {
  name: string;
  address: string;
}

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || (a === 172 && b !== undefined && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

/** Interfaces cuyo nombre sugiere una red virtual (VirtualBox, WSL, Docker, VPN…). */
const VIRTUAL_HINTS = /virtual|vbox|vmware|vethernet|wsl|docker|hyper-v|tailscale|zerotier|loopback|bluetooth/i;

/**
 * Direcciones IPv4 privadas del computador, ordenadas para que la primera sea la
 * más probable de la red Wi-Fi o Ethernet real (192.168.x.x y sin nombres virtuales).
 */
export function detectLanAddresses(): LanAddress[] {
  const found: LanAddress[] = [];
  for (const [name, infos] of Object.entries(networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.family !== "IPv4" || info.internal) continue;
      if (!isPrivateIPv4(info.address)) continue;
      found.push({ name, address: info.address });
    }
  }
  const score = (a: LanAddress) =>
    (VIRTUAL_HINTS.test(a.name) ? 10 : 0) +
    (a.address.startsWith("192.168.") ? 0 : a.address.startsWith("10.") ? 1 : 2);
  return found.sort((x, y) => score(x) - score(y));
}
