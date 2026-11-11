# Auditoría del proyecto

Proyecto: Sistema solar a escala San Carlos–San Fabián (Next.js 16.4.2, React 19.3, Three.js 0.186).
Fecha de la auditoría: 17 de octubre de 2026.
Alcance: auditoría sin modificar el código de la aplicación. Todas las pruebas se ejecutaron sobre una **copia** del repositorio en `C:\tmp\sistema-solar-audit` (hecha con la autorización del usuario, porque la carpeta original no tenía `node_modules`). La carpeta original solo recibió este informe.

---

## 1. Resumen ejecutivo

**Evaluación general: LISTO PARA PRUEBAS en teléfono (red local o túnel HTTPS) y para validación de contenido. NO listo para instalación física ni para uso público definitivo** (faltan ubicaciones verificadas, dominio, QR de producción y pruebas en dispositivos físicos).

- **Inicia:** sí. `next start` respondió 200 en todas las rutas probadas (57 rutas).
- **Compila:** sí. `npm run build` termina sin errores; 8 estaciones × 5 modos generados de forma estática.
- **Controles técnicos:** `typecheck`, `lint` y 51/51 pruebas unitarias aprobadas. 88 pruebas e2e aprobadas, 2 omitidas por diseño (teclado físico en perfiles móviles).
- **Funcionan (verificado en ejecución):** navegación entre las 8 estaciones y los 5 modos, visor 3D (WebGL por software), sistema solar por fecha, mapa con trazado y estaciones marcadas como «propuestas», orientación sin permisos y con GPS simulado, quiz y bitácora, generación y decodificación de QR de desarrollo, modo sin conexión con service worker, 404 controlado.
- **No se reprodujo ninguna falla P0 ni P1 de funcionamiento** en el software. Los bloqueos reales son de **datos y entregables pendientes** (ver F-01, F-02, F-03).
- **Problemas más importantes:**
  1. No existen ubicaciones verificadas de las esculturas (F-01) ni QR de producción (F-02).
  2. El proyecto no está bajo control de versiones (F-03).
  3. Los fragmentos de Three.js (~733 KB sin comprimir, ~184 KB gzip) se descargan en **todas** las páginas, incluso en las que no tienen 3D y en el 404 (C-01).
  4. La brújula de Android calcula el rumbo solo con `alpha`, sin compensar inclinación ni declinación magnética (C-02, inspección estática).
  5. Varios objetivos táctiles miden menos de 24 px de alto (C-03).
- **Limitaciones de la auditoría:** sin teléfonos físicos, sin GPS ni brújula reales, sin AR, sin lector de pantalla, sin perfilado de rendimiento en un dispositivo real, sin acceso a internet para validar datos científicos contra NASA. Detalle en la sección 12.

No se asigna una puntuación global: el estado depende del uso previsto (prueba con usuarios: sí; instalación: no).

---

## 2. Entorno y metodología

**Tecnologías detectadas:** Next.js 16.4.2 (App Router, Turbopack), React 19.3.0, TypeScript 5 estricto con `noUncheckedIndexedAccess`, Three.js 0.186 + @react-three/fiber 9 + drei 10, astronomy-engine 2.1.19, Leaflet 1.9 + react-leaflet 5, Tailwind 4 + CSS propio, Vitest 4, Playwright 1.56 + axe-core, qrcode/pdf-lib/jsqr/pngjs. Gestor: npm (package-lock.json). Node 22.21.1, npm 10.9.4. Sistema: Windows 11.

**Estado inicial del repositorio:** sin `node_modules`, sin `.next`, sin `.env*` reales (solo `.env.example`, sin secretos), **sin repositorio Git** (`.git` ausente), sin `CLAUDE.md` (existe `AGENTS.md`, que pide leer `node_modules/next/dist/docs/` antes de programar). `artifacts/qr/` solo contiene `LEEME.md`.

**Comandos ejecutados (en la copia):**

| Comando | Resultado |
|---|---|
| `robocopy` del repo (sin node_modules/.next) a `C:\tmp\sistema-solar-audit` | Correcto |
| `npm ci` | 501 paquetes; correcto |
| `npm run typecheck` | Sin errores |
| `npm run lint` | Sin errores ni advertencias |
| `npm test` | 5 archivos, 51/51 aprobadas (46 s) |
| `npm run build` | Correcto |
| `npm audit --omit=dev` | 0 vulnerabilidades |
| `npm audit` | 5 altas (`braces`, cadena de ESLint, solo desarrollo) |
| `npx playwright install chromium` + `npm run test:e2e` | 88 aprobadas, 2 omitidas (7,5 min) |
| `next start -p 3200` + sondas propias (`audit-probe/*.mjs`, solo en la copia) | Ver secciones 7 y 8 |
| `tsx scripts/qr/generate.ts --modo produccion` | Se niega a generar (sin URL): comportamiento correcto |
| `tsx scripts/qr/generate.ts --modo desarrollo --base https://prueba-audit.trycloudflare.com --out C:\tmp\qr-audit` | 8 QR verificados, PDF, manifiesto JSON/CSV |

**Herramientas:** Chromium headless de Playwright con WebGL por software (SwiftShader), viewport móvil 360×640 con emulación táctil, DevTools Protocol para iniciadores de red, capturas de pantalla.

**Rutas probadas (57):** `/`, `/aprender`, `/bitacora`, `/diagnostico`, `/fuentes`, `/mapa`, `/orientarme`, `/qr`, `/sistema-solar`, `/no-existe`, `/estacion/pluton` (inexistente), y para cada una de las 8 estaciones: `/estacion/<id>` y sus modos `aprender`, `mapa`, `orientarme`, `sistema-solar`.

**Dispositivos reales probados:** ninguno. Todo es emulación en Chromium de escritorio.

**No ejecutadas / bloqueadas:** teléfonos físicos (Android/iPhone), GPS real, brújula, AR (WebXR/Quick Look), lectura de QR con cámara, túnel `cloudflared`, HTTPS real/dominio, lector de pantalla, Safari/Firefox, perfilado de FPS/memoria en gama media, perfil de baja potencia, validación de datos contra fuentes NASA en línea, `npm run dev` (se usó el servidor de producción, que es el que usan los e2e).

---

## 3. FALLAS

No se reprodujo ninguna falla funcional de la aplicación en el entorno de pruebas. Se registran como FALLA los **requisitos del proyecto que hoy no se cumplen** (funcionalidad/entregable ausente).

