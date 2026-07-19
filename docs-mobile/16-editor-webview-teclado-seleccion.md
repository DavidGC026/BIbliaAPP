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
- En **web**, el color auto sigue la paleta global elegida en **Apariencia** (sepia, medianoche, DVG, etc.), no solo claro/oscuro. Ver [`docs/temas-visuales-web.md`](../docs/temas-visuales-web.md) y [`docs/notas-web-paridad-movil.md`](../docs/notas-web-paridad-movil.md).

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `mobile/lib/editorHtml.ts` | `scrollCaretIntoView()` preserva selección; `handleAction()` sin `focus()` en lecturas/insets; swatch "Auto" + marcador semántico `note-color-auto` |
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
