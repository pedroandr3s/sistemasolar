import * as THREE from "three";

/**
 * Material procedural del Sol: granulación animada con ruido y oscurecimiento
 * hacia el borde (limb darkening). Es una representación visual, no una
 * imagen real de la superficie solar.
 */
export function createSunMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      void main() {
        vPos = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormalV = normalize(normalMatrix * normal);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vPos;
      varying vec3 vNormalV;
      varying vec3 vViewDir;

      vec3 hash3(vec3 p) {
        p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
        return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
      }
      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        vec3 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(dot(hash3(i + vec3(0,0,0)), f - vec3(0,0,0)), dot(hash3(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                       mix(dot(hash3(i + vec3(0,1,0)), f - vec3(0,1,0)), dot(hash3(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
                   mix(mix(dot(hash3(i + vec3(0,0,1)), f - vec3(0,0,1)), dot(hash3(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                       mix(dot(hash3(i + vec3(0,1,1)), f - vec3(0,1,1)), dot(hash3(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
      }
      float fbm(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p *= 2.03;
          a *= 0.5;
        }
        return v;
      }
      void main() {
        vec3 p = normalize(vPos);
        float t = uTime * 0.03;
        float g = fbm(p * 9.0 + vec3(t, -t * 0.7, t * 0.4));
        float big = fbm(p * 2.2 - vec3(t * 0.3));
        float n = 0.55 + 0.6 * g + 0.25 * big;
        vec3 deep = vec3(0.86, 0.33, 0.06);
        vec3 mid = vec3(1.0, 0.62, 0.16);
        vec3 hot = vec3(1.0, 0.9, 0.62);
        vec3 col = mix(deep, mid, smoothstep(0.25, 0.65, n));
        col = mix(col, hot, smoothstep(0.62, 0.95, n));
        float mu = clamp(dot(normalize(vNormalV), normalize(vViewDir)), 0.0, 1.0);
        float limb = 0.38 + 0.62 * pow(mu, 0.55);
        gl_FragColor = vec4(col * limb, 1.0);
      }
    `,
  });
}

/** Textura radial para el resplandor (generada en un canvas, sin archivos externos). */
export function createGlowTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255, 200, 110, 0.55)");
    g.addColorStop(0.35, "rgba(255, 160, 60, 0.18)");
    g.addColorStop(1, "rgba(255, 140, 40, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------------------------------------------------------------------------
// Versión «horneada» (sin animación), para formatos que no admiten shaders
// propios: el exportador USDZ (AR Quick Look en iPhone) solo entiende materiales
// PBR estándar, así que aquí se reproduce en JavaScript, una sola vez, el mismo
// ruido y la misma rampa de color del shader de arriba, y se guarda en una
// textura equirectangular normal (map/emissiveMap).
// ---------------------------------------------------------------------------

function hash3Js(x: number, y: number, z: number): [number, number, number] {
  const d1 = x * 127.1 + y * 311.7 + z * 74.7;
  const d2 = x * 269.5 + y * 183.3 + z * 246.1;
  const d3 = x * 113.5 + y * 271.9 + z * 124.6;
  const frac = (v: number) => v - Math.floor(v);
  const s = (v: number) => -1 + 2 * frac(Math.sin(v) * 43758.5453123);
  return [s(d1), s(d2), s(d3)];
}

function noise3Js(px: number, py: number, pz: number): number {
  const ix = Math.floor(px);
  const iy = Math.floor(py);
  const iz = Math.floor(pz);
  const fx = px - ix;
  const fy = py - iy;
  const fz = pz - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const uz = fz * fz * (3 - 2 * fz);
  const grad = (cx: number, cy: number, cz: number) => {
    const [gx, gy, gz] = hash3Js(ix + cx, iy + cy, iz + cz);
    return gx * (fx - cx) + gy * (fy - cy) + gz * (fz - cz);
  };
  const n000 = grad(0, 0, 0);
  const n100 = grad(1, 0, 0);
  const n010 = grad(0, 1, 0);
  const n110 = grad(1, 1, 0);
  const n001 = grad(0, 0, 1);
  const n101 = grad(1, 0, 1);
  const n011 = grad(0, 1, 1);
  const n111 = grad(1, 1, 1);
  const nx00 = n000 + (n100 - n000) * ux;
  const nx10 = n010 + (n110 - n010) * ux;
  const nx01 = n001 + (n101 - n001) * ux;
  const nx11 = n011 + (n111 - n011) * ux;
  const nxy0 = nx00 + (nx10 - nx00) * uy;
  const nxy1 = nx01 + (nx11 - nx01) * uy;
  return nxy0 + (nxy1 - nxy0) * uz;
}

function fbm3Js(px: number, py: number, pz: number): number {
  let v = 0;
  let a = 0.5;
  let x = px;
  let y = py;
  let z = pz;
  for (let i = 0; i < 5; i++) {
    v += a * noise3Js(x, y, z);
    x *= 2.03;
    y *= 2.03;
    z *= 2.03;
    a *= 0.5;
  }
  return v;
}

function smoothstepJs(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Textura equirectangular estática de la granulación solar, calculada en JavaScript
 * (sin GPU) con el mismo ruido y la misma rampa de color que `createSunMaterial`.
 * Se usa como `map`/`emissiveMap` en un `MeshStandardMaterial` para AR Quick Look,
 * donde el modelo se exporta a USDZ y no puede llevar un `ShaderMaterial` propio.
 */
export function bakeSunTexture(width = 480, height = 240): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const image = ctx.createImageData(width, height);
    const deep = [0.86, 0.33, 0.06];
    const mid = [1.0, 0.62, 0.16];
    const hot = [1.0, 0.9, 0.62];
    for (let py = 0; py < height; py++) {
      const v = py / (height - 1);
      const lat = (0.5 - v) * Math.PI;
      const cosLat = Math.cos(lat);
      const sinLat = Math.sin(lat);
      for (let px = 0; px < width; px++) {
        const u = px / (width - 1);
        const lon = (u - 0.5) * Math.PI * 2;
        const x = cosLat * Math.cos(lon);
        const y = sinLat;
        const z = cosLat * Math.sin(lon);
        const g = fbm3Js(x * 9, y * 9, z * 9);
        const big = fbm3Js(x * 2.2, y * 2.2, z * 2.2);
        const n = 0.55 + 0.6 * g + 0.25 * big;
        const t1 = smoothstepJs(0.25, 0.65, n);
        const t2 = smoothstepJs(0.62, 0.95, n);
        let r = deep[0]! + (mid[0]! - deep[0]!) * t1;
        let gc = deep[1]! + (mid[1]! - deep[1]!) * t1;
        let b = deep[2]! + (mid[2]! - deep[2]!) * t1;
        r += (hot[0]! - r) * t2;
        gc += (hot[1]! - gc) * t2;
        b += (hot[2]! - b) * t2;
        const i = (py * width + px) * 4;
        image.data[i] = Math.round(Math.min(1, r) * 255);
        image.data[i + 1] = Math.round(Math.min(1, gc) * 255);
        image.data[i + 2] = Math.round(Math.min(1, b) * 255);
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