### F-01 Ubicaciones verificadas de las 8 esculturas inexistentes
- **Categoría:** FALLA (entregable ausente)
- **Prioridad:** P1 (bloquea instalación física; no bloquea prueba digital)
- **Estado:** Inspección estática + visto en ejecución
- **Ubicación:** `src/config/stations.ts` (las 8 con `status: "propuesta-escala"`, `site: null`), `docs/DATOS-PENDIENTES-Y-LIMITACIONES.md`
- **Evidencia:** todas las estaciones se calculan sobre el trazado con 1 UA = 2 km. La interfaz las rotula «ubicación por confirmar» / «distancia según la escala» (captura de `/estacion/saturno`) y el mapa las dibuja con borde punteado. Mercurio–Marte caen en los primeros 3,05 km, dentro de la zona urbana de San Carlos.
- **Impacto:** GPS, «estación más cercana» y «siguiente estación» operan con puntos teóricos. Los datos de seguridad, acceso y servicios de cada sitio son `null`.
- **Recomendación:** elegir sitios en terreno, cargar `status: "verificada"` con lat/lng, responsable y fecha; completar `site` (seguridad, accesibilidad). Decidir si se mantiene la escala y el punto del Sol (los 4 planetas rocosos quedan en la ciudad).
- **Criterio de aceptación:** las 8 estaciones `verificada`, `offsetFromRouteMeters` razonable por estación, `site.verified: true`, y las pruebas unitarias de geodesia siguen aprobadas.
- **Nota positiva:** la app NO presenta estas posiciones como definitivas (ver M-03).

### F-02 QR de producción inexistentes y sin dominio definitivo
- **Categoría:** FALLA (entregable ausente)
- **Prioridad:** P1 antes de imprimir; P3 para pruebas
- **Estado:** Reproducido
- **Ubicación:** `artifacts/qr/` (solo `LEEME.md`), `.env.example` (`NEXT_PUBLIC_SITE_URL=` vacío), `scripts/qr/generate.ts`
- **Evidencia:** `generate.ts --modo produccion` → «No hay URL configurada (NEXT_PUBLIC_SITE_URL está vacía)». No hay PNG/SVG/PDF de producción en el repositorio.
- **Impacto:** no hay QR imprimibles definitivos. Los de desarrollo dependen de una IP o un túnel temporal.
- **Recomendación:** definir dominio HTTPS, configurar `NEXT_PUBLIC_SITE_URL`, compilar y ejecutar `npm run qr:prod`; imprimir una prueba y escanearla con Android e iPhone a pleno sol.
- **Criterio de aceptación:** `artifacts/qr/produccion/` con 8 PNG, 8 SVG, PDF y manifiesto cuya URL sea el dominio real; cada QR decodificado coincide con `/estacion/<id>`.

### F-03 El proyecto no está bajo control de versiones
- **Categoría:** FALLA (riesgo de proceso)
- **Prioridad:** P1 antes de la fase de correcciones
- **Estado:** Reproducido
- **Ubicación:** raíz del proyecto (sin `.git`; existe `.gitignore`)
- **Evidencia:** `Test-Path .git` → `False`. La documentación menciona «no se guardan en git».
- **Impacto:** sin historial no se pueden revertir cambios de la segunda fase. Además la carpeta está en OneDrive (el README advierte del problema de sincronizar `node_modules`/`.next`).
- **Recomendación:** `git init`, commit inicial del estado actual (con `.gitignore` vigente), idealmente mover el proyecto fuera de OneDrive.
- **Criterio de aceptación:** repositorio con commit inicial limpio y `node_modules`, `.next` y `artifacts/qr/desarrollo` ignorados.

---

## 4. CORRECCIONES NECESARIAS

### C-01 Three.js se descarga en todas las páginas, incluso sin 3D
- **Categoría:** CORREGIR | **Prioridad:** P2 | **Estado:** Reproducido (causa raíz por confirmar)
- **Ubicación:** fragmentos `/_next/static/chunks/1e_u-v408a2p8.js` (377 KB, 100 KB gzip) y `1x7za-hro-avk.js` (356 KB, 84 KB gzip); el origen está en el grafo de módulos compartido (no en `page.tsx`, que no importa Three).
- **Evidencia:** carga por `loadChunkCached` del runtime de Turbopack en `/aprender` y en `/no-existe` (CDP). Peso decodificado por página: `/` 1.738 KB, `/fuentes` 1.730 KB, `/aprender` 1.750 KB, 404 1.706 KB (frente a ~2.0 MB en estaciones con 3D). El HTML de esas páginas no referencia esos fragmentos.
- **Impacto:** ~184 KB gzip innecesarios en la portada y páginas de texto, con conectividad móvil limitada en la ruta N-31. Retrasa la primera página que verá el visitante tras escanear.
- **Recomendación:** averiguar qué módulo compartido (p. ej. un barrel o un `import()` en un cliente raíz) arrastra los fragmentos; comprobar con `@next/bundle-analyzer` o `next build --debug`; asegurar que Three solo se pida al montar `PlanetCanvas`/`OrbitScene`.
- **Criterio de aceptación:** al abrir `/` y `/aprender` no se solicitan fragmentos que contengan `WebGLRenderer`; peso de `/` por debajo de ~1,0 MB decodificado.

### C-02 La brújula de Android ignora la inclinación y la declinación magnética
- **Categoría:** CORREGIR | **Prioridad:** P2 | **Estado:** Inspección estática (no probable sin dispositivo)
- **Ubicación:** `src/components/orient/useCompass.ts` (`heading = (360 - e.alpha + screenAngle) % 360`)
- **Evidencia:** en iOS se usa `webkitCompassHeading` (compensa inclinación); en Android el rumbo se deriva solo de `alpha`, que es fiable con el teléfono horizontal pero cambia con la inclinación (mano en posición de mirar la pantalla ≈ 45–70°). La documentación admite que no corrige la declinación magnética, y el rumbo calculado se compara con rumbos geográficos (`initialBearing`).
- **Impacto:** la flecha hacia la «siguiente estación» puede apuntar con error de varios grados en Android; el error de declinación local (de pocos grados en la región) se suma. La app ya oculta la flecha cuando la incertidumbre es alta, lo que mitiga el riesgo.
- **Recomendación:** calcular el rumbo a partir de la matriz de rotación completa (alpha/beta/gamma) o usar `AbsoluteOrientationSensor`; aplicar declinación con un modelo (WMM) para la zona; mantener el aviso de baja precisión.
- **Criterio de aceptación:** prueba física en Android e iPhone con el teléfono inclinado y horizontal comparando contra una brújula de referencia; diferencia aceptada documentada (p. ej. < 10°).

### C-03 Objetivos táctiles por debajo del mínimo en varias vistas
- **Categoría:** CORREGIR | **Prioridad:** P2 | **Estado:** Reproducido (medición en 360×640)
- **Ubicación y medidas:**
  - Enlace de marca «Sistema solar a escala» (todas las páginas): 152×21 px.
  - Enlaces de texto en `/aprender` («Explorar los anillos en 3D», etc.): 324×20 px.
  - Selectores de estación de `/bitacora`: 24–68×22 px.
  - Controles de zoom de Leaflet: 30×30 px; atribución: ~13 px de alto.
  - Enlace «Fuentes, licencias y método» en la portada: 318×37 px.
