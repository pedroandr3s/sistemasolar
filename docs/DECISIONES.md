# Arquitectura y decisiones técnicas

## Punto de partida

La carpeta del proyecto estaba vacía. Se creó una aplicación Next.js 16 (App Router) con React 19 y TypeScript estricto (`strict` y `noUncheckedIndexedAccess`).

## Tecnologías y por qué

| Pieza | Elección | Motivo |
|---|---|---|
| Framework | Next.js 16.4 (App Router) | Páginas estáticas por estación (rápidas al escanear un QR), rutas limpias para los QR, componentes de servidor por defecto |
| 3D | three 0.186 + @react-three/fiber 9 + @react-three/drei 10 | Estándar para WebGL en React; R3F desmonta y libera la escena al salir de la página |
| Efemérides | astronomy-engine 2.1.19 (MIT) | Calcula posiciones heliocéntricas a partir de una fecha (VSOP87 truncado, ≈1′ de precisión), sin servidor ni claves; mantenido y probado |
| Mapa | Leaflet 1.9 + react-leaflet 5 con teselas de OpenStreetMap | Liviano, funciona bien en móviles, licencias abiertas; el proveedor de teselas es configurable |
| QR | qrcode (MIT), pdf-lib (MIT), jsqr + pngjs para verificar | Generación reproducible en Node, PDF sin dependencias nativas y verificación automática |
| Pruebas | Vitest (unitarias), Playwright + axe-core (navegador y accesibilidad) | Rápidas y reproducibles en CI o en el computador |
| Estilos | Tailwind CSS 4 + CSS propio con variables | Sistema de diseño compacto en `src/app/globals.css` |
| Tipografía | Barlow y Barlow Condensed (OFL), servidas localmente | Inspiradas en la señalética vial (el recorrido es una ruta); sin depender de Google Fonts |

## Estructura de la información

- **Una URL por estación**: `/estacion/<id>`. Los cinco modos cuelgan de ella (`/orientarme`, `/sistema-solar`, `/mapa`, `/aprender`), de modo que la barra inferior nunca pierde la estación del QR. Los mismos modos existen sin estación (`/mapa`, `/sistema-solar`…).
- **Datos separados de la interfaz**: `src/data/bodies.ts` (cifras y textos con fuente), `src/config/stations.ts` (estaciones y ubicaciones), `src/config/scale.ts` (escala), `src/data/route/` (trazado). Los componentes solo leen.
- **Cálculos puros y probados** en `src/lib/`: astronomía, geodesia, ubicación de estaciones, orientación, fechas y formato numérico.

## Decisiones relevantes

### Escala: 1 UA = 2 km

El trazado entre las plazas de San Carlos y San Fabián de Alico mide 43,3 km. Con 2 km por unidad astronómica, Urano (19,17 UA) queda en el km 38,3 y sobra margen. La cifra es redonda y fácil de explicar en un panel. Se usa la **distancia media** (semieje mayor) de cada planeta, medida **sobre el trazado** desde el Sol. Se puede cambiar en `src/config/scale.ts`; si un planeta deja de caber, la app lo marca como «pendiente» en vez de dibujarlo fuera del camino.

### Cuatro distancias que nunca se mezclan

La interfaz distingue: (1) distancia astronómica real, (2) distancia a escala del modelo, (3) distancia por el camino y (4) distancia geográfica en línea recta. Cada número de la app indica cuál es.

### Ubicaciones propuestas, no inventadas

Sin coordenadas verificadas, cada estación se ubica en su punto teórico sobre el trazado según la escala (`status: "propuesta-escala"`) y se muestra siempre con borde punteado y la etiqueta «propuesta». Cuando se defina el lugar real se reemplaza por `status: "verificada"` con latitud, longitud, responsable y fecha. `status: "pendiente"` oculta la estación del mapa y de la orientación sin romper su página.

### Orientación honesta

