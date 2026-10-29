import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { getPlacements } from "../../src/lib/stations";

const STATIONS = getPlacements().map((p) => ({ id: p.station.id, name: p.station.name, coords: p.coords }));

/** Errores de consola relevantes (se ignoran los de red del mapa base sin conexión). */
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/ERR_TUNNEL|ERR_NAME|ERR_INTERNET|ERR_FAILED|tile\.openstreetmap|Failed to load resource/i.test(t)) return;
    errors.push(t);
  });
  return errors;
}

test.describe("inicio y estaciones", () => {
  test("la página de inicio presenta el recorrido y las ocho estaciones", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("sistema solar");
    for (const s of STATIONS)
      await expect(page.getByRole("link", { name: new RegExp(`^${s.name}`) }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Empezar en el Sol/ })).toHaveAttribute("href", "/estacion/sol");
    expect(errors).toEqual([]);
  });

  for (const [i, s] of STATIONS.entries()) {
    test(`estación ${s.name}: página, planeta 3D y estación siguiente`, async ({ page }) => {
      const errors = collectErrors(page);
      const res = await page.goto(`/estacion/${s.id}`);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(s.name);
      // El lienzo 3D se monta y la textura termina de cargar.
      await expect(page.locator(".stage canvas")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByText("Cargando la superficie…")).toHaveCount(0, { timeout: 20_000 });
      const next = STATIONS[i + 1];
      if (next) {
        await expect(page.getByRole("link", { name: new RegExp(`Siguiente: ${next.name}`) })).toHaveAttribute(
          "href",
          `/estacion/${next.id}`,
        );
      } else {
        await expect(page.getByText("Llegaste a la última estación del recorrido.")).toBeVisible();
      }
      expect(errors).toEqual([]);
    });
  }

  test("una estación inexistente responde 404 con un mensaje claro", async ({ page }) => {
    const res = await page.goto("/estacion/pluton");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Esta página no existe" })).toBeVisible();
  });
});

test.describe("navegación entre modos", () => {
  test("los cinco modos conservan la estación del QR", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/estacion/tierra");
    const nav = page.getByRole("navigation", { name: "Modos de la experiencia" });
    const expected: [string, string, RegExp][] = [
      ["Orientarme", "/estacion/tierra/orientarme", /Orientarme/],
      ["Sistema solar", "/estacion/tierra/sistema-solar", /Dónde están los planetas/],
      ["Mapa", "/estacion/tierra/mapa", /Mapa del recorrido/],
      ["Aprender", "/estacion/tierra/aprender", /Aprender/],
      ["Explorar", "/estacion/tierra", /^Tierra$/],
    ];
    for (const [label, href, heading] of expected) {
      await nav.getByRole("link", { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expect(nav.getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
    }
    expect(errors).toEqual([]);
  });
});

test.describe("visualización 3D", () => {
  test("los controles del modelo responden", async ({ page }) => {
    await page.goto("/estacion/saturno");
    await expect(page.locator(".stage canvas")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Etiquetas" }).click();
    await expect(page.locator(".planet-label", { hasText: "División de Cassini" })).toHaveCSS("opacity", "1", {
      timeout: 10_000,
    });
    await page.getByRole("button", { name: "Pausar giro" }).click();
    await expect(page.getByRole("button", { name: "Girar" })).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "Acercar" }).click();
    await page.getByRole("button", { name: "Restablecer la vista" }).click();
    await page.getByRole("button", { name: "Vista ampliada" }).click();
    await expect(page.locator(".stage--expanded")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".stage--expanded")).toHaveCount(0);
  });

  test("la acción especial de Venus muestra la superficie de radar", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/estacion/venus");
    await expect(page.locator(".stage canvas")).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Ver bajo las nubes" }).click();
    await expect(page.getByText(/mapa de radar de la sonda Magellan/)).toBeVisible();
    await page.getByRole("button", { name: "Ver bajo las nubes" }).click();
    expect(errors).toEqual([]);
  });

  test("si las texturas no se descargan, se informa y el planeta se muestra igual", async ({ page }) => {
    await page.route("**/textures/**", (route) => route.abort());
    await page.goto("/estacion/marte");
    await expect(page.locator(".stage canvas")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/No se pudo descargar la textura/)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Marte");
  });
});