- **Evidencia:** `getBoundingClientRect` sobre `a, button, input, select`. WCAG 2.2 (2.5.8) exige 24×24 px como mínimo, con excepciones por espaciado; la guía móvil habitual recomienda 44 px. Los botones principales sí miden ≥ 40 px.
- **Impacto:** difícil acertar con una mano, con sol o con guantes; sobre todo en la bitácora y en los enlaces de texto.
- **Recomendación:** dar `min-height` ≥ 44 px (o área de toque ampliada con padding) a la marca, `.text-link` y los chips de la bitácora; usar controles de zoom propios o ampliar los de Leaflet.
- **Criterio de aceptación:** ningún control interactivo propio de menos de 24 px; los de uso frecuente ≥ 44 px, verificado con la misma sonda.

### C-04 Vista orbital: escena muy baja y etiquetas que se solapan o se cortan en móvil
- **Categoría:** CORREGIR | **Prioridad:** P2 | **Estado:** Reproducido (captura `/estacion/marte/sistema-solar`, 360×640)
- **Ubicación:** `src/components/orbits/OrbitsMode.tsx`, `OrbitScene.tsx`, `src/components/three/labels.tsx`
- **Evidencia:** la escena ocupa ≈ 280 px del alto, las etiquetas de «Marte», «Tierra», «Mercurio» se encimaban y «Saturno» queda cortada en el borde derecho. Los controles flotantes se apoyan sobre la escena.
- **Impacto:** el visitante no distingue fácilmente los planetas interiores, justo lo que la vista debe enseñar.
- **Recomendación:** aumentar la altura de la escena en móvil (≈ 45–55 % del alto útil), evitar colisiones de etiquetas (ocultar las no seleccionadas o separarlas), acotar etiquetas al ancho del lienzo.
- **Criterio de aceptación:** en 360×640 y 320×568 ninguna etiqueta queda recortada ni solapada con otra a la vista por defecto.

### C-05 El panel de diagnóstico realiza una petición a un servicio externo
- **Categoría:** CORREGIR (transparencia) | **Prioridad:** P3 | **Estado:** Reproducido
- **Ubicación:** `src/components/diag/Diagnostics.tsx`, ruta `/diagnostico`
- **Evidencia:** al abrir `/diagnostico` se pide `https://tile.openstreetmap.org` sin acción del usuario. La documentación afirma que el panel «no envía datos».
- **Impacto:** se expone la IP y el referer del visitante a OpenStreetMap; incumple literalmente la frase de la documentación y, si crece el tráfico, la política de uso de teselas de OSM.
- **Recomendación:** hacer la comprobación solo tras un botón, o ajustar el texto de la documentación y de la página; usar proveedor propio en producción (ya previsto en `.env.example`).
- **Criterio de aceptación:** `/diagnostico` no hace peticiones externas hasta que el usuario lo pida, o el texto declara la petición.

### C-06 Manifiesto CSV sin BOM UTF-8
- **Categoría:** CORREGIR | **Prioridad:** P3 | **Estado:** Reproducido
- **Ubicación:** `scripts/qr/lib.ts` (genera `manifiesto.csv`)
- **Evidencia:** el archivo generado empieza con `"or` (sin `EF BB BF`); «Júpiter» se mostró corrompido en lectura sin BOM.
- **Impacto:** Excel en Windows mostrará «JÃºpiter» al abrirlo.
- **Recomendación:** anteponer BOM al CSV (o documentar la importación como UTF-8).
- **Criterio de aceptación:** el CSV abierto en Excel muestra «Júpiter» correctamente.

### C-07 Service worker: caché de texturas sin versionado por contenido
- **Categoría:** CORREGIR | **Prioridad:** P3 | **Estado:** Inspección estática
- **Ubicación:** `public/sw.js` (`VERSION = "v1"`; texturas «caché primero»), `next.config.ts` (texturas con `max-age` de 7 días, sin huella en el nombre)
- **Evidencia:** las rutas `/textures/*.webp` no cambian de nombre; una textura corregida no llegará a quien ya la tenga en caché hasta subir `VERSION` a mano.
- **Impacto:** texturas obsoletas en teléfonos de visitantes recurrentes.
- **Recomendación:** versionar el nombre de archivo (hash) o subir `VERSION` en cada despliegue (automatizar).
- **Criterio de aceptación:** una textura modificada se refleja en un cliente con caché previa tras el despliegue.

### C-08 Icono «maskable» reutiliza el icono normal
- **Categoría:** CORREGIR | **Prioridad:** P3 | **Estado:** Inspección estática
- **Ubicación:** `src/app/manifest.ts` (`icon-512.png` con `purpose: "maskable"`)
- **Impacto:** en Android el icono puede recortarse al instalar la PWA.
- **Recomendación:** generar un icono maskable con zona segura (≈ 80 %).
- **Criterio de aceptación:** el icono pasa la herramienta «Maskable.app» sin recortes.

### C-09 SEO y metadatos incompletos
- **Categoría:** CORREGIR | **Prioridad:** P3 (P2 si el sitio será público)
- **Estado:** Reproducido/estático
- **Evidencia:** no existen `robots.txt`, `sitemap.xml` ni imagen Open Graph; `metadataBase` queda `undefined` mientras `NEXT_PUBLIC_SITE_URL` esté vacía. Lo que sí existe: `<title>` por página (p. ej. «Saturno | Sistema solar…»), descripción por estación, `lang="es-CL"`, manifest, 1 `h1` por página.
- **Recomendación:** añadir `robots.ts`, `sitemap.ts` (8 estaciones + modos), imagen OG por estación y asegurar `metadataBase` en producción.
- **Criterio de aceptación:** compartir una estación en mensajería muestra título, descripción e imagen; `/sitemap.xml` y `/robots.txt` responden 200.

### C-10 Advertencia de consola `THREE.Clock` deprecado
- **Categoría:** CORREGIR | **Prioridad:** P3 | **Estado:** Reproducido
- **Evidencia:** «THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.» en todas las páginas con 3D. Proviene de la dependencia (react-three-fiber), no del código propio.
- **Recomendación:** vigilar la actualización de `@react-three/fiber`; no actuar hasta que la biblioteca lo resuelva.
- **Criterio de aceptación:** sin advertencias de deprecación tras actualizar la dependencia.

---

## 5. MEJORAS RECOMENDADAS (ordenadas por impacto)

