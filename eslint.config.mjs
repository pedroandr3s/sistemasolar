import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Las escenas de three.js / React Three Fiber modifican objetos 3D (materiales,
    // vectores, posiciones) dentro de useFrame, fuera del renderizado de React.
    // Es el patrón recomendado por R3F; la regla de inmutabilidad del compilador
    // de React no lo distingue, por eso se desactiva solo en estas carpetas.
    files: ["src/components/planet/**", "src/components/orbits/**"],
    rules: { "react-hooks/immutability": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    "artifacts/**",
    "playwright-report/**",
    "test-results/**",
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