test.describe("orientación", () => {
  test("funciona sin permiso de ubicación", async ({ page, context }) => {
    await context.clearPermissions();
    const errors = collectErrors(page);
    await page.goto("/estacion/tierra/orientarme");
    await expect(page.getByText("Estás en la estación Tierra, según el código QR.")).toBeVisible();
    await expect(page.getByText(/Siguiente: Marte/)).toBeVisible();
    await page.getByRole("button", { name: "Usar mi ubicación" }).click();
    await expect(page.getByText(/No diste permiso para usar tu ubicación/)).toBeVisible({ timeout: 15_000 });
    await page.getByRole("radio", { name: "Hacia San Carlos" }).click();
    await expect(page.getByText(/Siguiente: Venus/)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("con ubicación (simulada en la prueba) identifica la estación y la siguiente", async ({ page, context }) => {
    const tierra = STATIONS.find((s) => s.id === "tierra")!.coords!;
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: tierra.lat, longitude: tierra.lng, accuracy: 8 });
    await page.goto("/estacion/tierra/orientarme");
    await page.getByRole("button", { name: "Usar mi ubicación" }).click();
    await expect(page.locator(".notice--ok", { hasText: "Estás en la estación" })).toContainText("Tierra", {
      timeout: 15_000,
    });
    await expect(page.getByText(/Siguiente: Marte/)).toBeVisible();
    await expect(page.getByText(/Precisión estimada del GPS: ±8 m/)).toBeVisible();
  });
});

test.describe("sistema solar por fecha", () => {
  test("acepta una fecha, reproduce, pausa y vuelve al momento actual", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/sistema-solar");
    const input = page.getByLabel("Elegir fecha y hora (hora de Chile)");
    await expect(input).toBeVisible({ timeout: 20_000 });
    await input.fill("2030-01-15T12:00");
    await expect(page.getByText(/15 de enero de 2030, 12:00/)).toBeVisible();
    await expect(page.getByText(/2030-01-15 15:00 UTC/)).toBeVisible();
    await page.getByRole("button", { name: "Reproducir" }).click();
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: "Pausar" }).click();
    await page.getByRole("button", { name: /Marte/ }).first().click();
    await expect(page.getByText("Distancia a la Tierra")).toBeVisible();
    await page.getByRole("button", { name: "Ahora" }).click();
    await expect(page.getByText(/2030/)).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});

test.describe("mapa", () => {
  test("lista las estaciones y diferencia las ubicaciones propuestas, aun sin mapa base", async ({ page }) => {
    await page.route("**/tile.openstreetmap.org/**", (route) => route.abort());
    await page.goto("/mapa");
    await expect(page.locator(".leaflet-container")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/ubicaciones propuestas/)).toBeVisible();
    await expect(page.getByText(/Sin conexión al mapa base/)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("table tbody tr")).toHaveCount(STATIONS.length);
    await page.locator("table").getByRole("button", { name: "Júpiter" }).click();
    await expect(page.getByRole("link", { name: "Abrir la estación Júpiter" })).toHaveAttribute(
      "href",
      "/estacion/jupiter",
    );
    await expect(page.getByText("Ubicación propuesta", { exact: true })).toBeVisible();
  });
});

test.describe("aprender y progreso", () => {
  test("comparaciones y quiz", async ({ page }) => {
    await page.goto("/estacion/jupiter/aprender");
    await page.getByLabel("Segundo").first().selectOption("sol");
    await expect(page.getByText(/Sol es/)).toBeVisible();
    await page.goto("/estacion/marte");
    await page.getByRole("button", { name: "Óxido de hierro" }).click();
    await expect(page.getByText(/Correcto\./)).toBeVisible();
  });

  test("la estación final muestra el viaje de la luz hasta Urano", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" }); // sin animación: salta al final
    await page.goto("/estacion/urano");
    await page.getByRole("button", { name: "Lanzar la luz del Sol" }).click();
    await expect(page.getByRole("status").filter({ hasText: "La luz llegó a Urano" })).toContainText("2 h 39 min");
    await expect(page.getByRole("button", { name: "Repetir el viaje" })).toBeVisible();
  });

  test("la bitácora registra las estaciones abiertas en este teléfono", async ({ page }) => {
    for (const id of ["sol", "mercurio"]) {
      await page.goto(`/estacion/${id}`, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForTimeout(500);
    }
    await page.goto("/bitacora");
    await expect(page.getByText("Abriste 2 de 8 estaciones.", { exact: false })).toBeVisible();
  });
});

