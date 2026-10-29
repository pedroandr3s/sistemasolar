# Códigos QR

Esta carpeta guarda los códigos QR generados por `scripts/qr/`. Hay dos conjuntos que **nunca se mezclan**:

| Carpeta | Para qué | Cómo se genera | Estado actual |
|---|---|---|---|
| `desarrollo/` | Probar desde el teléfono. Llevan la marca «SOLO PARA PRUEBAS - NO INSTALAR» | `npm run qr:dev` (red local, detecta la IP) o `npm run tunel` (HTTPS temporal) | Se crea en tu computador al ejecutar el comando, con la dirección real de esa prueba. No se guarda en git |
| `produccion/` | Imprimir e instalar en las esculturas | `npm run qr:prod`, con `NEXT_PUBLIC_SITE_URL` = dominio definitivo en `.env.production.local` | **Pendiente: falta el dominio.** El generador se niega a crear QR definitivos con URL vacías, de ejemplo, HTTP, de red local o de túneles |

Cada conjunto contiene: `png/` y `svg/` (uno por estación, más una versión SVG con el nombre), `qr-imprimible.pdf`, `fichas-de-prueba.pdf`, `manifiesto.json`, `manifiesto.csv` y `LEEME.txt`. Cada PNG se decodifica al generarse y el proceso falla si su contenido no coincide con la URL de la estación.

Detalles e indicaciones de impresión: [docs/QR.md](../../docs/QR.md).
