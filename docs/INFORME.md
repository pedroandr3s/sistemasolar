# Informe de implementación

Estado al 17 de octubre de 2026. Proyecto listo para la **primera prueba desde un teléfono**; no para instalación física (faltan sitios verificados y dominio).

> **Actualización tras la auditoría** (`AUDITORIA_PROYECTO.md`). Se corrigieron C-01 a C-09 y se contrastaron en línea con NASA las cifras científicas. La brújula ahora usa la rotación completa del teléfono y corrige la declinación magnética (WMM2025). Lo que depende de terreno, dominio, teléfonos o Git quedó documentado. Detalle y evidencia en [RESPUESTA-AUDITORIA.md](RESPUESTA-AUDITORIA.md).

## Qué se implementó

| Entregable | Dónde | Estado |
|---|---|---|
| App web Next.js 16 (App Router, TypeScript estricto) | `src/app` | Funciona; compila sin errores |
| Página inicial con el recorrido a escala | `/` | Hecha |
| Una página por estación (8), generada de forma estática | `/estacion/<id>` | Hecha: sol, mercurio, venus, tierra, marte, jupiter, saturno, urano |
| Cinco modos que conservan la estación del QR | `/estacion/<id>`, `/orientarme`, `/sistema-solar`, `/mapa`, `/aprender` | Hechos (también existen sin estación) |
| Visualizador 3D de los 8 cuerpos (Three.js + React Three Fiber) | `src/components/planet` | Giro táctil, zoom, restablecer, vista ampliada, etiquetas, giro automático y pausa, comparación con la Tierra, acción propia por planeta, alternativas de teclado |
| Realidad aumentada opcional | `src/components/planet/ar.ts` | WebXR (Android) y AR Quick Look (iPhone); el botón solo aparece si el equipo la admite. **No probada en un dispositivo** |
| Orientarme: GPS, estación más cercana, siguiente, distancias, brújula | `src/components/orient` | Hecho; flecha con abanico de incertidumbre, se oculta si la precisión no alcanza; aviso de seguridad y detección de velocidad de vehículo; rumbo con la rotación completa del teléfono y corrección de declinación magnética (WMM2025) |
| Sistema solar por fecha y hora | `src/components/orbits`, `src/lib/astro.ts` | Posiciones heliocéntricas con Astronomy Engine; fecha, «Ahora», pasos, reproducción, velocidad, órbitas, etiquetas, distancias, vista superior y oblicua |
| Mapa del recorrido | `src/components/map` | Leaflet + OpenStreetMap; trazado real de la ruta (OSRM/OSM), estaciones propuestas con borde punteado, tabla de distancias, ubicación del visitante |
| Aprender: tres niveles por estación, comparaciones, quiz, preguntas, rotación/traslación, viaje desde el Sol | `src/components/learn`, `src/components/station` | Hecho |
| Bitácora con insignias locales y experiencia final en Urano («El viaje de la luz») | `/bitacora`, `src/components/station/FinalJourney.tsx` | Hecha; solo `localStorage` |
| Datos científicos tipados con fuente y fecha | `src/data/bodies.ts`, `src/data/sources.ts` | Hechos; lunas verificadas en NASA el 17-10-2026 (Júpiter 115, Saturno 293, Urano 29) |
| Configuración de estaciones, escala y coordenadas | `src/config/stations.ts`, `src/config/scale.ts` | Hecha; ninguna coordenada se presenta como verificada |
| Generador de QR (PNG, SVG, PDF imprimible, fichas de prueba, manifiesto JSON/CSV) | `scripts/qr`, `npm run qr:dev`, `npm run qr:prod` | Hecho y probado; verifica cada código decodificándolo |
| Túnel HTTPS de prueba + QR con su dirección | `npm run tunel` | Hecho (requiere instalar `cloudflared`); no se pudo ejecutar en este entorno |
| Panel de diagnóstico | `/diagnostico` | Hecho; no pide permisos por sí solo ni envía datos |
| QR en pantalla para pruebas | `/qr` | Hecho |
| PWA con caché selectiva | `public/sw.js`, `src/app/manifest.ts` | Solo en producción con HTTPS; páginas visitadas y texturas, nunca teselas del mapa |
| Pruebas automatizadas | `tests/unit`, `tests/e2e` | Ver abajo |
| `.env.example` sin secretos | raíz | Hecho |
| Documentación | `README.md`, `docs/` | Hecha |

## Tecnologías

Next.js 16.4 + React 19.3 + TypeScript 5 (estricto, `noUncheckedIndexedAccess`); Three.js 0.186 con @react-three/fiber 9 y drei 10; astronomy-engine 2.1.19 (MIT, VSOP87 truncado, ≈1′); Leaflet 1.9 + react-leaflet 5; Tailwind CSS 4 y CSS propio; qrcode, pdf-lib, jsqr y pngjs para los QR; Vitest, Playwright y axe-core para pruebas. Justificación detallada en [DECISIONES.md](DECISIONES.md).

## Comandos ejecutados y resultados

Ejecutados en un entorno Linux con Node 22 y Chromium sin ventana (WebGL por software):

