# De la prueba digital a la instalación física

Pasos concretos, en orden.

## 1. Validar la experiencia digital

1. Probar en teléfonos reales (Android y iPhone) con el método B de [PRUEBAS-EN-CELULAR.md](PRUEBAS-EN-CELULAR.md) y registrar los resultados en las fichas de prueba.
2. Revisar los textos de las ocho estaciones con docentes y, si es posible, con niños y visitantes (prueba de los tres públicos: niño curioso, turista adulto, persona interesada en ciencia).
3. Corregir lo necesario en `src/data/bodies.ts`.

## 2. Definir la escala y los sitios

1. Confirmar la escala (1 UA = 2 km) y el punto del Sol. Considerar que con el Sol en la Plaza de Armas los cuatro planetas rocosos quedan dentro de San Carlos.
2. Para cada estación, partir de su posición teórica (ver tabla en [DATOS-PENDIENTES-Y-LIMITACIONES.md](DATOS-PENDIENTES-Y-LIMITACIONES.md)) y buscar en terreno el sitio seguro más cercano: fuera de la calzada, con zona de detención o acceso peatonal, buena visibilidad para los vehículos y espacio para el panel.
3. Registrar coordenadas con un GPS o un teléfono en modo de alta precisión (promediar varias lecturas), fotografías y observaciones de seguridad y accesibilidad.
4. Cargar cada sitio en `src/config/stations.ts` con `status: "verificada"` y completar `site`. La app recalcula distancias, mapa y orientación. Revisar en `/mapa` que la desviación respecto de la escala sea aceptable y documentarla.

## 3. Permisos y diseño físico

1. Gestionar permisos con la Dirección de Vialidad (faja fiscal de la Ruta N-31), las municipalidades de San Carlos y San Fabián y los propietarios cuando corresponda.
2. Diseñar las esculturas. A la misma escala de distancias, el Sol mediría 18,6 m y la Tierra 17 cm; normalmente las esculturas se agrandan y el panel lo explica (la app ya muestra el tamaño exacto a escala en cada estación).
3. Diseñar los paneles: nombre, una idea principal, la distancia que representa, el QR y la advertencia de seguridad.

## 4. Publicar el sitio

1. Elegir dominio (por ejemplo, un subdominio municipal) y publicar la app con HTTPS (Vercel u otro servicio para Next.js).
2. Configurar `NEXT_PUBLIC_SITE_URL` con el dominio definitivo y volver a compilar.
3. Configurar un proveedor de teselas para el mapa si se espera tránsito alto.
4. Abrir `/diagnostico` desde un teléfono: la URL configurada debe aparecer como «Correcto».

## 5. Generar e imprimir los QR

1. `npm run qr:prod` (se niega a generar con URL de prueba o de ejemplo).
2. Revisar `artifacts/qr/produccion/qr-imprimible.pdf` y el manifiesto.
3. Imprimir una prueba de cada código en el material final y escanearla con Android y iPhone, de día y a pleno sol.
4. Enviar a imprenta los SVG (`svg/…-con-nombre.svg` si se quiere el nombre debajo).

## 6. Instalar y verificar

1. Instalar cada escultura y su panel.
2. En cada sitio: escanear el QR, comprobar que abre su estación, que «Orientarme» reconoce la estación por GPS y que la siguiente estación es la correcta.
3. Revisar señal de datos móviles en cada sitio; anotar los lugares con mala cobertura (la app funciona con páginas guardadas si el visitante ya las abrió, pero el mapa base no).

## 7. Mantener

- Revisar una vez al año el número de lunas y otras cifras que cambian.
- Mantener el dominio y su certificado. Si el dominio cambia, dejar una redirección permanente para no reimprimir los QR.
- Revisar periódicamente el estado físico de los QR (decoloración, rayados).