- La «siguiente estación» se calcula por la posición del visitante sobre el trazado, no solo por el QR.
- La flecha combina el rumbo geográfico al objetivo con la orientación del teléfono; se dibuja como un abanico cuyo ancho refleja la precisión del GPS y de la brújula, y se oculta si la incertidumbre supera 45° o la precisión del GPS es baja.
- Se separan explícitamente: rumbo a la estación, dirección de la carretera, dirección de movimiento (solo con velocidad suficiente) y orientación del teléfono.
- Nunca se simulan GPS, brújula ni permisos. Sin sensores se ofrece el dial con el norte arriba y el mapa.
- Rumbo del teléfono: en iPhone se usa `webkitCompassHeading`; en Android se calcula a partir de la rotación completa del evento (alpha, beta y gamma), tomando el borde superior de la pantalla cuando el teléfono está horizontal y su parte trasera a medida que se pone vertical. Así no depende de `alpha` sola, que se vuelve inestable cerca de la vertical (`headingFromDeviceOrientation`, con pruebas unitarias).
- Declinación magnética: las brújulas miden respecto del norte magnético y los rumbos a las estaciones son geográficos. Se corrige con el World Magnetic Model 2025 (NOAA/BGS) mediante `magvar` (MIT, sin dependencias), elegida porque reproduce exactamente los 12 valores de prueba oficiales del WMM2025. En la ruta son unos +3° (2026). El cálculo es local.
- Si el GPS informa más de 7 m/s (≈25 km/h) con buena precisión, Orientarme y el mapa muestran un aviso: «Parece que vas en un vehículo… Si conduces, deja el teléfono». No bloquea la app, porque un pasajero puede usarla («Soy pasajero» lo oculta).

### Etiquetas sin solapes

El proyector de etiquetas (`src/components/three/labels.tsx`) coloca cada etiqueta sobre su punto; si choca con otra o con los botones flotantes (marcados con `data-label-avoid`), prueba debajo del punto y, si tampoco cabe, la oculta. La prioridad la tiene el planeta elegido y luego la Tierra. En la vista orbital de un teléfono chico, Mercurio y Venus pueden ocultarse porque quedan pegados al Sol: se ven al acercar la vista o al elegirlos.

### La Tierra con la luz real

La orientación del modelo de la Tierra se calcula con el punto subsolar del instante actual (Astronomy Engine), respetando la inclinación del eje respecto del plano de la órbita. «Ver Ñuble ahora» muestra si en Ñuble es de día o de noche.

### Posiciones orbitales

Heliocéntricas en la eclíptica J2000. Las distancias pueden verse «a escala» o «comprimidas» (raíz cuadrada de la distancia, conservando la dirección y por lo tanto la inclinación de cada órbita). Los tamaños de los planetas siempre se aumentan y la leyenda lo dice. Fechas permitidas: 1900–2100. Internamente todo se maneja en UTC; se muestra la hora de Chile continental (`America/Santiago`), con su cambio de horario.

### Cache Components desactivado

Next.js 16 propone `cacheComponents`, que mantiene ocultas (con React Activity) las páginas visitadas. Para una app estática con escenas WebGL eso mantendría varias escenas vivas en teléfonos de gama media. Se desactivó para que cada escena se desmonte y libere su memoria al navegar. Si una versión futura de Next.js lo hace obligatorio, habrá que forzar el desmontaje de los lienzos 3D al ocultarse.

### Etiquetas 3D propias

Las etiquetas sobre los planetas se dibujan en una capa HTML normal sobre el lienzo y se posicionan en cada cuadro (`src/components/three/labels.tsx`). El componente `<Html>` de drei crea una raíz de React por etiqueta y, con React 19, falla al desmontarse durante un renderizado («removeChild»). La solución propia evita el error y libera todo junto con la escena.

### Rendimiento

- Las páginas de estación se generan de forma estática (8 × 5 rutas).
- El 3D se carga en diferido, solo en el cliente, y el planeta aparece con un color de referencia mientras llega su textura (WebP de 1024 px; 2048 px solo en equipos capaces).
- Resolución de renderizado limitada (1,5× o 2× según el equipo), renderizado «a demanda» cuando nada se mueve y pausa total con la pestaña oculta. `prefers-reduced-motion` detiene los giros automáticos.
- Las texturas se liberan al desmontar.
- Three.js solo se descarga en las páginas con 3D. La parte 3D de la realidad aumentada (`arSession.ts`) se carga solo al pulsar su botón; antes iba en el fragmento de cada estación y la precarga de enlaces la descargaba incluso en la portada.
- Un service worker (solo en producción y con https) guarda páginas visitadas y texturas para zonas con mala cobertura. No guarda teselas del mapa. Las texturas se sirven desde la copia guardada y se revalidan en segundo plano (petición condicional), así una textura corregida llega en la visita siguiente.

