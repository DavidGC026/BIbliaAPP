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

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `mobile/lib/editorHtml.ts` | `scrollCaretIntoView()` preserva selección; `handleAction()` sin `focus()` en lecturas/insets |
| `mobile/app/note/[noteId].tsx` | `blurEditor` al cerrar teclado en Android |

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

---

## Paridad web

- El selector de fuente web replica el flujo `setFont` / `openFontModal` del iframe — ver [`docs/notas-web-paridad-movil.md`](../docs/notas-web-paridad-movil.md) (§ Selector de fuente).
- Al editar imágenes, la web muestra el chip **Editando imagen** y deshabilita el título vía `onImageEditMode` en `NoteRichEditor` — ver [`22-notas-diseno-profesional.md`](./22-notas-diseno-profesional.md) y [`21-insercion-y-edicion-de-imagenes.md`](./21-insercion-y-edicion-de-imagenes.md) §10.
