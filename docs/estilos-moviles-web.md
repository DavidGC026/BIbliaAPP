# Estilos móviles en la web — teclado y área de escritura

Fecha: julio 2026

Revisión de la experiencia móvil de la web, motivada por dos síntomas en la
sección **Notas**: el teclado tapaba el editor y el área de escritura era
demasiado pequeña.

## Diagnóstico

### 1. El teclado no reflowaba el layout (causa raíz)

La app no declaraba `viewport` propio, así que Next.js emitía el valor por
defecto `width=device-width, initial-scale=1`. Sin `interactive-widget`, el
navegador usa `resizes-visual`: **el teclado encoge solo el viewport visual, no
el de layout**. Consecuencias:

- `100dvh` no cambiaba al abrirse el teclado;
- el editor, que es el último bloque de la columna, quedaba **debajo** del
  teclado;
- la barra de formato del editor (pegada al fondo del iframe) quedaba fuera de
  la pantalla.

### 2. El área útil ya era pequeña antes del teclado

Medido en un Android de 360×640 con el layout `notebook` del outlet
(`h-[calc(100dvh-160px)]`):

| Bloque | Alto |
|--------|------|
| Viewport | 640 px |
| − header de la app (64) + tabbar (72) + padding (24) | 480 px |
| − cabecera del editor (Volver / Guardar) | ~424 px |
| − bloque de título + métricas | ~304 px |
| − barra de formato dentro del iframe | **~208 px de escritura** |

Con el teclado abierto (~290 px) la mayor parte de esos 208 px quedaba oculta.

### 3. `env(safe-area-inset-*)` no hacía nada

El CSS ya usaba `env(safe-area-inset-*)` en header, tabbar y hojas inferiores,
pero sin `viewport-fit=cover` esas variables valen `0`.

### 4. Modales con `vh`

Varios modales usaban `vh`, que en móvil ignora la barra dinámica del navegador
y provoca desbordes.

## Cambios

### Viewport — [`app/layout.tsx`](../app/layout.tsx)

```ts
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
  viewportFit: 'cover',
}
```

`resizes-content` hace que el layout (y `100dvh`) reflowe al abrirse el
teclado, en toda la app, no solo en Notas. `viewportFit: cover` activa los
`env(safe-area-inset-*)` que el CSS ya usaba.

Como el contenido ahora llega al borde físico, `body .mobile-app-header` crece
con `env(safe-area-inset-top)` para no quedar bajo el notch (el selector lleva
`body` para ganarle en especificidad a la utilidad `h-[64px]` de Tailwind).

### Modo inmersivo de escritura

Mientras se edita una nota en móvil, el editor ocupa **toda la pantalla**:

- [`components/notebook-sidebar.tsx`](../components/notebook-sidebar.tsx) pone
  `note-immersive` en `<body>` y mantiene `--app-visual-height` sincronizada
  con `window.visualViewport`;
- [`app/globals.css`](../app/globals.css) oculta `.mobile-app-header` y
  `.mobile-tabbar`, quita el padding de `.mobile-content-frame` /
  `.mobile-section-shell` y ata el alto del contenedor de sección a esa
  variable.

La variable cubre **iOS**, donde `interactive-widget` no está soportado y
`100dvh` no encoge con el teclado. La salida del modo es el botón **Volver** del
propio editor, igual que la pantalla dedicada de la app móvil.

Es **opt-in** (`immersiveOnMobile`): solo lo usa la sección Notas. El editor
embebido del lector conserva el chrome porque vive dentro de un panel dividido.

### Bloque de título adaptativo

- En móvil, cabecera y bloque de título más compactos (título `text-xl`,
  paddings menores) y las métricas de palabras/minutos se ocultan bajo `sm`.
- Con el **teclado abierto** (`body.keyboard-open`, detectado comparando la
  altura visible contra la mayor observada, con margen de 120 px) el bloque se
  reduce a solo el título y se oculta la fila de estado, devolviendo ~45 px más
  al área de escritura.

### `vh` → `dvh`

`notebook-sidebar` (modales de versículo y diccionario), `reading-plans`,
`verse-image-creator` y la hoja "Más" de `app/page.tsx`.

## Resultado medido

Con un contenedor idéntico al del layout `notebook` en 360×640:

| Estado | Alto del contenedor |
|--------|---------------------|
| Antes | 480 px |
| Inmersivo, sin teclado | 640 px (+160) |
| Inmersivo, con teclado (~290 px) | 350 px, **completamente visible sobre el teclado** |

El área de escritura pasa de ~208 px a ~400 px sin teclado. Con el teclado
abierto ya no queda tapada y la barra de formato es alcanzable, que era el
problema real.

## Pendiente

- El editor sigue sin **rueda cromática** ni **fuente por nota**, presentes en
  móvil (ver [docs-mobile/16](../docs-mobile/16-editor-webview-teclado-seleccion.md)
  y [docs-mobile/20](../docs-mobile/20-plan-maestro-mejoras-generales.md)).
- Revisión fina de espaciados en el resto de secciones en pantallas pequeñas.

## Verificación

```bash
npx tsc --noEmit
npx next build
```

Pruebas manuales en un teléfono real (lo que no cubre el navegador headless):

1. Abrir una nota: el header y la tabbar deben desaparecer y el editor ocupar
   toda la pantalla.
2. Tocar el cuerpo de la nota: al abrirse el teclado, el área de escritura y la
   barra de formato deben quedar **encima** del teclado, y el bloque de título
   reducirse a una sola línea.
3. Cerrar el teclado: el bloque de título vuelve a mostrar el estado de guardado
   y las métricas.
4. **Volver**: reaparecen header y tabbar.
5. En iPhone con notch, comprobar que el header no queda bajo la barra de estado
   y que la tabbar no pisa el indicador de inicio.
6. Editar una nota desde el lector: ahí el chrome **no** debe ocultarse.