1. **E-01 Probar en teléfonos físicos** con el método B (HTTPS) antes de cualquier decisión de diseño sobre GPS/brújula/AR. Es la mejora de mayor valor porque cubre las funciones no verificables aquí (ver sección 10).
2. **E-02 Perfilar el rendimiento 3D en un teléfono de gama media**: el e2e usa SwiftShader y no mide FPS. `detectQuality()` clasifica «baja» con `cores <= 4` o `deviceMemory <= 3`; en iPhone `deviceMemory` no existe y se asume 4 GB, por lo que la decisión de calidad no es contrastable sin medir.
3. **E-03 Proveedor de teselas propio o comercial** para producción (política de uso de OSM para tráfico turístico). Ya está contemplado en `.env.example`.
4. **E-04 Modo sin conexión más explícito**: el mapa base no se cachea (decisión correcta por política de OSM); mostrar un aviso visible cuando no hay conexión indicando qué sigue funcionando (3D, trazado, cálculos).
5. **E-05 Declinación magnética y sensor de orientación completo** (ver C-02).
6. **E-06 Contenido educativo:** auditar los 8 textos con docentes (ver sección 8). Las actividades interactivas observadas (comparación de tamaño, quiz, rotación/traslación, viaje de la luz) son sólidas; revisar la longitud de los bloques de «Entender mejor/Profundizar» para niños.
7. **E-07 Actualizar la configuración de ESLint cuando Next lo permita** (5 avisos altos en `braces`, solo desarrollo). No ejecutar `npm audit fix --force` (degradaría `eslint-config-next`).
8. **E-08 Revisión anual de lunas** (Júpiter 115, Saturno 293, Urano 29 con fecha 2026-08/09 en `bodies.ts`): automatizar un recordatorio.
9. **E-09 Pruebas e2e en CI** (Playwright ya configurado) una vez exista repositorio Git.

---

## 6. ELEMENTOS QUE DEBEN MANTENERSE

### M-01 Rigor de la escala y modelo de datos
- **Ubicación:** `src/config/scale.ts`, `src/lib/stations.ts`, `src/data/bodies.ts`
- Distingue explícitamente tres cosas: distancia astronómica real (semieje mayor), distancia a escala y posición sobre el trazado. 1 UA = 2 km es coherente: Urano a 38,33 km cabe en los 43,3 km del trazado.
- **Riesgo de cambiarlo:** romper la correspondencia entre las esculturas y el modelo, y las pruebas unitarias de escala.

### M-02 Cálculo orbital con Astronomy Engine y manejo de fechas de Chile
- **Ubicación:** `src/lib/astro.ts`, `src/lib/time.ts`
- Posiciones heliocéntricas reales por fecha; fechas en `America/Santiago` con cambio horario correcto (captura: «23:12 Hora de Chile (UTC−3), 2026-10-18 02:12 UTC», coherente con el horario de verano vigente en octubre). Las cifras mostradas son coherentes entre sí (Marte 1,579 UA ≈ 236,2 M km; luz 13 min 8 s; Marte–Tierra 1,542 UA ≈ 230,7 M km: se verificaron a mano).
- **Riesgo de cambiarlo:** introducir errores de zona horaria o de marco de referencia.

### M-03 Honestidad sobre datos provisionales
- **Ubicación:** `src/config/stations.ts` (estados `propuesta-escala` / `verificada` / `pendiente`), UI de estación y mapa.
- La app no presenta posiciones teóricas como reales («ubicación por confirmar», borde punteado). El modelo de tres estados permite migrar sin tocar la lógica.
- **Riesgo de cambiarlo:** presentar datos de demostración como definitivos.

### M-04 Distinción entre escala orbital y escala física en la vista del sistema solar
- Textos como «Las esculturas del camino no se mueven: muestran solo la distancia media… Es un modelo de las distancias, no una foto de dónde está cada planeta hoy» y la nota «órbitas y planetas no están a escala de tamaño» evitan la confusión principal de este tipo de proyecto.

### M-05 Arquitectura de carga y liberación de 3D
- **Ubicación:** `next.config.ts` (Cache Components desactivado por decisión documentada), `PlanetViewer.tsx` (`dynamic`, `ssr:false`, `ErrorBoundary`), `PlanetCanvas.tsx` (`frameloop` «never/demand/always» según visibilidad y animación, `dispose` de materiales y geometrías, `dpr` acotado).
- Tras 24 navegaciones consecutivas entre estaciones quedó 1 solo `<canvas>` y no aparecieron avisos de contextos WebGL; el heap de JS fue ~18 MB. Si las texturas fallan, el planeta se muestra igual (probado).
- **Riesgo de cambiarlo:** reactivar Cache Components conservaría escenas WebGL ocultas y agotaría memoria en gama media.

### M-06 Generador de QR
- **Ubicación:** `scripts/qr/`, `src/config/site.ts` (`validateSiteUrl`)
- Se niega a producir QR de producción con URL vacía, HTTP, red local, túneles o dominios de ejemplo; decodifica cada PNG y falla si no coincide; QR de desarrollo marcados «SOLO PARA PRUEBAS»; corrección de errores Q, zona blanca de 4 módulos; manifiesto con SHA-256. Probado: 8 PNG/8 SVG/2 PDF/manifiesto.
- **Riesgo de cambiarlo:** imprimir QR con un dominio temporal.

### M-07 Permisos, privacidad y seguridad del navegador
- GPS y brújula solo se piden por acción del usuario; sin permisos la app funciona con la estación del QR; coordenadas y progreso no salen del teléfono; sin claves ni backend; `Permissions-Policy`, `Referrer-Policy`, `X-Content-Type-Options` configurados; `poweredByHeader` desactivado; el único `dangerouslySetInnerHTML` inyecta SVG generado por la biblioteca `qrcode` (entrada controlada).
- **Riesgo de cambiarlo:** pérdida de confianza y exposición innecesaria de datos de ubicación.

### M-08 Aviso de seguridad vial
- `SAFETY_NOTICE` visible en modos con ubicación y detección de velocidad de vehículo (`looksLikeVehicle`) en una ruta con tráfico real.

### M-09 Diseño móvil y accesibilidad base
- Sin desbordamiento horizontal en ninguna de las 57 rutas a 360 px (y en 320 px en los e2e); barra de modos inferior estable; enlace «Saltar al contenido»; un `h1` por página; fuentes locales (sin dependencias a CDNs de fuentes); contraste alto sobre fondo oscuro; axe-core sin problemas graves en 4 rutas; controles principales ≥ 40 px.

### M-10 Cobertura de pruebas existente
- 51 unitarias + 88 e2e en 3 tamaños de pantalla, incluyendo casos negativos (sin permisos, sin texturas, sin mapa base, 404).

---

## 7. Resultados de pruebas

