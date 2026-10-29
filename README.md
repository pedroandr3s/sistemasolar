# Sistema solar a escala San Carlos–San Fabián

Plataforma web para un recorrido de divulgación científica y turismo astronómico en la Ruta N-31 (Región de Ñuble, Chile). Ocho esculturas representan el Sol y los planetas hasta Urano a una misma escala: **1 unidad astronómica = 2 km de camino**. Cada escultura tendrá un código QR que abre la página de su estación en el teléfono, sin instalar ninguna aplicación.

- **Explorar**: cada cuerpo en 3D (Three.js + React Three Fiber), con etiquetas, comparación de tamaño con la Tierra, giro acelerado, vista ampliada y una acción propia por planeta (la Tierra con la luz y la sombra de este momento, Venus bajo sus nubes, los anillos de Saturno, el eje de Urano…). Realidad aumentada opcional donde el teléfono la admite.
- **Orientarme**: estación del QR, ubicación por GPS (solo si se autoriza), estación más cercana, siguiente estación, distancia por la ruta y en línea recta, y brújula con abanico de incertidumbre.
- **Sistema solar**: posiciones heliocéntricas reales para cualquier fecha (Astronomy Engine), con animación del tiempo.
- **Mapa del recorrido**: trazado real de la ruta (OpenStreetMap) con las estaciones y sus distancias.
- **Aprender**: tres niveles de profundidad por estación (Descubrir, Entender mejor, Profundizar), comparaciones interactivas, preguntas, quiz y bitácora con insignias guardada solo en el teléfono.

> Las ubicaciones de las esculturas **todavía no están definidas**. La app muestra posiciones teóricas calculadas con la escala sobre el trazado y las marca siempre como «propuestas». Ver [docs/DATOS-PENDIENTES-Y-LIMITACIONES.md](docs/DATOS-PENDIENTES-Y-LIMITACIONES.md).

## Flujo principal: escanear, ver en 3D, ver en realidad aumentada

1. En la portada, el botón **Escanear QR** (`/escanear`) abre la cámara trasera, lee el código de una escultura y abre su estación. Si la cámara en vivo no está disponible (por ejemplo, sin https), ofrece tomar una foto del código. También sirve la cámara nativa del teléfono: el QR abre directamente `/estacion/<id>`.
2. La estación muestra el planeta en 3D (giro táctil, zoom, etiquetas) y, debajo, el botón **Ver en realidad aumentada**: WebXR en Android (Chrome con ARCore) y AR Quick Look en iPhone/iPad. Los navegadores solo lo permiten desde una página https y tras un toque del usuario, por eso la realidad aumentada no arranca sola al escanear.
3. **Simulador de QR** (`/qr`): muestra en la pantalla del computador el código de cada estación, con la dirección de la red local detectada (`/api/red`), para escanearlo con el celular sin estar en la ruta. Para probar la cámara dentro de la página y la realidad aumentada, abre la app con https (`npm run tunel` o `npm run dev:https`).

## Requisitos

- Node.js 20.9 o superior (probado con Node 22) y npm.
- Para las pruebas de extremo a extremo: Chromium de Playwright (`npx playwright install chromium`).
- Solo si quieres regenerar las texturas: Python 3.10+ con numpy, scipy y Pillow.

## Puesta en marcha

```bash
npm install
npm run dev
```

Abre <http://localhost:3000>. Para la versión optimizada: `npm run build` y luego `npm start`.

> **Si el proyecto está dentro de OneDrive** (por ejemplo en el Escritorio sincronizado), OneDrive intentará sincronizar miles de archivos de `node_modules` y `.next`. Conviene pausar la sincronización mientras trabajas o mover la carpeta a una ruta fuera de OneDrive, como `C:\proyectos\sistema-solar`.

## Probar desde el teléfono

Resumen (detalle paso a paso en [docs/PRUEBAS-EN-CELULAR.md](docs/PRUEBAS-EN-CELULAR.md)):

| | Método A: red local | Método B: HTTPS con túnel |
|---|---|---|
| Sirve para | Diseño, 3D, navegación, rutas | Todo lo anterior + GPS, brújula, QR, PWA |
| Comandos | `npm run dev` y, en otra terminal, `npm run qr:dev` | `npm run build`, `npm start` y, en otra terminal, `npm run tunel` |
| Dirección en el teléfono | `http://192.168.x.x:3000` (la detecta `qr:dev`) | `https://algo.trycloudflare.com` (la muestra `tunel`) |
| Requiere | Mismo Wi-Fi; permitir Node en el firewall | Instalar `cloudflared` una vez (gratuito, sin cuenta) |

Ambos comandos imprimen en la terminal un QR de la página de inicio para escanearlo con el teléfono y regeneran los QR de las ocho estaciones con la dirección correcta. Los navegadores solo entregan GPS y brújula en conexiones seguras (HTTPS), por eso el método B es el que reproduce la experiencia real. La página **/qr** muestra en pantalla los códigos de la dirección con que se abrió la app, y **/diagnostico** revisa en el teléfono GPS, brújula, 3D, mapa y recursos.

## Códigos QR

```bash
# QR de prueba en la red local (detecta la IP del computador):
npm run qr:dev

# QR de prueba con otra dirección (por ejemplo, un túnel abierto a mano):
npm run qr:dev -- --base https://abc-123.trycloudflare.com

# Túnel HTTPS + QR de prueba en un solo paso (con npm start corriendo):
npm run tunel

# QR definitivos: primero configura el dominio real en .env.production.local
#   NEXT_PUBLIC_SITE_URL=https://sistemasolar.tudominio.cl
npm run qr:prod
```

