# Datos pendientes y limitaciones

## Datos que faltan (no se inventaron)

| Dato | Estado actual | Qué hacer |
|---|---|---|
| Coordenadas de las 8 esculturas | **Ninguna verificada.** La app usa la posición teórica de cada estación sobre el trazado según la escala, marcada como «propuesta» | Elegir cada lugar en terreno y cargarlo en `src/config/stations.ts` con `status: "verificada"`, latitud, longitud, responsable y fecha |
| Ubicación del Sol | Supuesta en el inicio del trazado (Plaza de Armas de San Carlos, km 0) | Confirmar. Si el Sol va en otro punto, ajustar `sunAlongRouteMeters` en `src/config/scale.ts` y recalcular las demás |
| Evaluación de seguridad de cada sitio (berma, visibilidad, velocidad del tránsito, zona de detención) | Sin datos | Completar `site` de cada estación (`safetyWarnings`, `parking`, `pedestrianAccess`) con `verified: true` |
| Accesibilidad de cada sitio (rampa, superficie, altura del panel) | Sin datos | `site.accessibility` |
| Servicios y puntos de interés cercanos | Sin datos | `site.services`, `site.nearby` (solo información verificada) |
| Permisos (Vialidad/MOP, municipalidades de San Carlos y San Fabián, propietarios) | Fuera del alcance de la app | Gestionar antes de instalar |
| Dominio definitivo | Sin definir | Comprar o asignar un dominio, publicar el sitio y configurar `NEXT_PUBLIC_SITE_URL` |
| Proveedor de mapa base para producción | Se usa OpenStreetMap directamente | Para uso intensivo, configurar un proveedor de teselas (ver `.env.example`) |

### Coordenadas teóricas actuales (referencia, no verificadas)

Calculadas sobre el trazado con 1 UA = 2 km desde la Plaza de Armas de San Carlos:

| Estación | km de ruta | Representa |
|---|---|---|
| Sol | 0,0 | — |
| Mercurio | 0,77 | 57,9 millones de km |
| Venus | 1,45 | 108,2 millones de km |
| Tierra | 2,00 | 149,6 millones de km |
| Marte | 3,05 | 228,0 millones de km |
| Júpiter | 10,41 | 778,5 millones de km |
| Saturno | 19,14 | 1.432 millones de km |
| Urano | 38,33 | 2.867 millones de km |

Las cuatro primeras quedan dentro de la zona urbana de San Carlos (los primeros 3,4 km del trazado son calles urbanas antes de la Ruta N-31). Esto puede ser una ventaja (se recorren a pie) o exigir ajustar la escala o el punto del Sol: es una decisión de diseño pendiente.

## Limitaciones conocidas

### Pruebas

- La app se probó automáticamente en Chromium sin ventana, con pantallas de teléfono emuladas y WebGL por software. **No se ha probado en teléfonos físicos.** Falta la ronda de pruebas reales descrita en [PRUEBAS-EN-CELULAR.md](PRUEBAS-EN-CELULAR.md), incluida Safari en iPhone.
- El GPS se probó con una ubicación **simulada** dentro de las pruebas automáticas; la brújula no se puede probar sin un dispositivo real.
- La realidad aumentada (WebXR en Android, AR Quick Look en iPhone) está implementada pero no se pudo probar en un dispositivo.

### GPS, brújula y conectividad

- GPS y brújula requieren HTTPS. En la red local por HTTP no funcionan (está documentado y la app lo explica).
- La brújula de los teléfonos se descalibra y se altera cerca de vehículos y estructuras metálicas. La app muestra la incertidumbre y oculta la flecha cuando no es confiable. La diferencia entre norte magnético y geográfico (declinación, unos 3° al este en la ruta en 2026) se corrige con el modelo WMM2025, **válido hasta el 31-12-2029**: antes de 2030 hay que actualizar la biblioteca `magvar` a la versión con el WMM2030 (la app avisa «modelo vencido» si no se hace).
- El rumbo del teléfono en Android se calcula con su rotación completa (no solo con `alpha`), de modo que funciona con el teléfono horizontal, inclinado o vertical. Sigue pendiente compararlo en terreno con una brújula de referencia.
- Algunos navegadores de Android no entregan una orientación absoluta (respecto del norte); en ese caso la app lo informa y ofrece el mapa.
- El mapa base necesita internet. El trazado, las estaciones, el 3D y los cálculos están incluidos en la app.
- El funcionamiento sin conexión (service worker) solo actúa en producción con https y para páginas y texturas ya visitadas.

### Modelo científico

- Las posiciones orbitales usan un modelo analítico truncado (precisión ≈ 1′); no es una efeméride profesional. Fechas limitadas a 1900–2100.
- Las órbitas y los planetas de la vista orbital no están a escala de tamaño (se indica en pantalla).
- Las esculturas representan distancias medias: la distancia real de cada planeta al Sol varía a lo largo de su órbita.
- Superficies artísticas: Mercurio, Urano y el Sol. Nubes de la Tierra ilustrativas. Anillos de Urano realzados. La Gran Mancha Roja se ubica donde aparece en la textura de NASA usada (en la realidad se desplaza en longitud).
- El número de lunas cambia con nuevos descubrimientos: revisar las cifras al menos una vez al año (`src/data/bodies.ts`, campo `moons` con su fecha).

### Técnicas

- `npm audit` (17-10-2026): **0 vulnerabilidades en las dependencias de producción**. Informa 5 de severidad alta en `braces`, usada solo por la cadena de ESLint (herramienta de desarrollo, no llega al sitio publicado). No ejecutes `npm audit fix --force`: degradaría `eslint-config-next` a la versión 14. Se resolverá cuando Next.js actualice su configuración de ESLint.
- Si `npm install` mostrara un error `ERESOLVE` con otra versión de npm, usa `npm install --legacy-peer-deps`. Con npm 10 y el `package-lock.json` incluido no es necesario.
- Cache Components de Next.js 16 está desactivado a propósito (ver [DECISIONES.md](DECISIONES.md)).
- La realidad aumentada en iPhone genera el modelo USDZ en el teléfono; en equipos antiguos puede tardar unos segundos.
