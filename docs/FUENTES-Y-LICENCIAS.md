# Fuentes científicas, datos y licencias

Fecha de consulta de todas las fuentes en línea: **17 de octubre de 2026**. El registro que usa la app está en `src/data/sources.ts`; cada cifra de `src/data/bodies.ts` indica su fuente.

## Datos astronómicos

| Dato | Fuente | Versión |
|---|---|---|
| Diámetro, masa, densidad, gravedad, distancia al Sol, perihelio, afelio, período orbital, rotación, duración del día, inclinación orbital, excentricidad, oblicuidad, temperatura media de Mercurio a Urano | [NASA NSSDC, Planetary Fact Sheet (métrica)](https://nssdc.gsfc.nasa.gov/planetary/factsheet/) | Actualizada el 18-03-2025 |
| Radio, masa, luminosidad, temperaturas, rotación y oblicuidad del Sol | [NASA NSSDC, Sun Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html) | Actualizada el 09-05-2024 |
| Lunas de Júpiter: 115 | [NASA Science, Jupiter Moons](https://science.nasa.gov/jupiter/jupiter-moons/) | Página del 21-09-2026 |
| Lunas de Saturno: 293 | [NASA Science, Saturn Moons](https://science.nasa.gov/saturn/moons/) | «A agosto de 2026» |
| Lunas de Urano: 29 | [NASA Science, Uranus Moons](https://science.nasa.gov/uranus/moons/) | «A agosto de 2026» |
| Lunas de Mercurio, Venus, Tierra y Marte | Planetary Fact Sheet | 2025 |
| Radios de los anillos de Saturno | [NASA NSSDC, Saturnian Rings Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/satringfact.html) | 19-04-2022 |
| Radios de los anillos de Urano | [NASA NSSDC, Uranian Rings Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranringfact.html) | 14-10-2015 |
| Unidad astronómica: 149.597.870,7 km | [IAU, Resolución B2 (2012)](https://www.iau.org/static/resolutions/IAU2012_English.pdf) | Exacta por definición |
| Distancia de Próxima Centauri (4,2465 años luz) | [NASA Science, Proxima Centauri b](https://science.nasa.gov/exoplanet-catalog/proxima-centauri-b/) | — |
| Posiciones planetarias por fecha | [Astronomy Engine 2.1.19](https://github.com/cosinekitty/astronomy) (MIT), modelo VSOP87 truncado | Precisión ≈ 1 minuto de arco |
| Declinación magnética (corrección de la brújula) | [World Magnetic Model 2025](https://www.ncei.noaa.gov/products/world-magnetic-model) (NOAA NCEI / BGS), vía `magvar` 2.2.0 (MIT) | Válido 2025,0–2030,0. Reproduce los 12 [valores de prueba oficiales](https://www.ncei.noaa.gov/sites/default/files/2025-02/WMM2025testvalues.pdf) (prueba unitaria) |

Notas:

- **Verificación en línea (17-10-2026):** las 98 cifras de los 7 planetas en `src/data/bodies.ts` (masa, diámetro, densidad, gravedad, rotación, duración del día, distancia media, perihelio, afelio, período, inclinación, excentricidad, oblicuidad y temperatura) se compararon automáticamente con la Planetary Fact Sheet publicada y coinciden todas; las del Sol coinciden con la Sun Fact Sheet. Las cifras de lunas se contrastaron con las páginas de NASA Science del mismo día (Júpiter 115, Saturno 293 «a agosto de 2026», Urano 29 «a agosto de 2026»), más recientes que la ficha de marzo de 2025 (95, 274 y 28).

- La página de NASA Science sobre Júpiter y la de Saturno muestran cifras antiguas en su descripción breve (metadatos) que no coinciden con el texto principal; se usó la del texto principal.
- La «temperatura media» de los planetas gigantes corresponde al nivel donde la presión es de 1 bar.
- Los textos de los tres niveles son redacción propia a partir de estas fuentes y de las páginas de NASA Science de cada planeta. Datos cualitativos usados (fuente NASA Science): hielo en cráteres polares de Mercurio (MESSENGER), temperaturas extremas de Mercurio (430 °C / −180 °C), monte Olimpo unas tres veces más alto que el Everest, rango de temperaturas de Marte (20 °C / −153 °C), 42 años de luz y 42 de oscuridad en los polos de Urano, mínimo de −224 °C en su atmósfera, 13 anillos, visita de la Voyager 2 (1986), descubrimiento de los anillos de Júpiter por la Voyager 1 (1979), espesor típico de 10 m de los anillos principales de Saturno.

## Datos geográficos

| Dato | Fuente | Licencia |
|---|---|---|
| Trazado San Carlos – San Fabián de Alico (43,3 km; 39,7 km por la Ruta N-31) | Calculado con [OSRM](https://project-osrm.org/) (servidor público) sobre datos de OpenStreetMap, perfil vehicular, obtenido el 17-10-2026. Simplificado con Douglas-Peucker (6 m) | © colaboradores de OpenStreetMap, [ODbL 1.0](https://www.openstreetmap.org/copyright) |
| Coordenadas de las plazas de armas de San Carlos y San Fabián de Alico | Nominatim / OpenStreetMap | ODbL 1.0 |
| Mapa base (teselas) | OpenStreetMap, en línea | ODbL 1.0 (datos), CC BY-SA 2.0 (teselas) |

La huella SHA-256 de las coordenadas está registrada en el propio archivo GeoJSON para comprobar que no se alteraron. El script `npm run route:fetch` permite volver a obtener el trazado.

**Uso del mapa base en producción**: la [política de teselas de OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/) no admite uso intensivo. Para una instalación turística con muchas visitas, configura un proveedor propio o comercial con `NEXT_PUBLIC_MAP_TILE_URL` y su atribución.

## Imágenes y texturas

| Recurso | Origen | Licencia / condición |
|---|---|---|
| Tierra (relieve y batimetría), Marte, Venus (radar Magellan), Júpiter, Saturno, Luna, mapa estelar Hipparcos | [NASA 3D Resources – Images and Textures](https://github.com/nasa/NASA-3D-Resources) | Material de NASA «sin derechos de autor»; se siguen las [pautas de uso de medios de NASA](https://www.nasa.gov/nasa-brand-center/images-and-media) (no se usa el logo de NASA ni se sugiere su respaldo) |
| Máscara de tierra y océano para recolorear la Tierra | [Natural Earth](https://www.naturalearthdata.com/) 1:50m, vía el paquete npm world-atlas 2.0.2 | Dominio público (datos); ISC (paquete) |
| Mercurio, Urano, nubes de Venus y de la Tierra, anillos de Saturno y de Urano | Generadas por `scripts/textures/build_textures.py` para este proyecto (los radios de los anillos son los publicados por NASA) | Propias del proyecto |
| Superficie animada del Sol | Shader procedural en `src/components/planet/sunMaterial.ts` | Propia del proyecto |
| Íconos de la interfaz | Dibujados para este proyecto (`src/components/ui/Icon.tsx`) | Propios del proyecto |
| Tipografías Barlow y Barlow Condensed | [The Barlow Project](https://github.com/jpt/barlow), vía @fontsource | SIL Open Font License 1.1 (copia en `src/fonts/OFL-Barlow.txt`). Dos pesos se convirtieron de WOFF2 a TTF (`src/fonts/og/`) para las imágenes de compartir; la fuente no declara «Reserved Font Name» |
| Icono para instalar la app (`icon-maskable-512.png`) | Derivado del icono del proyecto, reducido al 86 % para la zona segura de Android | Propio del proyecto |

La interfaz indica cuándo una superficie es una representación artística (Mercurio, Urano, el Sol), cuándo los colores son falsos (radar de Venus), cuándo las nubes son ilustrativas (Tierra) y cuándo algo está realzado (anillos de Urano).

## Bibliotecas de código

Todas con licencias permisivas: Next.js (MIT), React (MIT), three.js (MIT), @react-three/fiber y drei (MIT), astronomy-engine (MIT), magvar (MIT), Leaflet (BSD-2-Clause), react-leaflet (Hippocratic License 2.1, ver nota), qrcode (MIT), pdf-lib (MIT), jsqr (Apache-2.0), pngjs (MIT), Tailwind CSS (MIT), Vitest (MIT), Playwright (Apache-2.0), axe-core (MPL-2.0).

Nota: react-leaflet usa la Hippocratic License 2.1, que agrega condiciones éticas a una licencia permisiva. Es compatible con un proyecto educativo y turístico como este; si el municipio o la institución tiene una política estricta de licencias OSI, se puede reemplazar por Leaflet directo sin cambiar la experiencia.
