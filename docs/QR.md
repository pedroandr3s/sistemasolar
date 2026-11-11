# Códigos QR de las estaciones

Cada estación tiene una URL única y permanente: `https://<dominio>/estacion/<id>`.

| Orden | Estación | Ruta |
|---|---|---|
| 1 | Sol | `/estacion/sol` |
| 2 | Mercurio | `/estacion/mercurio` |
| 3 | Venus | `/estacion/venus` |
| 4 | Tierra | `/estacion/tierra` |
| 5 | Marte | `/estacion/marte` |
| 6 | Júpiter | `/estacion/jupiter` |
| 7 | Saturno | `/estacion/saturno` |
| 8 | Urano | `/estacion/urano` |

Los identificadores están en `src/config/stations.ts`. **No los cambies después de imprimir los códigos.**

## Tres formas de obtener códigos

1. **Página /qr (pruebas rápidas)**: abre la app en el computador con la dirección que usará el teléfono (por ejemplo la del túnel) y entra a `/qr`. Los códigos se generan en el navegador con esa misma dirección. No sirven para imprimir en las estaciones.
2. **QR de desarrollo (fichas imprimibles para pruebas)**:
   ```bash
   npm run qr:dev                                          # red local: detecta la IP del computador
   npm run qr:dev -- --base https://abc-123.trycloudflare.com   # cualquier otra dirección
   npm run tunel                                           # abre un túnel HTTPS y genera los QR con su dirección
   ```
   Acepta túneles y direcciones de red local (con advertencias). Resultado en `artifacts/qr/desarrollo/`, con la marca «SOLO PARA PRUEBAS». No se guardan en git porque dependen de la dirección de cada prueba.
3. **QR de producción (definitivos)**:
   1. Publica el sitio con su dominio definitivo y HTTPS.
   2. Crea `.env.production.local` con:
      ```
      NEXT_PUBLIC_SITE_URL=https://sistemasolar.tudominio.cl
      ```
   3. Ejecuta `npm run qr:prod`. Resultado en `artifacts/qr/produccion/`.

   El modo producción **se niega a generar** si la URL falta, no es HTTPS, apunta a localhost o a una IP local, es un túnel temporal, incluye rutas o parámetros, o parece un dominio de ejemplo.

## Archivos generados

| Archivo | Uso |
|---|---|
| `png/qr-N-<id>.png` | Imagen de 1200 × 1200 px por estación |
| `svg/qr-N-<id>.svg` | Vector por estación (para imprenta, escala sin perder calidad) |
| `svg/qr-N-<id>-con-nombre.svg` | Vector con el nombre de la estación y la URL debajo |
| `qr-imprimible.pdf` | Hoja de contactos y una página A4 por estación |
| `fichas-de-prueba.pdf` | Fichas para anotar la prueba con Android e iPhone (URL y resultado esperado) |
| `manifiesto.json`, `manifiesto.csv` | Orden, id, nombre, URL, archivos y huella SHA-256 de cada PNG |
| `LEEME.txt` | Resumen y cómo regenerar |

Parámetros: corrección de errores **Q** (≈25 % del código puede dañarse y seguir leyéndose), zona blanca de 4 módulos, negro sobre blanco y sin logotipos encima. Cada PNG se decodifica automáticamente al generarlo y la generación falla si el contenido no coincide con la URL.

## Recomendaciones de impresión e instalación

- Tamaño: al menos 3 cm de lado para leer a 30 cm; en un panel que se escanea a 1 m, 10 cm o más.
- Material mate y resistente a la intemperie y al sol; evita láminas brillantes que generen reflejos.
- No recortes la zona blanca exterior ni pongas el código sobre fondos oscuros o texturas.
- Ubícalo a una altura cómoda (entre 1,0 y 1,4 m) y accesible para personas en silla de ruedas.
- Junto al código, escribe la URL corta y una frase como «Escanea con la cámara de tu teléfono».
- Antes de instalar, prueba cada código **impreso** con la cámara nativa de un Android y de un iPhone, de día y con sol directo.
- Los QR no dependen de nada guardado en el teléfono: basta con la URL.

## Si cambia el dominio

Los QR impresos apuntan a un dominio fijo. Si alguna vez cambia, el dominio antiguo debe seguir funcionando con una redirección permanente (301) hacia el nuevo, o habrá que reimprimir.
