# Respuesta a la auditoría

Respuesta, punto por punto, a [`AUDITORIA_PROYECTO.md`](../AUDITORIA_PROYECTO.md) (17-10-2026). Fecha de las correcciones: 17-10-2026.

Estados: **Corregido** (hecho y con prueba automática), **Mitigado** (mejorado; falta la prueba en dispositivo), **Pendiente (externo)** (depende de decisiones, terreno, dominio o teléfonos físicos), **Sin cambios** (se justifica).

## Resumen

| ID | Hallazgo | Estado | Evidencia |
|---|---|---|---|
| F-01 | Ubicaciones de las esculturas sin verificar | Pendiente (externo) | Requiere terreno y permisos. La app sigue marcándolas como «propuestas» |
| F-02 | Sin dominio ni QR de producción | Pendiente (externo) | Generador listo (`npm run qr:prod`). Se niega a usar URL no definitivas |
| F-03 | Sin control de versiones | Pendiente (tú) | Comandos abajo. Desde la conexión remota no se puede crear el repositorio de forma segura |
| C-01 | Three.js en todas las páginas | **Corregido** | e2e «C-01». Portada: 1.738 → 1.062 KB decodificados |
| C-02 | Brújula de Android sin compensar inclinación ni declinación | **Mitigado** | Rotación completa + WMM2025. 10 pruebas unitarias; falta comparar en terreno |
| C-03 | Objetivos táctiles pequeños | **Corregido** | e2e «C-03» en 320 y 412 px |
| C-04 | Vista orbital baja y etiquetas encimadas o cortadas | **Corregido** | e2e «C-04». Escena 410 px de alto en 360×640 (antes ≈ 280) |
| C-05 | Diagnóstico pedía teselas a OSM al abrirse | **Corregido** | e2e «C-05»: sin peticiones externas al abrir |
| C-06 | CSV sin BOM | **Corregido** | Prueba unitaria: BOM UTF-8 y «Júpiter» legible |
| C-07 | Caché de texturas sin versionado | **Corregido** | `public/sw.js` v2: revalidación en segundo plano |
| C-08 | Icono maskable reutilizado | **Corregido** | `icon-maskable-512.png`, contenido dentro del círculo seguro (radio 190 de 205 px) |
| C-09 | Faltan robots, sitemap e imagen social | **Corregido** | e2e «C-08/C-09». El sitemap queda vacío hasta configurar el dominio |
| C-10 | Aviso `THREE.Clock` | Sin cambios (dependencia) | Proviene de `@react-three/fiber`. Se eliminó el uso propio en realidad aumentada |
| §12 | Cifras científicas sin contrastar en línea | **Corregido** | Comparación automática con NASA (ver abajo) |

## Detalle

### F-03: control de versiones (lo haces tú, una vez)

En la carpeta del proyecto, con Git para Windows:

```bash
git init
git add .
git commit -m "Estado inicial: app, QR, documentación y respuesta a la auditoría"
```

El `.gitignore` ya excluye `node_modules`, `.next`, los reportes de pruebas y `artifacts/qr/desarrollo`. Antes de `npm install` conviene mover la carpeta fuera de OneDrive (por ejemplo a `C:\proyectos\sistema-solar`) o pausar la sincronización.

No lo hice desde aquí por dos razones:

- El acceso remoto a tu carpeta no permite borrar archivos, y Git necesita crear y borrar archivos de bloqueo.
- Un repositorio creado desde Linux marcaría todos los archivos como ejecutables.

### C-01: Three.js fuera de las páginas sin 3D

**Causa:** `src/components/planet/ar.ts` importaba `three` de forma estática. `ArButton` va dentro de cada estación, así que Three.js quedaba en el fragmento de esa ruta, y la precarga de enlaces de Next lo descargaba en cualquier página que enlazara una estación (portada, Aprender, 404).

**Solución:**

- La detección de realidad aumentada quedó en `ar.ts`, sin `three`.
- La parte 3D pasó a `arSession.ts`, que se carga solo al pulsar el botón.
- Además se dejó de precargar una tipografía cursiva que no se usa (24 KB).

**Medición** (360 px, decodificado, incluida la precarga en segundo plano de las 8 estaciones):

| Página | Antes (auditoría) | Ahora | Fragmentos con three.js |
|---|---|---|---|
| `/` | 1.738 KB | 1.062 KB | ninguno |
| `/aprender` | 1.750 KB | 1.021 KB | ninguno |
| `/fuentes` | 1.730 KB | 1.003 KB | ninguno |
| 404 | 1.706 KB | 977 KB | ninguno |
| `/estacion/saturno` | ≈ 2.050 KB | 2.047 KB | sí (tiene 3D) |

Unos 200 KB de la portada corresponden a la precarga de las estaciones enlazadas. Ocurre después de mostrar la página y hace instantáneo el paso a cada estación, por eso se mantuvo.

### C-02: brújula

