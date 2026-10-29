# Probar la app desde un teléfono

Hay dos formas. La **A** (red local) es rápida y sirve para revisar diseño, 3D y navegación. La **B** (HTTPS con un túnel) es la que reproduce la experiencia real: los navegadores solo entregan GPS y brújula en conexiones seguras.

> Estado: la app se probó de forma automática en Chromium sin ventana con pantallas de teléfono emuladas (ver [INFORME.md](INFORME.md)). **Todavía no se ha probado en un teléfono físico.** Esta guía es el procedimiento para hacerlo.

## Método A: red local (HTTP)

1. En el computador, dentro de la carpeta del proyecto:
   ```bash
   npm install
   npm run dev
   ```
   Next.js escucha en todas las interfaces de red. En la consola aparece una línea `Network: http://192.168.x.x:3000`.
2. En **otra** terminal:
   ```bash
   npm run qr:dev
   ```
   Detecta la IP del computador en la red local, genera los QR de prueba de las ocho estaciones con esa dirección (en `artifacts/qr/desarrollo/`) e imprime en la terminal un QR de la página de inicio.
   Si el teléfono no abre la dirección detectada, puede que sea la de una red virtual (VirtualBox, WSL). Busca la correcta:
   - **Windows**: abre «Símbolo del sistema» y ejecuta `ipconfig`. Usa la «Dirección IPv4» del adaptador Wi-Fi (por ejemplo `192.168.1.34`) y ejecuta `npm run qr:dev -- --base http://192.168.1.34:3000`.
   - **macOS**: `ipconfig getifaddr en0`.
3. Conecta el teléfono **a la misma red Wi-Fi** y escanea el QR de la terminal con la cámara (o abre `http://192.168.1.34:3000` con tu IP).
4. Si no carga:
   - Windows mostrará un aviso del firewall la primera vez: permite el acceso de **Node.js** en redes **privadas**. Si lo rechazaste, ve a «Firewall de Windows Defender → Permitir una aplicación» y habilita Node.js.
   - Algunas redes de invitados o públicas aíslan a los dispositivos entre sí («aislamiento de clientes»). Usa la red principal o el método B.
   - La red debe estar marcada como «privada» en Windows.
5. Qué funciona: diseño, 3D, navegación entre estaciones y modos, mapa, simulación orbital. Qué **no** funciona: GPS y brújula (la página Orientarme lo explicará: requieren https).

La configuración `allowedDevOrigins` de `next.config.ts` ya admite direcciones `192.168.*.*`, `10.*.*.*` y `172.*.*.*`.

## Método B: HTTPS con un túnel (recomendado para sensores y QR)

Un túnel de Cloudflare publica temporalmente tu servidor local en una dirección `https://….trycloudflare.com`. Es gratuito y no requiere cuenta ni comprar un dominio.

1. Instala `cloudflared` una vez:
   - **Windows**: `winget install --id Cloudflare.cloudflared`
   - **macOS**: `brew install cloudflared`
   - Otras opciones: <https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/>
2. Compila y arranca la versión de producción (más rápida y con funcionamiento sin conexión):
   ```bash
   npm run build
   npm start
   ```
3. En **otra** terminal:
   ```bash
   npm run tunel
   ```
   El script comprueba que el servidor responde, abre el túnel, muestra la dirección `https://palabras-al-azar.trycloudflare.com`, **regenera los QR de prueba** con ella (en `artifacts/qr/desarrollo/`) e imprime en la terminal un QR de la página de inicio.
   (Equivale a ejecutar `cloudflared tunnel --url http://127.0.0.1:3000` y luego `npm run qr:dev -- --base <dirección>`.)
4. Escanea el QR de la terminal con el teléfono (sirve con datos móviles o cualquier Wi-Fi).
5. Para probar los QR de las estaciones, abre en el computador `https://palabras-al-azar.trycloudflare.com/qr`, o imprime `artifacts/qr/desarrollo/qr-imprimible.pdf`, y escanea los códigos con la **cámara nativa** del teléfono. Anota los resultados en `fichas-de-prueba.pdf`.
6. Cierra el túnel con `Ctrl+C` al terminar. La dirección cambia cada vez que lo reinicias; `npm run tunel` vuelve a generar los QR cada vez, pero los que hayas impreso antes dejan de funcionar.

