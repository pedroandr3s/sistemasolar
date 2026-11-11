/**
 * Genera public/textures/sun_noise.png: el ruido con que se anima la superficie del
 * Sol en el visualizador 3D. Antes ese ruido se calculaba en la GPU en cada píxel y en
 * cada cuadro (diez evaluaciones de ruido 3D), demasiado para muchos teléfonos. Ahora
 * se calcula una sola vez, aquí, y el shader solo lee la textura dos veces.
 *
 *   npx tsx scripts/textures/sun-noise.ts
 *   (después se convierte a WebP; ver el final de este archivo)
 *
 * Proyección equirectangular de ruido 3D evaluado sobre la esfera: no tiene costura en
 * el meridiano y, al desplazarla en longitud, equivale a girar el patrón sobre el eje.
 *   R: granulación fina · G: regiones grandes · B: segunda capa de granulación
 */
import { writeFileSync } from "node:fs";
import { PNG } from "pngjs";

const W = 512;
const H = 256;

function hash(x: number, y: number, z: number): [number, number, number] {
  const f = (v: number) => v - Math.floor(v);
  let px = f(x * 0.1031);
  let py = f(y * 0.103);
  let pz = f(z * 0.0973);
  const d = px * (py + 33.33) + py * (px + 33.33) + pz * (pz + 33.33);
  px += d;
  py += d;
  pz += d;
  return [f((px + py) * pz) * 2 - 1, f((px + pz) * py) * 2 - 1, f((py + pz) * px) * 2 - 1];
}

function noise(px: number, py: number, pz: number): number {
  const ix = Math.floor(px),
    iy = Math.floor(py),
    iz = Math.floor(pz);
  const fx = px - ix,
    fy = py - iy,
    fz = pz - iz;
  const ux = fx * fx * (3 - 2 * fx),
    uy = fy * fy * (3 - 2 * fy),
    uz = fz * fz * (3 - 2 * fz);
  const g = (cx: number, cy: number, cz: number) => {
    const [gx, gy, gz] = hash(ix + cx, iy + cy, iz + cz);
    return gx * (fx - cx) + gy * (fy - cy) + gz * (fz - cz);
  };
  const x00 = g(0, 0, 0) + (g(1, 0, 0) - g(0, 0, 0)) * ux;
  const x10 = g(0, 1, 0) + (g(1, 1, 0) - g(0, 1, 0)) * ux;
  const x01 = g(0, 0, 1) + (g(1, 0, 1) - g(0, 0, 1)) * ux;
  const x11 = g(0, 1, 1) + (g(1, 1, 1) - g(0, 1, 1)) * ux;
  const y0 = x00 + (x10 - x00) * uy;
  const y1 = x01 + (x11 - x01) * uy;
  return y0 + (y1 - y0) * uz;
}

function fbm(x: number, y: number, z: number, octaves: number): number {
  let v = 0,
    a = 0.5;
  for (let i = 0; i < octaves; i++) {
    v += a * noise(x, y, z);
    x = x * 2.03 + 11.3;
    y = y * 2.03 + 11.3;
    z = z * 2.03 + 11.3;
    a *= 0.5;
  }
  return v;
}

const png = new PNG({ width: W, height: H });
const enc = (v: number) => Math.max(0, Math.min(255, Math.round((v * 0.8 + 0.5) * 255)));
for (let j = 0; j < H; j++) {
  const lat = (0.5 - (j + 0.5) / H) * Math.PI;
  for (let i = 0; i < W; i++) {
    const lon = ((i + 0.5) / W) * Math.PI * 2;
    const x = Math.cos(lat) * Math.cos(lon),
      y = Math.sin(lat),
      z = Math.cos(lat) * Math.sin(lon);
    const k = (j * W + i) * 4;
    png.data[k] = enc(fbm(x * 9 + 40, y * 9 + 40, z * 9 + 40, 4));
    png.data[k + 1] = enc(fbm(x * 2.2 + 20, y * 2.2 + 20, z * 2.2 + 20, 3));
    png.data[k + 2] = enc(fbm(x * 9 + 71.7, y * 9 + 13.1, z * 9 + 55.3, 4));
    png.data[k + 3] = 255;
  }
}
writeFileSync("public/textures/sun_noise.png", PNG.sync.write(png));
console.log("public/textures/sun_noise.png");
// Conversión a WebP (calidad 82), con Pillow:
//   python3 -c "from PIL import Image; Image.open('public/textures/sun_noise.png').save('public/textures/sun_noise.webp', quality=82, method=6)"
