"use client";

/**
 * Parte 3D de la realidad aumentada. Se carga de forma diferida desde ./ar
 * únicamente cuando el visitante pulsa «Realidad aumentada».
 */
import * as THREE from "three";
import type { Body } from "@/data/bodies";
import { arPlacement, quickLookScale, xr, type XRSessionLike } from "./ar";
import { bakeSunTexture, createCoronaMaterial, createSunArMaterial } from "./sunMaterial";

function loadTexture(url: string, color = true): Promise<THREE.Texture | null> {
  return new THREE.TextureLoader()
    .loadAsync(url)
    .then((t) => {
      if (color) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    })
    .catch(() => null);
}

/**
 * Modo del modelo:
 * - «vivo»: se renderiza con three.js (WebXR); puede llevar shaders propios.
 * - «exportar»: se convierte a USDZ (AR Quick Look); el exportador solo admite materiales
 *   PBR estándar, así que el Sol usa una textura horneada en vez del shader.
 */
type BuildMode = "vivo" | "exportar";

/** Materiales que hay que animar en cada cuadro (solo el Sol en modo «vivo»). */
interface Animated {
  time: THREE.ShaderMaterial[];
}

/** Modelo del cuerpo para AR (radio en metros). El primer hijo del grupo es la esfera que gira. */
async function buildModel(
  body: Body,
  radius: number,
  mode: BuildMode,
): Promise<{ group: THREE.Group; animated: Animated }> {
  const group = new THREE.Group();
  const animated: Animated = { time: [] };
  const tilt = body.obliquityDeg > 90 ? 180 - body.obliquityDeg : body.obliquityDeg;
  group.rotation.z = (-tilt * Math.PI) / 180;
  const isSun = body.id === "sol";
  const r = body.render;
  // De cerca y en grande (Júpiter mide casi 2 m) conviene la textura de más resolución.
  const texUrl = r.cloudCover ?? (radius > 0.25 ? r.texture?.high : r.texture?.low);
  const [map, bump] = await Promise.all([
    !isSun && texUrl ? loadTexture(texUrl) : null,
    !isSun && r.bump && !r.cloudCover ? loadTexture(r.bump, false) : null,
  ]);

  let material: THREE.Material;
  if (isSun && mode === "vivo") {
    const sunMaterial = createSunArMaterial();
    animated.time.push(sunMaterial);
    material = sunMaterial;
  } else if (isSun) {
    const baked = bakeSunTexture();
    material = new THREE.MeshStandardMaterial({
      map: baked,
      emissiveMap: baked,
      emissive: new THREE.Color("#ffb347"),
      emissiveIntensity: 1.1,
      roughness: 1,
      metalness: 0,
    });
  } else {
    material = new THREE.MeshStandardMaterial({
      map,
      bumpMap: bump,
      bumpScale: bump ? 2.2 : 0,
      color: map ? "#ffffff" : body.color,
      roughness: 0.95,
      metalness: 0,
    });
  }

  const sphere = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), material);
  sphere.scale.y = r.polarRatio;
  group.add(sphere);

  if (r.clouds && mode === "vivo") {
    const cloudMap = await loadTexture(r.clouds.texture);
    if (cloudMap) {
      const clouds = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.012, 72, 48),
        new THREE.MeshStandardMaterial({
          map: cloudMap,
          transparent: true,
          opacity: r.clouds.opacity,
          depthWrite: false,
          roughness: 1,
        }),
      );
      clouds.scale.y = r.polarRatio;
      sphere.add(clouds); // gira con el planeta
    }
  }

  if (isSun && mode === "vivo") {
    const outer = radius * 1.75;
    const coronaMaterial = createCoronaMaterial(radius, outer);
    animated.time.push(coronaMaterial);
    const corona = new THREE.Mesh(new THREE.SphereGeometry(outer, 64, 40), coronaMaterial);
    corona.renderOrder = 1;
    group.add(corona);
  }

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
  return { group, animated };
}

/** AR Quick Look (iOS): exporta un USDZ y lo abre con el visor del sistema. */
export async function openQuickLook(body: Body): Promise<void> {
  const { USDZExporter } = await import("three/examples/jsm/exporters/USDZExporter.js");
  const scene = new THREE.Scene();
  // A la escala del recorrido (los cuerpos enormes, reducidos: ver quickLookScale).
  const radius = arPlacement(body).radiusM * quickLookScale(body);
  const { group } = await buildModel(body, radius, "exportar");
  group.position.y = radius; // apoyado sobre el suelo, no enterrado hasta la mitad
  scene.add(group);
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

/**
 * Dirección «hacia adelante» del teléfono usando solo el giro horizontal (yaw),
 * sin su inclinación (pitch) ni el volanteo (roll).
 *
 * Al pulsar el botón de realidad aumentada, el visitante suele estar mirando hacia
 * abajo, a su propia pantalla. Si se ancla el cuerpo en la dirección exacta de ese
 * instante, queda clavado cerca del suelo; al levantar después el teléfono para
 * mirar al frente, ese punto (bien anclado, pero mal elegido) cae fuera de la vista
 * normal y da la sensación de que «se mueve». Aplanando el yaw, el cuerpo queda
 * siempre al frente, a la altura de los ojos, sea como sea que se sostenía el
 * teléfono al activar la realidad aumentada.
 */
function yawOnlyForward(q: THREE.Quaternion): THREE.Vector3 {
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
  forward.y = 0;
  if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1); // mirando casi recto hacia arriba o abajo
  return forward.normalize();
}

/** WebXR (Android): ancla el cuerpo frente al punto de partida, en una posición fija del mundo real. */
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
  // Tamaño real a la escala del recorrido (1 UA = 2 km): ver arPlacement.
  const place = arPlacement(body);
  const { group: model, animated } = await buildModel(body, place.radiusM, "vivo");
  model.visible = false; // hasta anclarlo
  scene.add(model);

  let placed = false;
  let validPoseFrames = 0;
  let last = performance.now();
  renderer.setAnimationLoop((_time, frame) => {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;

    if (!placed) {
      // En los primeros cuadros, mientras el seguimiento 6DoF del teléfono se
      // estabiliza, la postura puede llegar vacía: esperar a tener unos cuadros
      // seguidos con una postura real antes de anclar, para no hacerlo con una
      // posición de la cámara que todavía no es la real.
      const refSpace = renderer.xr.getReferenceSpace();
      const pose = refSpace ? frame.getViewerPose(refSpace) : null;
      validPoseFrames = pose ? validPoseFrames + 1 : 0;
      if (validPoseFrames >= 3) {
        const cam = renderer.xr.getCamera();
        const forward = yawOnlyForward(cam.quaternion);
        model.position.copy(cam.position).add(forward.multiplyScalar(place.distanceM));
        model.position.y = cam.position.y + place.liftM;
        model.visible = true;
        placed = true;
      }
    }

    for (const m of animated.time) m.uniforms.uTime!.value += dt;
    // El Sol gira despacio (su superficie ya se mueve); los planetas, algo más rápido.
    model.children[0]!.rotation.y += dt * (body.id === "sol" ? 0.02 : 0.25);
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
        (x as THREE.MeshStandardMaterial).bumpMap?.dispose();
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