### Accesibilidad

Contraste alto sobre fondo oscuro, botones de 44–48 px, foco visible, enlace para saltar al contenido, alternativas por teclado al giro con gestos (flechas, + y −), textos alternativos para el modelo 3D y los diagramas, y verificación automática con axe-core.

### Compartir y buscadores

`robots.txt` (excluye `/diagnostico` y `/qr`), `sitemap.xml` (vacío hasta configurar el dominio, porque exige direcciones absolutas) e imagen para compartir por estación (`opengraph-image.tsx`, generada al compilar con las tipografías del sitio).

### Privacidad

Sin cuentas, analítica ni servidor propio de datos. La ubicación se pide solo al pulsar un botón y no sale del teléfono. El panel de diagnóstico no contacta servidores externos por sí solo: el mapa base se prueba con un botón y la página explica qué servidor se consulta. El progreso y las insignias se guardan en `localStorage` y pueden borrarse desde la bitácora.

### Realidad aumentada

Opcional y solo donde existe: WebXR `immersive-ar` en Android (Chrome con ARCore) y AR Quick Look en iPhone (archivo USDZ generado en el momento con el exportador de three.js). El botón no aparece si el dispositivo no la admite, y la cámara solo la pide el sistema al pulsarlo.

- **Tamaño a la escala del recorrido.** En AR cada cuerpo mide lo que mediría con la escala del camino (1 UA = 2 km): el Sol 18,6 m, Júpiter 1,9 m, Saturno 1,6 m (3,8 m con anillos), Urano 68 cm, la Tierra 17 cm, Venus 16 cm, Marte 9 cm y Mercurio 6,5 cm. Lo calcula `arPlacement` (`src/components/planet/ar.ts`) con `sizeAtScaleMeters`; hay pruebas unitarias en `tests/unit/ar.test.ts`.
- **Distancia y altura.** El cuerpo se ancla a una distancia de 3,6 veces su radio (con anillos) para que quepa en la pantalla en vertical: el Sol a unos 34 m, Mercurio a medio metro. Los cuerpos grandes se elevan para no quedar enterrados. La capa de AR muestra el diámetro y la distancia.
- **Anclaje.** Se usa solo el giro horizontal del teléfono (al pulsar el botón se suele mirar la pantalla, hacia abajo) y se espera a tener una postura de seguimiento válida. Después el cuerpo queda fijo en el mundo.
- **Sol con textura.** Sobre la imagen de la cámara, clara y sin mapeo de tonos, el material del visualizador se veía como un disco de un color. En AR el Sol usa un material propio (`createSunArMaterial`): granulación, manchas solares con zonas brillantes alrededor, oscurecimiento del borde y una corona calculada por rayo (`createCoronaMaterial`), que no depende de «sprites» ni del búfer de profundidad. Su ruido no usa `sin()`, que pierde precisión en algunas GPU de teléfonos. Sigue siendo una representación artística.
- **Planetas.** Textura de mayor resolución cuando el cuerpo es grande, relieve donde existe y nubes en la Tierra.
- **iPhone.** AR Quick Look no admite shaders (el Sol lleva una textura horneada) ni deja elegir la distancia: coloca el modelo junto al visitante. Por eso allí el Sol se reduce a la décima parte (1,86 m); los planetas van a escala.

Probado en Android por el autor del proyecto (anclaje); el material nuevo del Sol y los tamaños a escala se verificaron con capturas y pruebas unitarias, no en un dispositivo. AR Quick Look sigue sin probarse en un iPhone.

### Experiencia para niños: una acción principal por pantalla

Probando con personas se vio que había botones que no se notaban, demasiada información junta y que no era obvio cómo pasar al planeta siguiente. La meta es que un niño de 10 años entienda cada pantalla en menos de 5 segundos. Guion para repetir la prueba: [PRUEBAS-CON-USUARIOS.md](PRUEBAS-CON-USUARIOS.md).