| Comando | Resultado |
|---|---|
| `npm ci` en una copia limpia (los mismos archivos de tu carpeta) | Correcto; luego tipos, linter, pruebas unitarias y compilación también correctos en esa copia |
| `npm run typecheck` | Sin errores (genera antes los tipos de rutas de Next con `next typegen`) |
| `npm run lint` | Sin errores ni advertencias |
| `npm test` (Vitest) | **61 de 61** pruebas en 6 archivos: datos científicos completos y con fuente, escala, geodesia, trazado, siguiente estación en ambos sentidos, coordenadas ausentes, orientación y aviso de vehículo, rumbo del teléfono en distintas posturas, declinación magnética contra los valores oficiales de NOAA, comprobaciones astronómicas (perihelio, equinoccio, solsticio, inclinación de Mercurio), horario de Chile con cambio de hora, validación de URL, generación y decodificación de los 8 QR (con CSV legible en Excel), detección de IP local |
| `npm run build` | Correcto: 8 estaciones × 5 modos generadas de forma estática |
| `npm run test:e2e` (Playwright) | **102 aprobadas**, 0 fallidas, 3 omitidas a propósito (teclado físico en los perfiles móviles; medición táctil en el perfil de escritorio). Incluye los criterios de aceptación de la auditoría |
| `npm run qr:prod` sin dominio | Se niega a generar (comportamiento esperado) |
| `npm run qr:dev -- --base http://192.168.1.50:3000` | 8 códigos verificados, PDF y manifiesto correctos (prueba del generador; esos QR no se entregan porque la IP es de ejemplo) |

Las pruebas de navegador cubren móvil pequeño (320 × 640), móvil (Pixel 7) y escritorio: rutas de las 8 estaciones, 404, cambio entre los cinco modos, controles 3D, error de descarga de texturas, orientación con y sin permiso de ubicación (la ubicación con permiso es **simulada por la prueba**), fecha en la vista orbital, mapa sin conexión al mapa base, quiz, bitácora, experiencia final, diagnóstico, página /qr, ausencia de desbordamiento horizontal, navegación por teclado y accesibilidad automática (axe: sin problemas graves).

Durante esta revisión se corrigieron tres errores encontrados por las pruebas: el mapa fallaba al salir de él por una limpieza de Leaflet («_leaflet_pos»); en pantallas de 320 px los selectores de la vista orbital ensanchaban la página y dejaban la barra de modos fuera de la pantalla; y `npm run typecheck` fallaba en una copia recién instalada porque los tipos de rutas de Next solo existían después de compilar.

`npm audit`: 0 vulnerabilidades en dependencias de producción; 5 de severidad alta solo en herramientas de desarrollo (ESLint), ver [DATOS-PENDIENTES-Y-LIMITACIONES.md](DATOS-PENDIENTES-Y-LIMITACIONES.md).

**No probado**: teléfonos físicos (Android e iPhone), GPS real, brújula, realidad aumentada, el túnel `cloudflared` y la lectura de QR impresos con cámaras nativas. El procedimiento está en [PRUEBAS-EN-CELULAR.md](PRUEBAS-EN-CELULAR.md).

## Dónde están los QR y los PDF

- Generador: `scripts/qr/`. Salida: `artifacts/qr/desarrollo/` y `artifacts/qr/produccion/` (ver `artifacts/qr/LEEME.md`).
- **Los QR de prueba se generan en tu computador** con `npm run qr:dev` (red local) o `npm run tunel` (HTTPS), porque deben llevar la dirección real con que el teléfono abrirá la app.
- **Los QR definitivos no existen todavía**: requieren el dominio. El generador rechaza a propósito URL vacías, de ejemplo, HTTP, de red local o de túneles.

## Cómo iniciar y probar desde el teléfono

```bash
npm install
npm run dev          # http://localhost:3000 en el computador
npm run qr:dev       # en otra terminal: QR de prueba con la IP de la red local
```

Para GPS y brújula (requieren HTTPS): `npm run build`, `npm start` y, en otra terminal, `npm run tunel`. Pasos para Android e iPhone en [PRUEBAS-EN-CELULAR.md](PRUEBAS-EN-CELULAR.md).

## URL para los QR definitivos

`NEXT_PUBLIC_SITE_URL=https://<dominio-definitivo>` en `.env.production.local` (y en el servicio donde se publique), luego `npm run build` y `npm run qr:prod`. Debe ser HTTPS, sin ruta, y no cambiar después de imprimir.

## Datos geográficos que faltan

Coordenadas verificadas de las 8 esculturas, confirmación del punto del Sol, evaluación de seguridad y accesibilidad de cada sitio, servicios cercanos y permisos (Vialidad, municipalidades, propietarios). Detalle y posiciones teóricas actuales en [DATOS-PENDIENTES-Y-LIMITACIONES.md](DATOS-PENDIENTES-Y-LIMITACIONES.md).

## Limitaciones pendientes

Resumen (lista completa en [DATOS-PENDIENTES-Y-LIMITACIONES.md](DATOS-PENDIENTES-Y-LIMITACIONES.md)): sin prueba en teléfonos físicos; brújula referida al norte magnético y sujeta a interferencias; mapa base dependiente de internet y de la política de uso de OpenStreetMap; modelo orbital aproximado (≈1′, 1900–2100); superficies artísticas en Mercurio, Urano y el Sol; los cuatro planetas rocosos quedan dentro de la zona urbana de San Carlos con la escala actual.

## De la prueba digital a la instalación física

1. Probar en teléfonos reales con el método B y registrar los resultados en las fichas.
2. Validar los textos con docentes, familias y visitantes.
3. Confirmar la escala y el punto del Sol; elegir en terreno cada sitio seguro cerca de su posición teórica y cargar sus coordenadas como `verificada`.
4. Gestionar permisos y diseñar esculturas y paneles.
5. Publicar con dominio definitivo y HTTPS; configurar un proveedor de teselas.
6. Generar los QR de producción, imprimir una prueba en el material final y escanearla con Android e iPhone a pleno sol.
7. Instalar y verificar cada estación en terreno (QR, orientación, cobertura móvil).

Detalle en [INSTALACION-FISICA.md](INSTALACION-FISICA.md).
