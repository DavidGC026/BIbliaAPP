# 16 — Editor WebView: teclado y «Seleccionar todo»

Correcciones en el editor enriquecido de notas (julio 2026) para dos fallos del WebView `contenteditable` en Android.

---

## 1. «Seleccionar todo» perdía la selección

### Síntoma

Tras usar **Seleccionar todo** del menú contextual del sistema, la selección desaparecía ~50 ms después.

### Causa

`scrollCaretIntoView()` en `mobile/lib/editorHtml.ts` se ejecuta en cada `click`, `input`, `focus` y `resize`. Para medir la posición del cursor insertaba un marcador en el DOM y, al terminar, **siempre restauraba una selección colapsada** (solo el cursor), destruyendo cualquier selección de texto activa.

### Solución

- Si la selección está **colapsada** (solo cursor): se mantiene el marcador temporal para medir y restaurar el caret.
- Si la selección **no está colapsada** (p. ej. «Seleccionar todo»): se usa `Range.getBoundingClientRect()` sin tocar el DOM y se restaura el rango original completo.

---

## 2. Teclado robaba foco o no volvía a abrirse

### Síntomas

| Problema | Cuándo |
|----------|--------|
| El editor quitaba el foco al campo **Título** | Al escribir en el título, el WebView recuperaba el foco solo |
| El teclado se **reabría al guardar** | `getHtml` llamaba a `editor.focus()` antes de leer el HTML |
| Tras cerrar el teclado con **atrás** en Android, un tap no lo reabría | El `contenteditable` seguía enfocado sin teclado visible |

### Causa

`window.handleAction()` hacía `editor.focus()` **incondicional** al inicio, incluso para mensajes que no requieren edición:

- `getHtml` — al guardar o auto-guardar al salir
- `setKeyboardInset` — cada vez que el teclado abre o cierra

### Solución

**En `editorHtml.ts` (`handleAction`):**

| Acción | Comportamiento |
|--------|----------------|
| `getHtml` | Solo devuelve HTML; **sin** `focus()` |
| `updateContent`, `updateColors` | Actualiza estado; **sin** `focus()` |
| `setKeyboardInset` | Si `value > 0`, hace scroll del caret; **sin** `focus()` |
| `blurEditor` | Llama a `editor.blur()` |
| Resto (`setFont`, `insertVerse`, …) | `editor.focus()` y luego la acción |

**En `app/note/[noteId].tsx`:**

Cuando el teclado pasa de abierto a cerrado en **Android** (`keyboardHeight` de `> 0` a `0`), se envía `{ type: 'blurEditor' }` para que el siguiente tap en el editor vuelva a abrir el teclado con normalidad.

---

## Color "Auto" en la barra de colores (julio 2026)

La fila de colores del editor (`colors-row` en `editorHtml.ts`) antepone un swatch **"A" (Auto)** a la paleta de favoritos. Al tocarlo, `applyColor('auto')` llama a `clearColor()`, que marca la selección (o el punto de escritura) con `<span class="note-color-auto">` y limpia los colores explícitos de sus descendientes. La regla `#editor .note-color-auto` resuelve ese marcador con `colors.text` y `!important`, por lo que el texto usa el color del tema vigente (claro/oscuro/sepia), incluso cuando está anidado dentro de un `span` que tenía otro color.

La implementación anterior usaba `color: inherit`. Eso no funcionaba si el texto seleccionado estaba dentro de un elemento coloreado: en ese contexto, “heredar” recuperaba el color explícito del padre en vez del color general del editor, y el botón parecía no hacer nada.

- `activeColor` arranca en `'auto'`: el texto nuevo sigue el color del tema hasta que se elige un color explícito.
- Resuelve el caso "cambié el color y ya no podía volver al automático".
- El mismo marcador y swatch se implementan en `lib/note-editor-html.ts` para mantener paridad con el editor web.
- En móvil, el cambio de color automático también crea una instantánea del historial, por lo que se puede deshacer y rehacer.

## Rueda cromática: selector libre de color (julio 2026)

Al final de la fila de colores (`colors-row`) hay un botón circular con degradado arcoíris que abre un **círculo cromático** para elegir cualquier color, no solo los de la paleta de favoritos.

### Cómo funciona

- Todo vive en el HTML del WebView (`mobile/lib/editorHtml.ts`), sin dependencias nuevas.
- El panel (`#cw-overlay` / `#cw-panel`) contiene:
  - Un **disco matiz/saturación** dibujado una sola vez en `<canvas>` (modelo HSV: ángulo = matiz, radio = saturación).
  - Un **slider de brillo** (valor V del HSV) con degradado de negro al color elegido.
  - **Vista previa** con el código hex y botones **Cancelar / Aplicar**.
- Se puede arrastrar el dedo sobre el disco (touch y mouse); el marcador y la vista previa se actualizan en vivo.
- Al abrir, si `activeColor` es un hex, la rueda arranca posicionada en ese color.
- **Aplicar** usa el mismo `applyColor(hex)` de los swatches (pasa por `wrapRangeStyle`, historial de deshacer y `notifyChange`). La selección del editor se conserva porque `bindToolbarButton` guarda `savedRange` al tocar el botón y `saveSelection()` solo la sobreescribe si la selección está dentro del editor.
- Si el color activo es personalizado (no está en la paleta ni es "auto"), el botón arcoíris se marca como activo.
- El color elegido **no se agrega** a la paleta de favoritos persistida (`NOTE_FAVORITE_COLORS`); solo se aplica al texto.

### Pendiente de paridad

El editor web (`lib/note-editor-html.ts`) aún no tiene este selector; si se quiere paridad, replicar ahí el mismo panel.

### Cómo probar

1. Abre una nota, selecciona texto y toca el botón arcoíris al final de la fila de colores.
2. Arrastra sobre el disco y mueve el slider de brillo; la vista previa y el hex deben seguir el gesto.
3. Pulsa **Aplicar**: el texto seleccionado toma el color y se puede deshacer con ↶.
4. Reabre la rueda: debe arrancar en el color aplicado. **Cancelar** o tocar fuera del panel cierra sin aplicar.

---

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `mobile/lib/editorHtml.ts` | `scrollCaretIntoView()` preserva selección; `handleAction()` sin `focus()` en lecturas/insets; swatch "Auto" + marcador semántico `note-color-auto`; rueda cromática (`#cw-overlay`, `openColorWheel`) |
| `mobile/app/note/[noteId].tsx` | `blurEditor` al cerrar teclado en Android |
| `lib/note-editor-html.ts` | Paridad web del swatch "Auto" y resolución del color según el tema |

---

## Cómo probar

```bash
cd mobile
npm run android
```

1. **Seleccionar todo:** abre una nota con texto, menú contextual → Seleccionar todo. La selección debe permanecer hasta que toques o escribas.
2. **Título:** escribe en el campo Título; el cursor no debe saltar al cuerpo de la nota.
3. **Guardar:** pulsa Guardar con el teclado cerrado; no debe reabrirse solo.
4. **Atrás + tap (Android):** edita la nota, cierra el teclado con el botón atrás del sistema, toca el editor: el teclado debe abrirse de nuevo.
5. **Color automático:** aplica un color a un texto, vuelve a seleccionarlo y pulsa **A**. Debe verse con el color normal del tema; guarda y cambia entre tema claro y oscuro para confirmar que se adapta.