| Prueba | Resultado | Evidencia | Observaciones |
|---|---|---|---|
| Inspección del repositorio | APROBADA | estructura, README, docs, config | Sin `.git`, sin `CLAUDE.md` |
| Instalación (`npm ci`) | APROBADA | 501 paquetes | En copia fuera de OneDrive |
| Comprobación de tipos | APROBADA | `npm run typecheck` sin errores | |
| Linter | APROBADA | `npm run lint` sin salida de error | |
| Pruebas unitarias | APROBADA | 51/51 | |
| Compilación de producción | APROBADA | `npm run build` | 8×5 páginas estáticas |
| Servidor de producción inicia | APROBADA | `next start` 200 | `npm run dev` no ejecutado |
| Pruebas e2e Playwright | APROBADA | 88 ok / 2 omitidas | 3 viewports, SwiftShader |
| 57 rutas responden y sin errores de consola | APROBADA | 200 en rutas válidas; 404 en inexistentes | El único error de consola es el 404 esperado |
| Scroll horizontal (360 px) | APROBADA | `scrollWidth <= clientWidth` en 57 rutas | |
| Peticiones externas | PARCIAL | solo `tile.openstreetmap.org` (mapa y diagnóstico) | Ver C-05 |
| Peso y carga de la portada | FALLIDA | 1,7 MB decodificados; Three.js en páginas sin 3D | C-01 |
| Tamaño de objetivos táctiles | FALLIDA | medidas en C-03 | |
| Visor 3D (8 cuerpos) | APROBADA (emulado) | e2e + `canvas` presente en 8 estaciones | Sin GPU real |
| Fugas de WebGL al navegar | APROBADA (indicio) | 24 navegaciones, 1 canvas, heap ≈ 18 MB | Sin perfilado de memoria real |
| Vista orbital en móvil | PARCIAL | funciona; etiquetas solapadas/cortadas | C-04 |
| Mapa sin mapa base | APROBADA | e2e | |
| Orientación sin permiso | APROBADA | e2e | |
| Orientación con GPS | PARCIAL | GPS **simulado** en e2e | Sin GPS real |
| Brújula | NO EJECUTADA | sin sensores | C-02 es análisis estático |
| Service worker offline | APROBADA | página visitada cargó offline (título y canvas); página no visitada también cargó | En localhost (contexto seguro), no en HTTPS real |
| Generación de QR (desarrollo) | APROBADA | 8 PNG, 8 SVG, 2 PDF, manifiesto | Decodificados por software, no con cámara |
| QR de producción | BLOQUEADA | falta dominio | F-02 |
| Lectura de QR con cámara física | NO EJECUTADA | | |
| AR (WebXR / Quick Look) | NO EJECUTADA | sin dispositivo | |
| Lector de pantalla | NO EJECUTADA | | Solo axe-core |
| `npm audit` producción | APROBADA | 0 vulnerabilidades | |
| `npm audit` completo | PARCIAL | 5 altas, `braces`, solo desarrollo | |
| Secretos expuestos | APROBADA | sin `.env`; `.env.example` sin secretos | Búsqueda en `.env.example` y config |
| Validación astronómica contra fuentes en línea | NO EJECUTADA | sin consulta a NASA | Ver sección 12 |

---

## 8. Auditoría por funcionalidad

### Inicio y navegación
Funciona: portada con recorrido a escala, 8 estaciones, barra de 5 modos que conserva la estación del QR, regla de ruta en el encabezado, 404 con mensaje claro, ruta inexistente de estación → 404. **Observado:** el enlace de marca y «Fuentes» son pequeños (C-03). No hay estados de carga fallidos visibles. Hallazgos: C-01, C-03.

### Estaciones y QR
Una página estática por estación con `dynamicParams = false`; los identificadores son únicos (`sol`…`urano`) y forman la URL del QR. Resuelven las 8 URLs y los 5 modos de cada una. Generador y validación sólidos (M-06). Pendiente: F-02. Los QR se decodificaron por software, no con cámara.

### Visualización 3D
Cuerpos realmente tridimensionales (esferas con texturas WebP, anillos de Saturno y Urano, nubes de Tierra y Venus, Sol con material propio). Controles: giro táctil, zoom, restablecer, pantalla ampliada, etiquetas, pausa, comparación con la Tierra, acción propia por planeta. Pausa de render fuera de pantalla, `dpr` acotado, texturas 1k/2k según calidad, alternativa de teclado y error de texturas controlado. Texturas de 7 a 255 KB cada una (razonable). **No verificado:** FPS real, gestos multitáctiles en dispositivos reales, comportamiento en gama baja. Las superficies de Mercurio, Urano y Sol son «artísticas» (declarado en la documentación).

### Simulación orbital
Posiciones por fecha con selector, «Ahora», pasos, reproducción y velocidad; modos real/comprimido (raíz cuadrada) documentados en `scaleVector`. Los datos verificados a mano (Marte, tiempo de luz) son coherentes. Fecha limitada a 1900–2100 y precisión ≈ 1′ (declarado en pantalla). Hallazgo: C-04. Pendiente: contraste con una efeméride independiente (ver sección 12).

### Mapa
Leaflet + OpenStreetMap; trazado de 127 puntos, 43,25 km (OSRM, 43,27 km completo), origen y destino con fuente (Nominatim/OSM); estaciones «propuestas» diferenciadas; tabla de distancias; ubicación del visitante opcional. Funciona sin mapa base. **Riesgo:** dependencia de internet y de la política de OSM (E-03). Las coordenadas de origen/destino son plazas de armas obtenidas de Nominatim: confiables, pero no verificadas en terreno.

### GPS y orientación
Cálculos geodésicos correctos y cubiertos por pruebas (haversine, proyección sobre polilínea, siguiente estación por posición, ambos sentidos, coordenadas ausentes, incertidumbre angular por precisión GPS). Permisos solo bajo acción del usuario; mensajes específicos para denegado/sin señal/sin HTTPS/no disponible. **No verificado en dispositivo.** Dependencia de HTTPS documentada y explicada en la app. Distingue rumbo al objetivo, rumbo de la ruta y orientación del teléfono. Hallazgo: C-02.

### Contenido educativo
Revisado en muestra (Saturno, Marte, vista orbital y componentes de `learn/` y `station/`), **no las 8 estaciones completas**. Observado en Saturno: tres niveles (Descubrir / Entender mejor / Profundizar), comparaciones concretas verificables (pelota de 22 cm → Saturno de ≈ 2,1 m, coherente con 120.536/12.756; división de Cassini 4.800 km frente a Arica–Punta Arenas), «Para recordar», pregunta de la estación y quiz de 3 preguntas, acción 3D propia («Explorar los anillos»), siguiente estación con distancia y enlace «Cómo llegar». Para el visitante: puede identificar el planeta, interactuar, aprender un concepto, profundizar y continuar. Los textos de las pestañas están en bloques cortos. Pendiente: validación con público real (docentes, niños), revisión de las 7 estaciones restantes y fuentes de las cifras de lunas (sección 12).