- **Portada.** El protagonista es «Escanear QR» (dorado); debajo, «Empezar por el Sol» (contorno). Ambos se ven sin deslizar en 360×640. El camino a escala va plegado y los demás accesos, debajo.
- **Escáner de QR** (`QrScanner.tsx`). Pide la cámara solo al pulsarlo, analiza la imagen en el teléfono (BarcodeDetector o jsQR, que se descarga recién entonces) y solo acepta paradas de este recorrido, reconstruyendo la ruta interna (`stationPathFromQr`): un código ajeno no saca a nadie del sitio. Si la cámara falla, deja elegir la parada de una lista.
- **Estación, sin deslizar en un teléfono chico:** nombre, planeta 3D con la pista «Gira con el dedo» (se va al primer toque), «Ver en realidad aumentada» (dorado, a todo el ancho) y, fijo sobre la barra, «Siguiente: <planeta>» con la distancia («a 770 m de aquí por el camino»). En el Sol dice «Ir a Mercurio»; en Urano, «¡Terminaste! Ver mi viaje».
- **Color con significado.** Dorado: la acción principal de la pantalla. Señal verde de carretera: hacia dónde seguir. Contorno: acciones secundarias. Todos los botones llevan ícono y texto.
- **Progreso.** Ocho puntos del color de cada astro («Parada 3 de 8»), el actual resaltado, los ya abiertos rellenos, todos tocables. En 360 px miden 52 px de alto y unos 43 de ancho: ocho de 48 px no caben.
- **Información por capas.** A la vista: nombre, frase de hasta 12 palabras y tres datos con ícono (tamaño, año y lunas; en el Sol, tamaño, temperatura y luz). Lo demás se abre con «Quiero saber más» (los tres niveles, la pregunta, la escala) y «Desafío» (una pregunta por vez). Las aclaraciones del modelo 3D van en «Sobre este modelo 3D». Las cifras salen de los mismos datos científicos y se mantiene el aviso de que las posiciones son teóricas.
- **Barra inferior de 5 a 4 modos:** «Planeta», «Dónde voy», «Mapa» y «Aprender». La vista «Sistema solar» por fecha se confundía con el mapa y no hace falta para avanzar: conserva su dirección y se abre desde Aprender, desde «Quiero saber más» y desde la portada («Los planetas hoy»).
- **Controles del modelo** con palabra visible («Acercar», «Alejar», «Reiniciar», «Agrandar»), en una columna al borde, fuera del planeta.
- **Ventana de realidad aumentada al abrir el enlace.** Al entrar a una estación por su enlace o su QR en un teléfono con AR, una ventana ofrece «Ver en realidad aumentada» y una X para cerrarla. No reaparece al pasar de un planeta a otro ni tras cerrarla en esa parada. Si el teléfono no admite AR, solo sale cuando el enlace la pedía (`?ar=1`) y lo explica.
- **Bitácora («Mi viaje»).** Sellos por parada, un mensaje según el avance y un botón hacia la primera parada que falta.
- **Objetivos táctiles** de 48 px o más (enlaces dentro de una frase: 24 px, excepción de WCAG 2.5.8).

### Diseño visual («Noche andina»)

Pensado para teléfono y tablet, al aire libre:

- Cielo nocturno azul profundo con estrellas tenues; cada estación tiñe su página con el color de su astro (variable CSS `--body`).
- La estación siguiente se dibuja como una señal informativa de carretera (verde con filete blanco): es la señalética del recorrido.
- Portada con una ilustración del Sol en San Carlos, el camino y la cordillera, con las estaciones en su fracción real del trazado.
- Texto base de 17 px (18 px en tablet), secundarios de al menos 14 px y controles de 44 px o más.
- Teléfono: barra inferior de cuatro modos con el activo marcado. Tablet: la barra pasa a ser un muelle flotante; en horizontal, la estación muestra el modelo 3D fijo a la izquierda y el contenido a la derecha, y la portada pone el camino junto a los modos.
- El mapa aísla sus capas (`isolation: isolate`) para no tapar la barra de modos.
