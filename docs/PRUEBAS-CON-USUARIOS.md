# Guion de prueba con niños (8 a 12 años)

Nada de la interfaz actual está probado con niños ni en teléfonos físicos: se verificó con pruebas automáticas y capturas. Este guion sirve para repetir la prueba con usuarios reales después de cada cambio.

## Preparación

- Un teléfono Android con Chrome (ARCore) y, si se puede, un iPhone con Safari. Sitio publicado o `npm run tunel`.
- Un niño por vez, sin ayuda del adulto. El adulto solo lee la tarea y observa.
- Parte desde la pantalla de inicio del teléfono, con el código QR de una parada impreso al lado.
- Anota por tarea: si la logró, cuánto tardó, dónde tocó primero y qué dijo.

## Cinco tareas

| # | Tarea (se lee tal cual) | Se logra si… | Tiempo esperado |
|---|---|---|---|
| 1 | «Abre el Sol con este código.» | Usa «Escanear QR» o la cámara y llega a la página del Sol. | 30 s |
| 2 | «Haz girar el Sol y míralo más de cerca.» | Arrastra el modelo y usa «Acercar». | 20 s |
| 3 | «Mira Saturno con la cámara, como si estuviera aquí.» | Llega a Saturno y pulsa «Ver en realidad aumentada». | 60 s |
| 4 | «Llega a Mercurio.» (desde el Sol) | Pulsa «Ir a Mercurio» sin deslizar la página. | 10 s |
| 5 | «¿Cuántas lunas tiene Júpiter?» | Lo dice mirando los tres datos, sin abrir nada más. | 30 s |

Tarea extra, si queda tiempo: «Responde el desafío de la Tierra y cuéntame cómo te fue».

## Qué observar

- **Primeros 5 segundos de cada pantalla:** ¿dice en voz alta qué puede hacer? ¿Toca primero el botón principal?
- **Palabras:** ¿entiende «Parada», «Dónde voy», «Nombres», «Agrandar», «Desafío»? Anota las que pregunta.
- **Ventana de realidad aumentada al abrir el enlace:** ¿la entiende o la cierra por reflejo? ¿Encuentra después el botón grande?
- **Callejones sin salida:** ¿alguna vez no sabe cómo volver?
- **Al sol:** ¿se leen los textos y se distinguen los botones a plena luz?

## Criterio de éxito

Cuatro de cinco niños completan las tareas 1, 4 y 5 sin ayuda y dentro del tiempo. Si una tarea falla dos veces por la misma causa, esa causa es el siguiente cambio de diseño.