### Diseño móvil
360×640 y 320 en e2e: sin desbordes, barra de modos fija, controles 3D lateral accesibles con una mano. Hallazgos: C-03, C-04. No evaluado: lectura bajo luz solar (fondo oscuro; los contrastes no se midieron bajo luz real), una sola mano en dispositivo real.

### Rendimiento
Medido (decodificado): portada 1,74 MB, estaciones con 3D 2,0–2,25 MB, sistema solar 2,6 MB, `/diagnostico` 2,4 MB; transferencia con gzip. Carga a «load» ≈ 3,7–4,8 s en un entorno con espera fija de 3,5 s incluida (no es una métrica de Lighthouse). Hallazgo: C-01. Sin Lighthouse ni perfilado en dispositivo.

### Seguridad
Sin secretos ni backend; cabeceras de seguridad básicas; sin `eval`; sin `dangerouslySetInnerHTML` con datos de usuario. No hay `Content-Security-Policy` (mejora P3). Dependencias: 0 vulnerabilidades en producción. Peticiones externas únicamente a OSM. Hallazgo: C-05.

### Accesibilidad
axe-core sin problemas graves en 4 rutas (e2e), enlace de salto, un `h1`, `lang`, etiquetas en controles icónicos (axe no reportó problemas graves; mi sonda propia de «controles sin etiqueta» dio falsos positivos y se descartó), alternativas por teclado en el visor 3D, movimiento reducido considerado en el código (`useReducedMotion`). Fallos: tamaños táctiles (C-03). No ejecutado: lector de pantalla, navegación completa por teclado en todas las vistas, contraste bajo sol.

### SEO y metadatos
Ver C-09. Existen títulos y descripciones por página, `manifest.webmanifest`, iconos, tema de color. Faltan robots, sitemap e imagen social.

---

## 9. Plan de correcciones priorizado

### P0 — bloqueos críticos
Ninguno detectado.

### P1 — antes de una prueba pública / instalación
| ID | Problema | Impacto | Archivos | Solución | Dependencias | Criterio de aceptación | Complejidad |
|---|---|---|---|---|---|---|---|
| P1-1 (F-03) | Sin Git | Sin reversión | raíz | `git init`, commit inicial, mover fuera de OneDrive | — | Commit inicial limpio | Baja |
| P1-2 (F-01) | Ubicaciones sin verificar | No hay instalación | `src/config/stations.ts` | Visita a terreno; cargar coordenadas y datos de sitio | Permisos, decisión de escala | 8 estaciones `verificada` | Alta |
| P1-3 (F-02) | Sin dominio ni QR de producción | No se puede imprimir | `.env.production.local`, `scripts/qr` | Dominio HTTPS + `npm run qr:prod` + prueba impresa | P1-2 recomendable, dominio | QR de producción verificados con cámara | Media |
| P1-4 (E-01) | Sin prueba en teléfono real | GPS, brújula, AR sin validar | docs/PRUEBAS-EN-CELULAR.md | Ejecutar checklist de la sección 10 | Túnel HTTPS | Fichas completas Android e iPhone | Media |

### P2 — mejoras relevantes de calidad
| ID | Problema | Impacto | Archivos | Solución | Dependencias | Criterio | Complejidad |
|---|---|---|---|---|---|---|---|
| P2-1 (C-01) | Three en todas las páginas | Peso innecesario | grafo de módulos compartido | Localizar y aislar el import | — | `/` sin chunks de WebGL | Media |
| P2-2 (C-02) | Brújula Android sin compensación | Flecha imprecisa | `useCompass.ts` | Rotación completa + declinación | P1-4 (pruebas) | Error documentado < umbral | Media |
| P2-3 (C-03) | Objetivos táctiles | Dificulta el uso | `globals.css`, `Bitacora.tsx`, mapa | `min-height` ≥ 44 px | — | Sonda sin controles < 24 px | Baja |
| P2-4 (C-04) | Etiquetas orbitales | Confusión | `OrbitsMode.tsx`, `labels.tsx` | Alto de escena y colisiones | — | Sin recortes ni solapes en 360×640 | Media |
| P2-5 (C-09) | SEO | Baja visibilidad | `src/app` | robots, sitemap, OG | Dominio | 200 y vista previa correcta | Baja |

### P3 — optimizaciones y mejoras futuras
| ID | Problema | Solución | Criterio | Complejidad |
|---|---|---|---|---|
| P3-1 (C-05) | Petición OSM en diagnóstico | Bajo demanda o aclarar texto | Sin petición automática | Baja |
| P3-2 (C-06) | CSV sin BOM | Añadir BOM | Excel correcto | Baja |
| P3-3 (C-07) | Caché de texturas | Hash en nombres o versión automática | Texturas nuevas se reflejan | Baja |
| P3-4 (C-08) | Icono maskable | Nuevo icono | Sin recortes | Baja |
| P3-5 (C-10) | Aviso `THREE.Clock` | Actualizar dependencia | Sin aviso | Baja |
| P3-6 | CSP | Política mínima | Sin bloqueos en prueba | Media |
| P3-7 (E-07/E-08) | ESLint dev y recordatorio de lunas | Revisión periódica | — | Baja |

---

## 10. Checklist para pruebas desde el celular

### Ya ejecutado (emulación en Chromium, NO en teléfono)
- [x] Todas las rutas abren sin errores de consola y sin scroll horizontal a 360 px.
- [x] Navegación entre las 8 estaciones y los 5 modos conservando la estación.
- [x] Controles 3D (zoom, giro, restablecer, pantalla ampliada) por pruebas e2e.
- [x] Mapa sin mapa base; orientación sin permiso de ubicación; ubicación simulada.
- [x] Página sin conexión tras visita previa (localhost).
- [x] QR de desarrollo decodificados por software.

### Requiere dispositivo físico (pendiente)
- [ ] **Acceso mediante QR:** escanear con la cámara nativa (Android e iPhone), de día y a pleno sol; el QR impreso en el material final.
- [ ] **Navegación entre estaciones:** botón «Siguiente» y barra inferior con una mano.
- [ ] **Interacción 3D:** giro con un dedo, zoom con pellizco, sin que se desplace la página; fluidez en gama media.
- [ ] **Orientación de la cámara/3D** al rotar el teléfono (vertical/horizontal).
- [ ] **Mapa:** carga de teselas con datos móviles, gesto de zoom, marcador de ubicación.
- [ ] **Permisos de GPS:** aceptar, denegar y revocar; mensajes; precisión al aire libre.
- [ ] **Permisos de orientación:** iOS (pide permiso explícito), Android (evento absoluto); inclinación del teléfono vs. flecha.
- [ ] **Comportamiento sin permisos:** la app sigue usable con la estación del QR.
- [ ] **Lectura bajo luz solar:** brillo y contraste de textos, botones y panel.
- [ ] **Conectividad limitada:** 3G/sin señal; tiempo hasta primera pantalla; modo sin conexión en HTTPS real.
- [ ] **Rendimiento:** FPS en el visor, calentamiento, consumo de batería durante 5 minutos.
- [ ] **Navegación y botones:** alcance del pulgar, objetivos táctiles de la sección C-03.
- [ ] **AR:** WebXR en Android, AR Quick Look en iPhone.
- [ ] **Instalación PWA:** icono, pantalla de inicio.

