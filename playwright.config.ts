import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de extremo a extremo sobre la versión de producción.
 * Antes de ejecutarlas: npm run build. Luego: npm run test:e2e
 * (la primera vez en un computador nuevo: npx playwright install chromium).
 *
 * El 3D se dibuja con WebGL por software (SwiftShader) en modo sin ventana.
 */
const PORT = Number(process.env.E2E_PORT ?? 3101);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "es-CL",
    timezoneId: "America/Santiago",
    trace: "retain-on-failure",
    // El service worker atendería las solicitudes antes que page.route(); se bloquea en las pruebas.
    serviceWorkers: "block",
    launchOptions: {
      args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
    },
  },
  projects: [
    {
      name: "movil-pequeno",
      use: { ...devices["Pixel 5"], viewport: { width: 320, height: 640 }, deviceScaleFactor: 2 },
    },
    { name: "movil", use: { ...devices["Pixel 7"] } },
    { name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