Se generan en `artifacts/qr/desarrollo/` o `artifacts/qr/produccion/`: PNG y SVG por estación, un PDF imprimible, fichas de prueba en PDF, un manifiesto JSON/CSV y un `LEEME.txt`. Cada código se decodifica automáticamente para comprobar que contiene su URL. El modo producción rechaza URL vacías, de ejemplo, HTTP, de red local o de túneles temporales: **los QR definitivos todavía no existen porque falta el dominio**. Más detalles e indicaciones de impresión en [docs/QR.md](docs/QR.md).

## Verificaciones

```bash
npm run verify     # tipos, linter, pruebas unitarias y compilación de producción
npm run build && npm run test:e2e   # pruebas de navegador en 3 tamaños de pantalla
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (escucha en toda la red local) |
| `npm run dev:https` | Desarrollo con certificado autofirmado (ver la guía de pruebas) |
| `npm run build` / `npm start` | Compilación y servidor de producción |
| `npm run typecheck` / `npm run lint` | TypeScript estricto y ESLint |
| `npm test` | Pruebas unitarias (Vitest): datos, escala, geodesia, orientación, efemérides, horario de Chile, URL y QR |
| `npm run test:e2e` | Pruebas de extremo a extremo (Playwright) en móvil pequeño, móvil y escritorio |
| `npm run qr:dev` / `npm run qr:prod` | Generación de los códigos QR (prueba / definitivos) |
| `npm run tunel` | Túnel HTTPS temporal (cloudflared) hacia el servidor local + QR de prueba con su dirección |
| `npm run route:fetch` | Vuelve a descargar el trazado de la ruta desde OSRM/OpenStreetMap |
| `npm run textures` | Regenera las texturas (requiere Python y los archivos de NASA; ver el script) |

## Dónde se configura cada cosa

| Archivo | Contenido |
|---|---|
| `src/config/stations.ts` | Estaciones: identificador (URL del QR), nombre, estado de la ubicación (`propuesta-escala`, `verificada` con coordenadas, o `pendiente`) e información de acceso y seguridad |
| `src/config/scale.ts` | Escala física (metros por UA) y posición del Sol sobre la ruta |
| `src/data/bodies.ts` | Datos científicos tipados y textos de los tres niveles de cada cuerpo |
| `src/data/sources.ts` | Registro de fuentes con fecha de consulta |
| `src/data/route/` | Trazado de la ruta (GeoJSON) con su procedencia |
| `.env.local` / `.env.production.local` | `NEXT_PUBLIC_SITE_URL` y, opcionalmente, el proveedor de teselas (ver `.env.example`) |

## Estructura

```
src/
  app/                 Rutas (App Router): inicio, /estacion/[id] con sus 5 modos, modos generales,
                       /bitacora, /diagnostico, /qr, /fuentes
  components/
    planet/            Visualizador 3D, materiales, texturas, realidad aumentada
    orbits/            Simulación orbital por fecha
    map/               Mapa Leaflet del recorrido
    orient/            GPS, brújula y modo Orientarme
    learn/             Actividades de aprendizaje
    station/           Bloques de la página de cada estación
    three/             Etiquetas HTML sobre escenas 3D
    route/             Regla y camino a escala
  config/              Estaciones, escala y URL del sitio
  data/                Datos científicos, fuentes y trazado
  lib/                 Cálculos puros: astronomía, geodesia, estaciones, orientación, fechas, formato
scripts/               Generador de QR, túnel de pruebas, trazado y texturas
tests/unit, tests/e2e  Pruebas
docs/                  Documentación
public/textures        Texturas optimizadas (WebP/JPEG)
```

## Publicar el sitio

La app es estática salvo por las cabeceras HTTP; funciona en cualquier servicio que ejecute Next.js (por ejemplo Vercel, que tiene un plan gratuito y permite un dominio propio) o en un servidor Node con `npm run build` y `npm start`. Después de publicar con el dominio definitivo: configura `NEXT_PUBLIC_SITE_URL`, vuelve a compilar y ejecuta `npm run qr:prod`. Los pasos para pasar a la instalación física están en [docs/INSTALACION-FISICA.md](docs/INSTALACION-FISICA.md).

## Documentación

- [docs/INFORME.md](docs/INFORME.md): informe de lo implementado y verificado.
- [docs/RESPUESTA-AUDITORIA.md](docs/RESPUESTA-AUDITORIA.md): estado de cada hallazgo de [AUDITORIA_PROYECTO.md](AUDITORIA_PROYECTO.md).
- [docs/PRUEBAS-EN-CELULAR.md](docs/PRUEBAS-EN-CELULAR.md): probar en Android y iPhone.
- [docs/QR.md](docs/QR.md): códigos QR de desarrollo y de producción.
- [docs/DECISIONES.md](docs/DECISIONES.md): arquitectura y decisiones técnicas.
- [docs/FUENTES-Y-LICENCIAS.md](docs/FUENTES-Y-LICENCIAS.md): fuentes científicas, datos geográficos, texturas y licencias.
- [docs/DATOS-PENDIENTES-Y-LIMITACIONES.md](docs/DATOS-PENDIENTES-Y-LIMITACIONES.md): lo que falta definir y los límites conocidos.
- [docs/INSTALACION-FISICA.md](docs/INSTALACION-FISICA.md): de la prueba digital a las esculturas.
