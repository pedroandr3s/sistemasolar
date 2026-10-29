"use client";

/**
 * Parte 3D de la realidad aumentada. Se carga de forma diferida desde ./ar
 * únicamente cuando el visitante pulsa «Realidad aumentada».
 */
import * as THREE from "three";
import type { Body } from "@/data/bodies";
import { xr, type XRSessionLike } from "./ar";

function loadTexture(url: string): Promise<THREE.Texture | null> {
  return new THREE.TextureLoader()
    .loadAsync(url)
    .then((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })
    .catch(() => null);
}

/** Modelo sencillo del cuerpo para AR (radio en metros). */
async function buildModel(body: Body, radius: number): Promise<THREE.Group> {
  const group = new THREE.Group();
  const tilt = body.obliquityDeg > 90 ? 180 - body.obliquityDeg : body.obliquityDeg;
  group.rotation.z = (-tilt * Math.PI) / 180;
  const texUrl = body.render.cloudCover ?? body.render.texture?.low;
  const map = texUrl ? await loadTexture(texUrl) : null;
  const material =
    body.id === "sol"
      ? new THREE.MeshBasicMaterial({ color: "#ffb347" })
      : new THREE.MeshStandardMaterial({ map, color: map ? "#ffffff" : body.color, roughness: 1 });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 40), material);
  sphere.scale.y = body.render.polarRatio;
  group.add(sphere);
  const rings = body.render.rings;
  if (rings) {
    const planetR = body.diameterKm / 2;
    const inner = (rings.innerKm / planetR) * radius;
    const outer = (rings.outerKm / planetR) * radius;
    const geo = new THREE.RingGeometry(inner, outer, 128, 1);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
    }
    const ringMap = await loadTexture(rings.texture);
    const ring = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ map: ringMap, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    group.add(ring);
  }
  return group;
}

/** AR Quick Look (iOS): exporta un USDZ y lo abre con el visor del sistema. */
export async function openQuickLook(body: Body): Promise<void> {
  const { USDZExporter } = await import("three/examples/jsm/exporters/USDZExporter.js");
  const scene = new THREE.Scene();
  scene.add(await buildModel(body, 0.25));
  const exporter = new USDZExporter();
  const data = await exporter.parseAsync(scene);
  const blob = new Blob([data as BlobPart], { type: "model/vnd.usdz+zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.rel = "ar";
  a.href = url;
  a.download = `${body.id}.usdz`;
  a.appendChild(document.createElement("img"));
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 60_000);
}

/** WebXR (Android): coloca el cuerpo a 1 m delante del teléfono. */
export async function startWebXR(body: Body, overlay: HTMLElement): Promise<() => void> {
  const sys = xr();
  if (!sys) throw new Error("WebXR no disponible");
  const session = await sys.requestSession("immersive-ar", {
    optionalFeatures: ["dom-overlay", "local-floor"],
    domOverlay: { root: overlay },
  });
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.domElement.style.display = "none";
  document.body.appendChild(renderer.domElement);
  await renderer.xr.setSession(session as XRSessionLike as unknown as XRSession);

  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(-1, 0.5, 1);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera();
  const model = await buildModel(body, 0.18);
  model.position.set(0, 0, -1);
  scene.add(model);

  let placed = false;
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    if (!placed) {
      const cam = renderer.xr.getCamera();
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
      model.position.copy(cam.position).add(dir.multiplyScalar(1));
      placed = true;
    }
    model.children[0]!.rotation.y += dt * 0.3;
    renderer.render(scene, camera);
  });

  const cleanup = () => {
    renderer.setAnimationLoop(null);
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => {
        (x as THREE.MeshStandardMaterial).map?.dispose();
        x.dispose();
      });
    });
    renderer.dispose();
    renderer.domElement.remove();
  };
  session.addEventListener("end", cleanup, { once: true });
  return () => {
    session.end().catch(() => cleanup());
  };
}