Buenas prácticas: el túnel solo expone el puerto 3000 mientras está abierto; no publiques la dirección ni lo dejes abierto sin necesidad. La app no tiene credenciales ni panel de administración.

También funciona `npm run dev` a través del túnel (`*.trycloudflare.com` está permitido), pero la versión de producción se parece más a la experiencia final.

### Alternativa sin túnel: certificado local

`npm run dev:https` crea un certificado autofirmado (con mkcert). El teléfono no confiará en él a menos que instales la autoridad raíz de mkcert en el teléfono, lo que es más complejo. Por eso se recomienda el túnel.

## Lista de comprobación en el teléfono

Haz la prueba en **Chrome para Android** y en **Safari para iPhone**. Anota los resultados en `fichas-de-prueba.pdf`.

1. Abre `/diagnostico`: conexión segura, WebGL, texturas y mapa base deben aparecer como «Correcto». La URL configurada aparecerá en «Revisar» hasta que exista el dominio definitivo (es normal en pruebas).
2. Escanea el QR de una estación con la cámara nativa: debe abrir `/estacion/<id>` con el planeta en 3D.
3. En el planeta: arrastra para girar, pellizca para acercar, usa +, −, restablecer, vista ampliada, «Etiquetas», la comparación con la Tierra y la acción especial del planeta.
4. **Orientarme**:
   - «Usar mi ubicación»: acepta el permiso. Debe mostrar la precisión del GPS, la estación más cercana y la siguiente.
   - «Activar brújula»: en iPhone el sistema pide permiso de movimiento; en Android no hay aviso. La flecha debe girar al mover el teléfono, sostenido horizontal o inclinado como para leer la pantalla.
   - Repite rechazando los permisos: la app debe seguir funcionando con la estación del QR.
5. **Mapa**: «Mostrar mi ubicación» y «Mostrar todo el recorrido»; los botones + y − se pueden tocar con el pulgar sin errar.
6. **Sistema solar**: «Reproducir», elegir una fecha, «Ahora».
7. Gira el teléfono a horizontal y vuelve a vertical.
8. Con la versión de producción por https: visita algunas estaciones, activa el modo avión y vuelve a abrirlas (deben cargar desde la caché; el mapa base no).

## Si un permiso quedó bloqueado

- **iPhone (ubicación)**: Ajustes → Privacidad y seguridad → Localización → Sitios web de Safari → «Al usar la app». Para volver a ver la pregunta de un sitio: Ajustes → Safari → Avanzado → Datos de sitios web → borra el sitio.
- **iPhone (brújula)**: si rechazaste «Movimiento y orientación», borra los datos del sitio (como arriba) y vuelve a abrirlo.
- **Android (Chrome)**: toca el candado de la barra de direcciones → Permisos → Ubicación. La brújula depende del sensor magnético: si va errática, calíbrala moviendo el teléfono en forma de ocho y aléjate de autos y rejas metálicas.

## Qué esperar de la precisión

- GPS al aire libre: típicamente entre 3 y 15 m; bajo árboles o junto a edificios, peor. La app muestra la precisión y oculta la flecha si no alcanza para una dirección confiable.
- Brújula del teléfono: puede desviarse varios grados (o mucho más cerca de metales). La app dibuja un abanico con la incertidumbre en lugar de una flecha que parezca exacta. Corrige la declinación magnética (WMM2025), así que la flecha se refiere al norte geográfico, igual que los rumbos a las estaciones.
- Para comprobar la brújula: compara el rumbo que muestra «Orientación del teléfono» con una brújula de referencia (o con la app de brújula del teléfono configurada en «norte verdadero»), con el teléfono horizontal y luego inclinado como para leer la pantalla. Anota la diferencia en las fichas.
