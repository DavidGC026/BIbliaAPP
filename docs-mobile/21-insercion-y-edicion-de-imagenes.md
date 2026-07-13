# 21 — Inserción y edición de imágenes en notas

Documentación del editor enriquecido móvil (julio 2026) para insertar imágenes en notas y editarlas desde el WebView, más la regresión crítica que dejaba la toolbar inoperante.

---

## Objetivo

Permitir que las notas incluyan imágenes con controles básicos de edición (tamaño, posición y alineación) sin salir del editor WebView. El panel flota sobre la imagen seleccionada y comparte el mismo puente RN ↔ WebView que el resto de la toolbar (`handleAction` / `postMessage`).

**Archivo principal:** `mobile/lib/editorHtml.ts` (genera el HTML/JS del WebView).

---

## Regresión: toolbar y colores muertos por `.join('\n')`

### Síntoma

Tras tocar el panel de edición de imágenes, el editor dejaba de responder por completo:

- Botones **B / I / U** sin efecto.
- Fila de **colores** vacía.
- Modal de **fuentes** no abría.

### Causa

El script del panel de imágenes se construía dentro del template literal de TypeScript en `getEditorHtml()`. Una línea usaba `.join('\n')` para unir fragmentos de HTML:

```typescript
// Incorrecto dentro de un template literal TS → rompe el JS del WebView
].join('\n');
```

TypeScript interpreta `\n` como salto de línea real al generar el string. El WebView recibe JS inválido (`].join('` + newline + `');`) → `SyntaxError` → **todo** el `<script>` deja de ejecutarse, incluida la toolbar principal.

### Solución

Escapar la secuencia para que llegue como `\n` literal al JavaScript embebido:

```typescript
].join('\\n');
```

En el código actual hay un comentario `ponytail:` junto a esa línea recordando la regla.

---

## Reglas para JS embebido en `getEditorHtml`

Cualquier string JavaScript generado desde un template literal de TypeScript debe escapar:

| Carácter / secuencia | Escapar como | Si no… |
|----------------------|--------------|--------|
| Nueva línea en string JS | `\\n` | `SyntaxError`; toolbar muerta |
| Unicode en string JS | `\\uXXXX` | Caracteres rotos o error de parseo |
| Backtick | `\`` o concatenación | Cierra el template literal antes de tiempo |
| `${` | `\${` | Interpola TypeScript donde no corresponde |

**Señal de alarma:** si la toolbar, los colores y las fuentes fallan a la vez, revisar la consola del WebView (Remote Debugging) buscando `SyntaxError` al cargar la página del editor.

---

## Flujo de imágenes en el editor

| Paso | Dónde | Qué ocurre |
|------|-------|------------|
| Insertar | Toolbar del editor → acción de imagen | React Native abre selector (`expo-image-picker`); la URI se envía al WebView con `handleAction`. |
| Render | WebView (`editorHtml.ts`) | La imagen se inserta como bloque `<img>` dentro del `contenteditable`, con estilos inline de ancho/alineación. |
| Seleccionar | Tap en la imagen | Aparece el panel flotante de edición (redimensionar, alinear izquierda/centro/derecha, eliminar). |
| Modo edición | `app/note/[noteId].tsx` | `imageEditMode` bloquea el teclado, oculta la toolbar y muestra el aviso **Editando imagen** en la cabecera del documento (doc 22). |
| Persistir | Auto-guardado / Guardar | El HTML con `<img>` viaja en `innerHTML` y se guarda en SQLite/API como el resto del contenido enriquecido. |

Limitaciones actuales (ver también plan maestro doc 20):

- Las imágenes quedan embebidas en el HTML de la nota; no hay CDN separado para adjuntos de notas offline.
- Exportar a PDF (`lib/noteExport.ts`) y compartir como texto plano respetan el HTML guardado; imágenes muy grandes pueden alargar el export.

---

## Archivos tocados

| Archivo | Rol |
|---------|------|
| `mobile/lib/editorHtml.ts` | HTML/CSS/JS del WebView; panel de imágenes y toolbar |
| `mobile/app/note/[noteId].tsx` | Puente RN: picker, `sendToEditor`, `imageEditMode`, auto-guardado del HTML |
| `mobile/lib/notebookCovers.ts` | Preview de listas ignora etiquetas HTML (incluye `<img>`) |

---

## Cómo probar

```bash
cd mobile
npm run android
```

1. Abre una nota con contenido; confirma que **B / I / U**, colores y fuentes funcionan antes de insertar imagen.
2. Inserta una imagen desde la toolbar; verifica que aparece en el cuerpo de la nota.
3. Toca la imagen; usa el panel para cambiar tamaño y alineación.
4. Confirma que el teclado se cierra, la toolbar se oculta y aparece **Editando imagen** en la cabecera.
5. Guarda, sal y reabre la nota: la imagen y su formato deben persistir.
6. **Regresión toolbar:** tras editar una imagen, confirma que colores y fuentes siguen operativos.

---

## Relacionado

- [16 — Editor WebView: teclado y selección](./16-editor-webview-teclado-seleccion.md) — patrones generales del WebView y `handleAction`.
- [20 — Plan maestro](./20-plan-maestro-mejoras-generales.md) — iteración «Fuentes por nota» (misma zona de riesgo en `editorHtml.ts`).
- [22 — Notas: rediseño visual profesional](./22-notas-diseno-profesional.md) — cabecera de documento con aviso de edición de imagen.
