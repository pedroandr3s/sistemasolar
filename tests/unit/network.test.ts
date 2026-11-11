import { describe, expect, it, vi } from "vitest";
import type { NetworkInterfaceInfo } from "node:os";

const fakeInterfaces: Record<string, NetworkInterfaceInfo[]> = {
  "Loopback Pseudo-Interface 1": [
    {
      address: "127.0.0.1",
      netmask: "255.0.0.0",
      family: "IPv4",
      mac: "00:00:00:00:00:00",
      internal: true,
      cidr: "127.0.0.1/8",
    },
  ],
  "vEthernet (WSL)": [
    {
      address: "172.24.80.1",
      netmask: "255.255.240.0",
      family: "IPv4",
      mac: "00:15:5d:00:00:01",
      internal: false,
      cidr: "172.24.80.1/20",
    },
  ],
  "Ethernet 2 (VirtualBox Host-Only Network)": [
    {
      address: "192.168.56.1",
      netmask: "255.255.255.0",
      family: "IPv4",
      mac: "0a:00:27:00:00:02",
      internal: false,
      cidr: "192.168.56.1/24",
    },
  ],
  "Wi-Fi": [
    {
      address: "fe80::1",
      netmask: "ffff:ffff:ffff:ffff::",
      family: "IPv6",
      mac: "aa:bb:cc:dd:ee:ff",
      internal: false,
      cidr: "fe80::1/64",
      scopeid: 7,
    },
    {
      address: "192.168.1.34",
      netmask: "255.255.255.0",
      family: "IPv4",
      mac: "aa:bb:cc:dd:ee:ff",
      internal: false,
      cidr: "192.168.1.34/24",
    },
  ],
  "Conexión pública": [
    {
      address: "200.1.2.3",
      netmask: "255.255.255.0",
      family: "IPv4",
      mac: "aa:bb:cc:dd:ee:00",
      internal: false,
      cidr: "200.1.2.3/24",
    },
  ],
};

vi.mock("node:os", async (orig) => ({
  ...(await orig<typeof import("node:os")>()),
  networkInterfaces: () => fakeInterfaces,
}));

describe("detección de la IP de la red local (QR de desarrollo)", () => {
  it("prefiere la red Wi-Fi real y descarta loopback, IPv6, direcciones públicas y redes virtuales primero", async () => {
    const { detectLanAddresses } = await import("../../scripts/lib/network");
    const found = detectLanAddresses();
    expect(found[0]).toEqual({ name: "Wi-Fi", address: "192.168.1.34" });
    const addresses = found.map((a) => a.address);
    expect(addresses).not.toContain("127.0.0.1");
    expect(addresses).not.toContain("200.1.2.3");
    expect(addresses).not.toContain("fe80::1");
    // Las virtuales quedan al final, como alternativas.
    expect(addresses.slice(1).sort()).toEqual(["172.24.80.1", "192.168.56.1"]);
  });
});