test.describe("diagnóstico y QR de prueba", () => {
  test("el diagnóstico no pide permisos por sí solo", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/diagnostico?estacion=urano");
    await expect(page.getByRole("heading", { name: "Diagnóstico" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Urano (parámetro ?estacion)")).toBeVisible();
    await expect(page.getByText(/Disponible \(WebGL/)).toBeVisible();
    await expect(page.getByText(/8 de 8 disponibles|de \d+ disponibles/)).toBeVisible({ timeout: 15_000 });
    expect(errors).toEqual([]);
  });

  test("el simulador de QR muestra el código de cada estación elegida", async ({ page }) => {
    await page.goto("/qr");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Simulador de QR");
    const qr = page.locator('[aria-label^="Código QR de"] svg');
    await expect(qr).toHaveCount(1, { timeout: 15_000 });
    for (const s of STATIONS) {
      await page
        .getByRole("button", { name: new RegExp(s.name) })
        .first()
        .click();
      await expect(page.getByRole("img", { name: `Código QR de ${s.name}` })).toBeVisible();
      await expect(page.getByText(new RegExp(`/estacion/${s.id}$`))).toBeVisible();
    }
  });

  test("la portada tiene el botón Escanear QR como acción principal y enlaza al simulador", async ({ page }) => {
    await page.goto("/");
    const scan = page.getByRole("link", { name: /Escanear QR/ });
    await expect(scan).toHaveAttribute("href", "/escanear");
    const box = (await scan.boundingBox())!;
    expect(box.height, "alto del botón Escanear QR").toBeGreaterThanOrEqual(80);
    expect(box.y, "el botón se ve sin desplazarse").toBeLessThan(page.viewportSize()!.height);
    await expect(page.getByRole("link", { name: /Simulador de QR/ })).toHaveAttribute("href", "/qr");
  });

  test("el escáner abre la estación al leer un QR (por foto) y rechaza otros códigos", async ({ page }) => {
    const QRCode = (await import("qrcode")).default;
    await page.goto("/escanear");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Escanear QR");
    const input = page.locator('input[type="file"]');
    const ajeno = await QRCode.toBuffer("https://ejemplo.org/otra-cosa", { width: 500, margin: 4 });
    await input.setInputFiles({ name: "ajeno.png", mimeType: "image/png", buffer: ajeno });
    await expect(page.getByText(/no es de una estación/)).toBeVisible({ timeout: 15_000 });
    const marte = await QRCode.toBuffer("https://192.168.1.50:3000/estacion/marte", { width: 500, margin: 4 });
    await input.setInputFiles({ name: "marte.png", mimeType: "image/png", buffer: marte });
    await expect(page).toHaveURL(/\/estacion\/marte$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Marte");
  });
});

test.describe("realidad aumentada (WebXR simulado)", () => {
  // Chromium sin ventana no tiene ARCore: se simula navigator.xr para comprobar el flujo de la página.
  const fakeXr = (mode: "rechaza" | "acepta") => `
    window.__xrCalls = [];
    Object.defineProperty(navigator, "xr", { configurable: true, value: {
      isSessionSupported: async (m) => m === "immersive-ar",
      requestSession: async (m, init) => {
        const root = init && init.domOverlay && init.domOverlay.root;
        window.__xrCalls.push({ m, features: init && init.optionalFeatures, display: root ? getComputedStyle(root).display : null, attached: !!(root && root.isConnected), canvases: document.querySelectorAll("canvas").length });
        ${mode === "rechaza" ? 'throw Object.assign(new Error("sin ARCore"), { name: "NotSupportedError" });' : 'throw Object.assign(new Error("fin de prueba"), { name: "InvalidStateError" });'}
      },
    } });`;

  test("el botón aparece y pide la sesión con el contenedor visible (no display:none)", async ({ page }) => {
    await page.addInitScript(fakeXr("acepta"));
    await page.goto("/estacion/saturno");
    const btn = page.getByRole("button", { name: "Ver en realidad aumentada" });
    await expect(btn).toBeVisible({ timeout: 15_000 });
    await btn.click();
    await expect(page.locator(".ar-note[role=alert]")).toContainText(/sesión de realidad aumentada abierta/i, {
      timeout: 15_000,
    });
    const calls = await page.evaluate(() => (window as unknown as { __xrCalls: unknown[] }).__xrCalls);
    expect(calls).toHaveLength(1);
    const c = calls[0] as { m: string; features: string[]; display: string; attached: boolean; canvases: number };
    expect(c.m).toBe("immersive-ar");
    expect(c.attached).toBe(true);
    expect(c.display, "el contenedor de la superposición no debe estar oculto").not.toBe("none");
    expect(c.features).toContain("dom-overlay");
    // El visor 3D libera su contexto WebGL antes de pedir la sesión (un segundo contexto fallaba en teléfonos).
    expect(c.canvases, "lienzos WebGL abiertos al pedir la sesión").toBe(0);
    // Y vuelve al terminar o fallar.
    await expect(page.locator("canvas")).toHaveCount(1, { timeout: 15_000 });
  });

  test("si el teléfono no admite la sesión, explica qué falta", async ({ page }) => {
    await page.addInitScript(fakeXr("rechaza"));
    await page.goto("/estacion/marte");
    await page.getByRole("button", { name: "Ver en realidad aumentada" }).click({ timeout: 15_000 });
    await expect(page.locator(".ar-note[role=alert]")).toContainText(/ARCore/, { timeout: 15_000 });
  });
});

test.describe("diseño móvil", () => {
  // Si algo ensancha la página, el navegador móvil agranda el área de diseño y la
  // barra de modos queda fuera de la pantalla (ocurrió con los selectores de la vista orbital).
  const PAGES = [
    "/",
    "/estacion/sol",
    "/estacion/saturno",
    "/estacion/urano/orientarme",
    "/estacion/urano/sistema-solar",
    "/estacion/urano/mapa",
    "/estacion/urano/aprender",
    "/sistema-solar",
    "/bitacora",
    "/diagnostico",
    "/qr",
    "/escanear",
    "/fuentes",
  ];
  test("ninguna página se desborda a lo ancho y la barra de modos queda a la vista", async ({ page }) => {
    const width = page.viewportSize()!.width;
    const height = page.viewportSize()!.height;
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForTimeout(800);
      const inner = await page.evaluate(() => window.innerWidth);
      expect(inner, `ancho de diseño en ${path}`).toBeLessThanOrEqual(width);
      const nav = page.getByRole("navigation", { name: "Modos de la experiencia" });
      if (await nav.count()) {
        const box = (await nav.boundingBox())!;
        expect(box.y + box.height, `barra de modos en ${path}`).toBeLessThanOrEqual(height + 1);
      }
    }
  });
});

test.describe("criterios de la auditoría (AUDITORIA_PROYECTO.md)", () => {
  test("C-01: las páginas sin 3D no descargan three.js", async ({ page }) => {
    for (const path of ["/", "/aprender", "/fuentes", "/no-existe"]) {
      const withThree: string[] = [];
      const pending: Promise<void>[] = [];
      const onResponse = (r: import("@playwright/test").Response) => {
        if (r.request().resourceType() !== "script") return;
        pending.push(
          r
            .text()
            .then((t) => {
              if (t.includes("WebGLRenderer")) withThree.push(r.url());
            })
            .catch(() => undefined),
        );
      };
      page.on("response", onResponse);
      await page.goto(path, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500); // deja terminar la precarga de enlaces
      await Promise.all(pending);
      page.off("response", onResponse);
      expect(withThree, `fragmentos con three.js en ${path}`).toEqual([]);
    }
  });

  test("C-03: objetivos táctiles de 44 px (24 px en enlaces dentro de una frase)", async ({ page, context }, info) => {
    test.skip(info.project.name === "escritorio", "medición para teléfonos");
    await context.addInitScript(() => {
      try {
        localStorage.setItem(
          "sistema-solar:progreso:v1",
          JSON.stringify({ visits: { sol: "2026-10-17T12:00:00Z" }, lastStation: "sol", quiz: {} }),
        );
      } catch {}
    });
    for (const path of [
      "/",
      "/aprender",
      "/bitacora",
      "/fuentes",
      "/estacion/saturno",
      "/estacion/tierra/mapa",
      "/estacion/tierra/sistema-solar",
    ]) {
      await page.goto(path);
      await page.waitForTimeout(1200);
      const small = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>("a, button, select, input, summary"))
          .filter((el) => {
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            if (!r.width || !r.height || cs.visibility === "hidden" || cs.opacity === "0") return false;
            if (el.classList.contains("skip-link") || el.closest(".leaflet-control-attribution, .leaflet-marker-icon"))
              return false;
            const inSentence = el.classList.contains("text-link") && !el.classList.contains("text-link--block");
            return inSentence ? Math.min(r.width, r.height) < 24 : r.height < 40 || r.width < 24;
          })
          .map(
            (el) =>
              `${(el.getAttribute("aria-label") || el.textContent || el.tagName).trim().slice(0, 30)} (${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)})`,
          ),
      );
      expect(small, `controles pequeños en ${path}`).toEqual([]);
    }
  });

  test("C-04: la vista orbital no solapa, recorta ni tapa etiquetas con los botones", async ({ page }) => {
    await page.goto("/estacion/marte/sistema-solar");
    await expect(page.locator(".stage canvas")).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(3000);
    const r = await page.evaluate(() => {
      const stage = document.querySelector(".stage")!.getBoundingClientRect();
      const ctrls = Array.from(document.querySelectorAll("[data-label-avoid]")).map((e) => e.getBoundingClientRect());
      const shown = Array.from(document.querySelectorAll<HTMLElement>(".stage .planet-label"))
        .filter((el) => getComputedStyle(el).opacity === "1")
        .map((el) => ({ t: el.textContent ?? "", r: el.getBoundingClientRect() }));
      const hit = (a: DOMRect, b: DOMRect) =>
        a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const problems: string[] = [];
      shown.forEach((l, i) => {
        if (l.r.left < stage.left - 0.5 || l.r.right > stage.right + 0.5 || l.r.top < stage.top - 0.5)
          problems.push(`${l.t} recortada`);
        shown.slice(i + 1).forEach((m) => hit(l.r, m.r) && problems.push(`${l.t} / ${m.t} solapadas`));
        ctrls.forEach((c) => hit(l.r, c) && problems.push(`${l.t} bajo los botones`));
      });
      return { problems, shown: shown.map((l) => l.t) };
    });
    expect(r.problems).toEqual([]);
    expect(r.shown).toContain("Marte"); // el planeta de la estación siempre se rotula
  });

  test("C-05: el diagnóstico no contacta servidores externos al abrirse", async ({ page, baseURL }) => {
    const external: string[] = [];
    page.on("request", (req) => {
      const u = new URL(req.url());
      if (u.protocol.startsWith("http") && u.origin !== new URL(baseURL!).origin) external.push(u.host);
    });
    await page.goto("/diagnostico");
    await expect(page.getByRole("heading", { name: "Diagnóstico" })).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(2000);
    expect(external).toEqual([]);
    await expect(page.getByRole("button", { name: "Probar el mapa base" })).toBeVisible();
  });

  test("C-08/C-09: icono maskable, robots, sitemap e imagen para compartir", async ({ request, page }) => {
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(
      manifest.icons.some(
        (i: { purpose?: string; src: string }) => i.purpose === "maskable" && i.src.includes("maskable"),
      ),
    ).toBe(true);
    expect((await request.get("/icon-maskable-512.png")).status()).toBe(200);
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain("Disallow: /diagnostico");
    expect((await request.get("/sitemap.xml")).status()).toBe(200);
    const og = await request.get("/estacion/saturno/opengraph-image");
    expect(og.status()).toBe(200);
    expect(og.headers()["content-type"]).toContain("image/png");
    await page.goto("/estacion/saturno");
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /^Saturno/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
  });
});

test.describe("accesibilidad", () => {
  test("se puede saltar al contenido con el teclado", async ({ page }, info) => {
    test.skip(info.project.name !== "escritorio", "teclado físico");
    await page.goto("/estacion/tierra");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Saltar al contenido" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#contenido$/);
  });

  for (const path of ["/", "/estacion/tierra", "/estacion/tierra/orientarme", "/aprender"]) {
    test(`sin problemas graves de accesibilidad en ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForTimeout(1500);
      const results = await new AxeBuilder({ page }).exclude("canvas").exclude(".leaflet-container").analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
    });
  }
});

test("capturas de referencia", async ({ page }, info) => {
  for (const path of ["/", "/estacion/saturno", "/estacion/tierra/orientarme", "/estacion/tierra/mapa"]) {
    await page.goto(path);
    await page.waitForTimeout(2500);
    await page.screenshot({
      path: `test-results/capturas/${info.project.name}${path.replace(/\//g, "_") || "_inicio"}.png`,
    });
  }
});
