"use client";

import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

export type TextureStatus = "cargando" | "lista" | "error";

export interface TextureRequest {
  url: string;
  /** Texturas de color usan espacio sRGB; mapas de relieve, lineal. */
  color: boolean;
}

/**
 * Carga texturas de forma progresiva y las libera al desmontar la escena.
 * Mientras cargan (o si fallan), el material usa un color de referencia.
 */
export function useTextures(requests: TextureRequest[]): {
  textures: (THREE.Texture | null)[];
  status: TextureStatus;
} {
  const gl = useThree((s) => s.gl);
  const key = requests.map((r) => `${r.url}|${r.color}`).join(",");
  const [state, setState] = useState<{ key: string; textures: (THREE.Texture | null)[]; status: TextureStatus }>({
    key: "",
    textures: [],
    status: "cargando",
  });

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    const loaded: THREE.Texture[] = [];
    const reqs =
      key === ""
        ? []
        : key.split(",").map((s) => {
            const [url, color] = s.split("|");
            return { url: url ?? "", color: color === "true" };
          });

    Promise.allSettled(
      reqs.map((r) =>
        loader.loadAsync(r.url).then((tex) => {
          tex.colorSpace = r.color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          tex.anisotropy = anisotropy;
          loaded.push(tex);
          return tex;
        }),
      ),
    ).then((results) => {
      if (cancelled) {
        loaded.forEach((t) => t.dispose());
        return;
      }
      const textures = results.map((r) => (r.status === "fulfilled" ? r.value : null));
      const anyFailed = results.some((r) => r.status === "rejected");
      setState({ key, textures, status: anyFailed ? "error" : "lista" });
    });

    return () => {
      cancelled = true;
      loaded.forEach((t) => t.dispose());
    };
  }, [key, gl]);

  if (state.key !== key) return { textures: requests.map(() => null), status: requests.length ? "cargando" : "lista" };
  return { textures: state.textures, status: state.status };
}
