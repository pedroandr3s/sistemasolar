import * as THREE from "three";

/** Ruido precalculado de la superficie del Sol (lo genera scripts/textures/sun-noise.ts). */
export const SUN_NOISE_URL = "/textures/sun_noise.webp";

/**
 * Material del Sol para el visualizador: granulación animada y oscurecimiento hacia
 * el borde. Es una representación visual, no una imagen real de la superficie solar.
 *
 * El ruido viene de una textura precalculada (dos lecturas por píxel) en vez de
 * calcularse en la GPU en cada cuadro: en teléfonos, la versión anterior evaluaba diez
 * veces un ruido 3D por píxel, lo que hacía lento el modelo, y su generador de números
 * basado en sin() dejaba defectos visibles en algunas GPU. La animación sale de
 * deslizar dos capas del ruido en sentidos opuestos. Mientras la textura carga
 * (uReady = 0) se muestra un disco liso con el borde oscurecido.
 */
export function createSunMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uNoise: { value: null }, uReady: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormalV = normalize(normalMatrix * normal);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform sampler2D uNoise;
      uniform float uReady;
      varying vec2 vUv;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      void main() {
        float t = uTime * 0.004;
        vec3 a = texture2D(uNoise, vUv + vec2(t, 0.0)).rgb;
        vec3 b = texture2D(uNoise, vUv + vec2(0.37 - t * 0.7, 0.0)).rgb;
        // La textura guarda el ruido como (valor * 0,8 + 0,5).
        float g = ((a.r + b.b) * 0.5 - 0.5) * 1.75;
        float big = (b.g - 0.5) * 1.25;
        float n = mix(0.6, 0.55 + 0.6 * g + 0.25 * big, uReady);
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

/** Carga el ruido del Sol y lo entrega listo para el material (se repite en longitud). */
export function loadSunNoise(onLoad: (texture: THREE.Texture) => void): () => void {
  let cancelled = false;
  let loaded: THREE.Texture | null = null;
  new THREE.TextureLoader().load(SUN_NOISE_URL, (texture) => {
    if (cancelled) return texture.dispose();
    texture.wrapS = THREE.RepeatWrapping;
    texture.colorSpace = THREE.NoColorSpace;
    loaded = texture;
    onLoad(texture);
  });
  return () => {
    cancelled = true;
    loaded?.dispose();
  };
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

// ---------------------------------------------------------------------------
// Sol para realidad aumentada (WebXR)
// ---------------------------------------------------------------------------
// En AR el Sol se ve sobre la imagen de la cámara (clara, sin fondo oscuro ni
// mapeo de tonos), así que el material del visualizador queda sin contraste y
// se percibe como un disco de un solo color. Este material usa el mismo
// principio (ruido procedural, sin archivos), pero con mucho más rango:
// celdas de granulación con bordes oscuros, manchas solares, zonas brillantes
// y un oscurecimiento del borde marcado, que es lo que da volumen de esfera.
// El generador de números pseudoaleatorios no usa sin(), que pierde precisión
// en algunas GPU de teléfonos y deja el ruido plano.

const SUN_NOISE_GLSL = /* glsl */ `
  vec3 hash33(vec3 p) {
    p = fract(p * vec3(0.1031, 0.1030, 0.0973));
    p += dot(p, p.yxz + 33.33);
    return fract((p.xxy + p.yxx) * p.zyx) * 2.0 - 1.0;
  }
  float gnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dot(hash33(i), f), dot(hash33(i + vec3(1,0,0)), f - vec3(1,0,0)), u.x),
                   mix(dot(hash33(i + vec3(0,1,0)), f - vec3(0,1,0)), dot(hash33(i + vec3(1,1,0)), f - vec3(1,1,0)), u.x), u.y),
               mix(mix(dot(hash33(i + vec3(0,0,1)), f - vec3(0,0,1)), dot(hash33(i + vec3(1,0,1)), f - vec3(1,0,1)), u.x),
                   mix(dot(hash33(i + vec3(0,1,1)), f - vec3(0,1,1)), dot(hash33(i + vec3(1,1,1)), f - vec3(1,1,1)), u.x), u.y), u.z);
  }
  float fbm3(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * gnoise(p);
      p = p * 2.07 + 11.3;
      a *= 0.5;
    }
    return v;
  }
`;

/** Superficie del Sol para AR: alto contraste, manchas, granulación y borde oscurecido. */
export function createSunArMaterial(): THREE.ShaderMaterial {
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
      precision highp float;
      uniform float uTime;
      varying vec3 vPos;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      ${SUN_NOISE_GLSL}

      vec3 ramp(float t) {
        vec3 c0 = vec3(0.16, 0.02, 0.0);
        vec3 c1 = vec3(0.72, 0.13, 0.01);
        vec3 c2 = vec3(1.0, 0.44, 0.05);
        vec3 c3 = vec3(1.0, 0.76, 0.28);
        vec3 c4 = vec3(1.0, 0.96, 0.8);
        vec3 c = mix(c0, c1, smoothstep(0.0, 0.25, t));
        c = mix(c, c2, smoothstep(0.25, 0.5, t));
        c = mix(c, c3, smoothstep(0.5, 0.75, t));
        return mix(c, c4, smoothstep(0.75, 1.0, t));
      }

      void main() {
        vec3 p = normalize(vPos);
        float t = uTime;

        // Flujo lento del plasma: deforma el dominio para que nada quede rígido.
        vec3 warp = vec3(
          gnoise(p * 2.3 + vec3(0.0, t * 0.021, 0.0)),
          gnoise(p * 2.3 + vec3(7.3, 0.0, -t * 0.017)),
          gnoise(p * 2.3 + vec3(t * 0.019, 13.7, 0.0))
        );
        vec3 q = p + 0.14 * warp;

        // Celdas de granulación: brillantes al centro, con bordes oscuros.
        float n1 = gnoise(q * 21.0 + vec3(0.0, 0.0, t * 0.09));
        float n2 = gnoise(q * 46.0 + vec3(t * 0.13, 5.1, 0.0));
        float cells = smoothstep(0.0, 0.1, abs(n1)) * 0.6 + smoothstep(0.0, 0.14, abs(n2)) * 0.4;

        // Grandes regiones más calientes y más frías.
        float big = fbm3(q * 1.7 + vec3(-t * 0.008, 0.0, t * 0.006));

        // Manchas solares, en dos franjas a cada lado del ecuador.
        float lat = abs(p.y);
        float belt = smoothstep(0.03, 0.14, lat) * (1.0 - smoothstep(0.5, 0.72, lat));
        float s = gnoise(p * 3.4 + vec3(41.0, t * 0.003, 17.0)) + 0.35 * gnoise(p * 9.0 + vec3(3.0, 0.0, t * 0.01));
        float penumbra = smoothstep(0.34, 0.46, s) * belt;
        float umbra = smoothstep(0.47, 0.56, s) * belt;
        float faculae = smoothstep(0.16, 0.34, s) * (1.0 - penumbra) * belt;

        float heat = 0.56 + 0.8 * big + 0.2 * (cells - 0.7) + 0.2 * faculae;
        heat = mix(heat, 0.2, penumbra * 0.85);
        heat = mix(heat, 0.02, umbra);
        vec3 col = ramp(clamp(heat, 0.0, 1.0));

        // Oscurecimiento y enrojecimiento hacia el borde: da volumen de esfera.
        float mu = clamp(dot(normalize(vNormalV), normalize(vViewDir)), 0.0, 1.0);
        float limb = 0.22 + 0.78 * pow(mu, 0.62);
        col *= limb;
        col.g *= mix(0.72, 1.0, mu);
        col.b *= mix(0.45, 1.0, mu);
        // Un hilo de luz en el contorno, que enlaza con la corona.
        col += vec3(1.0, 0.42, 0.08) * pow(1.0 - mu, 5.0) * 0.5;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/**
 * Corona para AR: una esfera mayor que el Sol, vista por dentro, cuyo brillo depende
 * de la distancia entre cada rayo de visión y el centro del Sol (cálculo analítico).
 * No usa «sprites» ni depende del búfer de profundidad: dentro del disco solar se
 * descarta, y hacia afuera se desvanece con rayos irregulares que cambian lentamente.
 */
export function createCoronaMaterial(innerRadius: number, outerRadius: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uInner: { value: innerRadius },
      uOuter: { value: outerRadius },
    },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      varying vec3 vView;
      varying vec3 vCenter;
      void main() {
        vPos = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = mv.xyz;
        vCenter = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uTime;
      uniform float uInner;
      uniform float uOuter;
      varying vec3 vPos;
      varying vec3 vView;
      varying vec3 vCenter;
      ${SUN_NOISE_GLSL}
      void main() {
        vec3 rd = normalize(vView);
        float along = dot(vCenter, rd);
        float d = length(vCenter - rd * along);
        if (d < uInner * 0.992) discard;
        float fall = clamp((d - uInner) / (uOuter - uInner), 0.0, 1.0);
        vec3 dir = normalize(vPos);
        float rays = fbm3(dir * 2.6 + vec3(0.0, uTime * 0.02, 0.0)) + 0.5 * gnoise(dir * 7.0 + vec3(uTime * 0.03, 0.0, 0.0));
        float reach = clamp(0.62 + 1.5 * rays, 0.2, 1.6);
        float glow = exp(-fall * 5.2 / reach) * (1.0 - smoothstep(0.7, 1.0, fall));
        vec3 col = mix(vec3(1.0, 0.86, 0.55), vec3(1.0, 0.4, 0.08), smoothstep(0.0, 0.45, fall));
        gl_FragColor = vec4(col, clamp(glow * 0.95, 0.0, 1.0));
      }
    `,
  });
}
