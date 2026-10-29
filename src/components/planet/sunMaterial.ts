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