---

## 11. Decisiones que deben conservarse

Resumen de la sección 6: modelo de tres distancias y escala 1 UA = 2 km (M-01); Astronomy Engine y fechas de Chile (M-02); etiquetado de ubicaciones provisionales (M-03); aclaración entre escala orbital y física (M-04); desmontaje de escenas 3D y Cache Components desactivado (M-05); generador de QR con validaciones estrictas (M-06); privacidad y permisos bajo acción del usuario (M-07); aviso de seguridad vial (M-08); diseño móvil sin desbordes (M-09); conjunto de pruebas (M-10). Los identificadores de estación no deben cambiar tras imprimir los QR.

---

## 12. Limitaciones y riesgos pendientes

- **Geografía no verificada:** ninguna coordenada de escultura es real; el trazado y los extremos provienen de OSRM/Nominatim, sin validación en terreno. Los planetas rocosos caen en zona urbana.
- **Sin dominio definitivo:** los QR de producción no existen; los de desarrollo apuntan a IP/túneles temporales y dejan de servir si cambian.
- **Sin pruebas físicas:** GPS, brújula, AR, cámara y rendimiento solo emulados.
- **Datos astronómicos pendientes de validación científica:** no se pudo consultar NASA/IAU en línea. Se comprobaron a mano la coherencia interna (distancias, tiempo de luz, escala de la pelota de fútbol) y las cifras de diámetros y distancias medias, que coinciden con los valores habituales de la ficha planetaria de NASA según el conocimiento del auditor (no contrastados en línea). **Las cifras de lunas (Júpiter 115, Saturno 293, Urano 29, fechas 2026-08/09) y las fechas de las fuentes no se pudieron contrastar**, por lo que quedan «pendiente de validación científica». Las simplificaciones conocidas están declaradas (modelo VSOP87 truncado ≈ 1′, 1900–2100, superficies artísticas, anillos de Urano realzados, Gran Mancha Roja según la textura).
- **Distancia media vs instantánea:** las esculturas representan el semieje mayor; la app lo explica en la vista orbital (M-04). No se revisó que lo explique también en cada una de las 8 estaciones.
- **Contenido educativo** auditado solo en muestra.
- **Entorno:** emulación en Chromium con WebGL por software; no se probó Safari, Firefox ni lectores de pantalla.
- **Medición de rendimiento:** los tiempos y pesos no sustituyen a Lighthouse ni a un perfil en teléfono.

---

## 13. Conclusión

**Corregir primero:** (1) iniciar el control de versiones y respaldar el estado actual (F-03); (2) ejecutar la ronda de pruebas en teléfonos físicos con HTTPS (E-01/P1-4), porque es lo único que puede invalidar GPS, brújula y AR; (3) resolver los puntos P2 de bajo costo (C-01 peso inicial, C-03 objetivos táctiles, C-04 etiquetas orbitales).

**Condiciones para considerar el proyecto listo para pruebas con usuarios:** la prueba en teléfonos Android e iPhone sin fallas bloqueantes; QR de desarrollo funcionando con túnel HTTPS; confirmación de que ningún dato provisional se presenta como definitivo (ya cumplido); y validación del contenido con al menos un grupo de docentes/familias.

**Condiciones para la instalación física:** ubicaciones verificadas y seguras de las 8 esculturas (F-01), permisos, dominio HTTPS y QR de producción impresos y leídos con cámara a pleno sol (F-02), proveedor de teselas apropiado, y revisión científica de las cifras pendientes.


---

## 14. Re-auditoría de las correcciones (18-10-2026)

Material revisado: `sistema-solar-cambios-auditoria.zip` (53 archivos, aparecido en la carpeta del proyecto el 17-10-2026 23:53). Se aplicó sobre una copia aislada (`C:\tmp\sistema-solar-audit2`); **la carpeta original no se modificó: los cambios del zip siguen sin estar aplicados en ella**. La dependencia nueva es solo `magvar 2.2.0` (MIT, sin scripts de instalación); el resto de `package-lock.json` es idéntico. Se revisó el código del zip por inspección y se repitieron las mediciones en ejecución.

### Controles técnicos (copia con los cambios)

| Prueba | Resultado | Evidencia |
|---|---|---|
| `npm ci`, `typecheck`, `lint` | APROBADA | sin errores |
| Pruebas unitarias | APROBADA | 61/61 (6 archivos) |
| Compilación | APROBADA | incluye `robots.txt`, `sitemap.xml` y `opengraph-image` (portada y 8 estaciones) |
| e2e Playwright | APROBADA | 102 aprobadas, 3 omitidas a propósito (coincide con lo declarado) |
| `npm audit --omit=dev` | APROBADA | 0 vulnerabilidades |
| Sondas propias en 57 rutas (360×640) | APROBADA | sin errores de consola ni desbordes |

### Estado de cada hallazgo