- **Rumbo en Android:** ahora se calcula con la rotación completa del teléfono (alpha, beta y gamma), en `headingFromDeviceOrientation`. Con el teléfono horizontal manda el borde superior de la pantalla (igual que antes). Al ponerlo vertical pasa a mandar la parte trasera. Así deja de depender de `alpha` sola, que se vuelve inestable cerca de la vertical. Un detalle técnico: con el teléfono horizontal o inclinado hacia la persona, la fórmula anterior (`360 − alpha`) ya era correcta para el borde superior. La mejora real está en las posturas casi verticales o giradas.
- **Declinación:** se corrige con el World Magnetic Model 2025 (`magvar`, MIT), que reproduce los 12 valores de prueba oficiales de NOAA. En la ruta son +3,1° en San Carlos y +2,8° en San Fabián (octubre de 2026). La flecha y el rumbo mostrado ya se refieren al norte geográfico.
- **Pruebas:** 10 pruebas unitarias nuevas en `tests/unit/compass.test.ts`, que cubren posturas, continuidad al pasar por la vertical, rotación de pantalla y valores de NOAA.
- **Pendiente:** el criterio de aceptación de la auditoría (comparar con una brújula de referencia, con el teléfono horizontal e inclinado) requiere un teléfono. Está agregado a la guía de pruebas.

### C-03: objetivos táctiles

Ahora miden al menos 44 px:

- La marca del encabezado.
- Los enlaces de texto que van solos (clase `text-link--block`).
- Los de la bitácora.
- Los botones de zoom del mapa.
- Los nombres de estación en la tabla del mapa.

Los enlaces dentro de una frase (excepción de WCAG 2.5.8) ganaron área táctil sin mover el texto. Los enlaces del pie de la portada, de la estación y de Aprender se sacaron de la frase a una fila propia. La atribución de OpenStreetMap conserva su tamaño, pero su área de toque es más alta.

### C-04: vista orbital

- **Escena:** más alta en el teléfono (64 % del alto: 410 px en 360×640).
- **Etiquetas:** cada una prueba encima de su punto, luego debajo, y si no cabe se oculta. Nunca se cortan en un borde ni quedan bajo los botones flotantes (`data-label-avoid`). La prioridad la tienen el planeta de la estación y la Tierra.
- **Resultado medido:**
  - 360×640: Tierra, Marte, Júpiter, Saturno y Urano visibles, sin solapes.
  - 320×568: lo mismo.
  - 412×915: también Mercurio.
- **Al ocultarse:** Mercurio y Venus se ocultan en pantallas chicas porque quedan pegados al Sol; se ven al acercar la vista o al elegirlos.
- **Saturno:** sus etiquetas de anillos se repartieron alrededor del anillo y ahora se ven las tres en todos los tamaños.

### C-05: diagnóstico

El mapa base se prueba con el botón «Probar el mapa base». La página indica qué servidor se consulta y qué ve ese servidor (la IP, no la ubicación). Al abrirse, el panel solo descarga recursos del propio sitio.

### C-06 a C-09

- **C-06:** el CSV lleva BOM UTF-8 y saltos de línea de Windows.
- **C-07:** las texturas se sirven desde la caché y se revalidan con una petición condicional; la cabecera HTTP pasó de 7 días a 1 día con `stale-while-revalidate`. Las cachés del service worker están acotadas (40 páginas, 160 recursos).
- **C-08:** `icon-maskable-512.png` con zona segura.
- **C-09:**
  - `robots.txt` excluye `/diagnostico` y `/qr`.
  - `sitemap.xml` incluye las 8 estaciones y sus 5 modos cuando exista `NEXT_PUBLIC_SITE_URL`.
  - Cada estación tiene imagen para compartir (1200×630, generada al compilar) y título propio.
  - `metadataBase` toma el dominio configurado; hasta entonces, la imagen apunta a `localhost` (normal en pruebas).

### Validación científica (§12 de la auditoría)

La auditoría no pudo consultar NASA en línea. Se hizo el 17-10-2026:

- **Planetas:** las 98 cifras de los 7 planetas en `src/data/bodies.ts` coinciden exactamente con la [Planetary Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/) (actualizada el 18-03-2025). Se compararon de forma automática.
- **Sol:** todas sus cifras coinciden con la [Sun Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html).
- **Lunas:** Júpiter 115, Saturno 293 y Urano 29, contrastadas con las páginas de NASA Science del mismo día. Son más recientes que la ficha (95, 274 y 28). Corrección de texto: no todas las lunas de Urano tienen nombre todavía.
- **Trazado:** OSRM devuelve hoy 43.328 m frente a los 43.274 m guardados (0,1 %, por cambios en OpenStreetMap).

## Verificación

`npm run verify` (genera los tipos de rutas, TypeScript, ESLint, 61 de 61 pruebas unitarias y compilación de producción) sin errores. `npm run test:e2e`: **102 aprobadas, 0 fallidas, 3 omitidas a propósito** (teclado físico en los perfiles móviles y la medición táctil en el perfil de escritorio), incluidas las pruebas nuevas de los criterios C-01, C-03, C-04, C-05, C-08 y C-09. Todo en Chromium emulado: sigue sin probarse en teléfonos físicos.

## Lo que sigue (en orden)

1. Crear el repositorio Git (F-03).
2. Probar en teléfonos Android e iPhone con `npm run tunel` y [PRUEBAS-EN-CELULAR.md](PRUEBAS-EN-CELULAR.md). Incluye ahora la comparación de la brújula.
3. Validar los textos con docentes y familias.
4. Definir sitios (F-01), dominio y QR de producción (F-02), y un proveedor de mapas para producción.
5. Antes de 2030: actualizar `magvar` al modelo WMM2030.