| ID | Estado tras re-auditoría | Evidencia propia |
|---|---|---|
| C-01 Three.js en todas las páginas | **CORREGIDO** | Portada 1.738 → 1.009 KB; `/aprender` 1.750 → ~840 KB; 404 1.706 → 977 KB; 0 fragmentos con `WebGLRenderer` al abrir `/` |
| C-02 Brújula Android | **MITIGADO (sin probar en dispositivo)** | `headingFromDeviceOrientation` + declinación WMM2025 (`src/lib/declination.ts`, `OrientMode.tsx`). Verifiqué por derivación que las columnas de la matriz Rz·Rx·Ry y el rumbo con el teléfono horizontal (= −alpha) son correctos. Falta el criterio de aceptación físico |
| C-03 Objetivos táctiles | **CORREGIDO en lo medido, con matiz** | Ningún control propio < 24 px salvo el enlace «Leaflet»/atribución (23 px de alto). Marca, enlaces de texto, bitácora y zoom del mapa ≥ 44 px. **Pero muchos botones miden 40 px** (p. ej. «Pausar giro», «Activar brújula», «Ahora»): la afirmación «todos ≥ 44 px» es inexacta (ver N-02) |
| C-04 Vista orbital | **CORREGIDO** | Escena de 410 px de alto en 360×640 (antes ≈ 280); en 360×640, 320×568, 412×915 y 640×360: 0 etiquetas cortadas y 0 solapadas (medido sobre el DOM); captura revisada |
| C-05 Diagnóstico | **CORREGIDO** | `/diagnostico` ya no pide nada a `tile.openstreetmap.org`; botón «Probar el mapa base» e indicación del servidor consultado |
| C-06 CSV | **CORREGIDO (por inspección)** | BOM añadido en `scripts/qr/lib.ts` y prueba unitaria; no abrí el CSV en Excel |
| C-07 Caché de texturas | **CORREGIDO (inspección + prueba sin conexión)** | `sw.js` v2 con revalidación; la página visitada y sus texturas siguen cargando sin conexión; `Cache-Control` de 1 día |
| C-08 Icono maskable | **CORREGIDO** | `/icon-maskable-512.png` responde 200 y el manifest lo usa |
| C-09 SEO | **CORREGIDO con una reserva** | `robots.txt` 200 (excluye `/diagnostico` y `/qr`); `sitemap.xml` 200 pero **vacío** mientras no haya dominio; imágenes OG por estación 200 (`image/png`); ver N-01 |
| C-10 `THREE.Clock` | Sin cambios (dependencia) | |
| §12 Cifras científicas | **VERIFICADO** | Contrasté en línea la ficha planetaria de NASA (actualizada el 18-03-2025): diámetro, gravedad, rotación, distancia y período de los 7 planetas coinciden con `bodies.ts`. Lunas: Júpiter 115 (NASA Science, página actualizada el 21-09-2026), Saturno 293 y Urano 29 (agosto de 2026) coinciden. No re-verifiqué una por una las 98 cifras ni la ficha del Sol |
| F-01, F-02, F-03 | **SIN CAMBIOS (siguen pendientes)** | Dependen de terreno, dominio y de ejecutar `git init` |

### Incidencias nuevas o residuales

#### N-01 Las imágenes para compartir apuntan a `localhost:3000` si se compila sin dominio
- **Categoría:** CORREGIR | **Prioridad:** P2 (P1 el día de publicar) | **Estado:** Reproducido
- **Evidencia:** en el HTML de `/estacion/saturno`, `og:image` y `twitter:image` son `http://localhost:3000/estacion/saturno/opengraph-image?…`, porque `metadataBase` queda `undefined` y el HTML es estático (se fija al compilar). La documentación lo admite «hasta configurar el dominio».
- **Impacto:** si se publica sin `NEXT_PUBLIC_SITE_URL` en el entorno de compilación, WhatsApp y redes no mostrarán imagen y el sitemap saldrá vacío.
- **Recomendación:** hacer que el build falle (o avise de forma visible) cuando se compile para producción en el servicio de despliegue sin `NEXT_PUBLIC_SITE_URL`; añadirlo a la lista de pasos de publicación.
- **Criterio de aceptación:** compilando con el dominio, `og:image` es `https://<dominio>/…` y `/sitemap.xml` lista 6 + 40 URL.

#### N-02 La afirmación «todos los controles ≥ 44 px» no se cumple
- **Categoría:** CORREGIR (consistencia con la documentación) | **Prioridad:** P3 | **Estado:** Reproducido
- **Evidencia:** botones de 40 px de alto en `/aprender`, `/orientarme`, estaciones, sistema solar y `/diagnostico`; el enlace «Leaflet»/atribución mide 23 px. Todos superan el mínimo AA de 24 px excepto la atribución (cubierta por la excepción de texto en línea).
- **Recomendación:** subir `.btn` a `min-height: 44px`, o corregir `docs/RESPUESTA-AUDITORIA.md` para decir «≥ 40 px».
- **Criterio de aceptación:** la sonda de objetivos táctiles no lista botones < 44 px, o la documentación coincide con la medición.

#### N-03 Vista orbital en horizontal: la escena ocupa casi toda la pantalla
- **Categoría:** MEJORAR | **Prioridad:** P3 | **Estado:** Reproducido (medición, sin captura)
- **Evidencia:** en 640×360 `stage--orbits` mide 340 px (`min-height: 340px`) sobre un viewport de 360 px; los controles y el texto quedan fuera de la primera pantalla.
- **Recomendación:** `min-height` menor en horizontal (`@media (orientation: landscape)`).

#### N-04 Marte y Venus quedan sin nombre en la vista inicial de pantallas pequeñas
- **Categoría:** MEJORAR | **Prioridad:** P3 | **Estado:** Reproducido
- **Evidencia:** en 360×640 y 320×568 la vista por defecto nombra Mercurio, Tierra, Júpiter, Saturno y Urano (Marte solo si es la estación elegida); Venus no se nombra en ningún tamaño probado. La respuesta documenta que se ocultan «Mercurio y Venus», lo que no coincide exactamente con lo observado. La lista de planetas bajo la escena sí permite identificarlos.
- **Recomendación:** documentar la regla real o ajustar la prioridad para que Marte y Venus aparezcan al acercar o al tocar.

#### N-05 Proyector de etiquetas: lecturas de layout en cada cuadro
- **Categoría:** MEJORAR | **Prioridad:** P3 | **Estado:** Inspección estática (sin perfilado)
- **Ubicación:** `src/components/three/labels.tsx` (`reservedAreas` y `offsetWidth`/`offsetHeight` por etiqueta en cada `useFrame`).
- **Riesgo:** forzar recálculo de estilos en cada cuadro en teléfonos modestos. Solo se confirma con un perfil en un dispositivo real; no se midió.

#### N-06 Dependencia nueva `magvar` y tipos escritos a mano
- **Categoría:** MEJORAR | **Prioridad:** P3 | **Estado:** Inspección estática
- **Detalle:** paquete pequeño, fijado a versión exacta (`2.2.0`), MIT, sin scripts de instalación. Sus tipos (`src/types/magvar.d.ts`) son manuales. El modelo vence en 2030 (la app lo avisa con `withinValidity`).
- **Recomendación:** anotar la revisión del modelo en el mantenimiento; la prueba unitaria con valores de NOAA ya protege contra regresiones.

### Qué sigue sin verificar
Brújula y declinación en un teléfono real, GPS real, AR, lectura de QR con cámara, rendimiento en gama media, lector de pantalla, Safari y Firefox. Las posiciones de las esculturas, el dominio y los QR de producción siguen pendientes (F-01, F-02). El código del zip **no está aplicado en la carpeta del proyecto**: hasta copiarlo, esa carpeta conserva los hallazgos originales.

### Conclusión de la re-auditoría
Las correcciones C-01 a C-09 cumplen sus criterios de aceptación en lo medible desde el entorno de pruebas, sin regresiones detectadas (61/61 unitarias, 102/102 e2e, 0 errores de consola). Las incidencias nuevas son menores: una P2 de despliegue (N-01) y el resto P3. Siguientes pasos: aplicar el zip a la carpeta real, `git init` (F-03), prueba física de brújula y GPS, y resolver N-01 antes de publicar.
