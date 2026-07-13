# Notas web — paridad con diseño móvil

Documentación de los cambios (junio 2026) que alinean la sección **Notas** de la web con la app Android.

---

## Resumen

La pestaña **Notas** del menú web ahora replica la estructura y el editor de la app móvil:

| Área | Antes (web) | Ahora (web, como móvil) |
|------|-------------|-------------------------|
| Navegación | Solo libretas | Pestañas **Libretas · Diario · Libros** |
| Editor | Textarea plano + barra de tags/adjuntos | Editor enriquecido WYSIWYG (mismo HTML base que Android) |
| Imágenes | Sin inserción desde editor | Subida a `/api/upload`, inserción como URL pública y edición visual dentro del editor |
| Referencias | No disponible desde notas web | Modal de referencias cruzadas equivalente a mobile |
| Diccionario | Botón sin flujo completo | Modal Strong con búsqueda, exploración, paginación e inserción HTML |
| Vista previa | No existía | Toggle **Vista previa / Editar** |
| Lista de notas | Resumen con regex markdown | `stripNotePreview()` — soporta HTML y markdown, métricas y orden profesional |
| Cabecera del editor | Iconos + Publicar + tags | **Volver · Borrar · Guardar** con estado de guardado, palabras y lectura estimada |

---

## Archivos nuevos

| Archivo | Rol |
|---------|-----|
| `components/notes-section.tsx` | Pantalla unificada con encabezado y pestañas segmentadas |
| `components/ui/segment-tabs.tsx` | UI de pestañas (Libretas / Diario / Libros) |
| `components/note-rich-editor.tsx` | Editor iframe + vista previa de solo lectura |
| `lib/note-editor-html.ts` | Plantilla HTML del editor (portada desde `mobile/lib/editorHtml.ts`) |
| `lib/note-editor-theme.ts` | Colores del editor leídos de variables CSS del tema web |
| `lib/notebook-covers.ts` | Preview, métricas, búsqueda y tags (`stripNotePreview`, `countNoteWords`, pin, etc.) |

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `components/notebook-sidebar.tsx` | Editor, lista con orden/búsqueda/métricas, pin/mover/compartir/PDF, modales de referencias y diccionario |
| `components/note-rich-editor.tsx` | Puente iframe/web para imágenes, versículos, referencias y diccionario |
| `lib/app-section-registry/sections.client.tsx` | La sección `notebook` renderiza `NotesSection` |
| `lib/app-section-registry/outlet.tsx` | Layout `notebook` sin padding extra (pantalla completa) |

---

## Cómo funciona el editor enriquecido

1. `NoteRichEditor` monta un `<iframe>` con `srcDoc` generado por `getEditorHtml()`.
2. El iframe incluye la barra de formato **dentro** del HTML (negrita, tamaños, colores, listas, tablas).
3. Comunicación iframe ↔ React vía `postMessage` (mismo protocolo que el WebView de Android).
4. Botones **Insertar versículo**, **Insertar referencias**, **Insertar del diccionario** e **imagen** envían eventos al padre; la web abre el modal correspondiente en `notebook-sidebar.tsx` o el selector de archivos.
5. Al guardar, se solicita el HTML actual con `{ type: 'getHtml' }` antes del `PUT` a la API.
6. Al insertar bloques externos se marca la nota como modificada para que el botón Guardar y el autoguardado persistan el contenido.

### Inserción y edición de imágenes

- El botón de imagen del editor abre un selector nativo de archivos desde React.
- La imagen se sube a `/api/upload` con `purpose=other`.
- Si el backend devuelve `filename`, la web inserta una URL absoluta `/uploads/{filename}` para que la imagen sobreviva al salir y volver a abrir la nota.
- La edición visual se mantiene dentro del iframe: redimensionar, alinear, mover y borrar sin perder el contenido al guardar.

### Referencias cruzadas

Flujo equivalente a `mobile/components/InsertReferenceModal.tsx`:

1. Seleccionar Biblia, libro, capítulo y versículo origen.
2. Consultar `/api/references?bible=...&bookId=...&chapter=...&verse=...`.
3. Elegir una o varias referencias.
4. Insertar un bloque HTML con la fuente y las referencias seleccionadas.

### Diccionario Strong

Flujo equivalente a `mobile/components/InsertDictionaryModal.tsx`:

1. Buscar por código Strong, lema, transliteración o significado.
2. Filtrar por todos, griego o hebreo.
3. Explorar entradas con paginación.
4. Insertar el bloque `.biblia-dict-entry`, ya estilizado por `lib/note-editor-html.ts`.

### Vista previa

- El botón **👁️ Vista Previa** muestra el contenido renderizado con `NoteContent` (iframe en modo solo lectura).
- **✏️ Modo Edición** vuelve al editor enriquecido.

---

## Pestañas de la sección Notas

Equivalente a `mobile/app/(tabs)/notes.tsx`:

```text
Notas
├── Libretas   → NotebookSidebar (embedded)
├── Diario     → Devotionals
└── Libros     → PersonalLibrary
```

Las secciones **Diario** y **Libros** siguen existiendo por separado en el menú lateral; dentro de **Notas** quedan agrupadas como en móvil.

---

## Mismo backend, mismo formato

Móvil y web **no usan sistemas distintos**. Ambos guardan en MySQL vía la misma API:

| Tipo | Tabla | API |
|------|-------|-----|
| Notas de libreta | `bible_notebook_notes` | `/api/notebooks/...` |
| Notas de versículo | `bible_note_links` | `/api/links`, `/api/notes/[id]` |

El contenido de libretas en móvil se guarda como **HTML** (editor WebView). La web ahora:

1. **Lee HTML tal cual** — `normalizeNoteContentForEditor()` no reescribe HTML existente.
2. **Guarda HTML** — el editor enriquecido envía el mismo formato que Android.
3. **Título opcional** — si falta título, se usa `"Sin título"` (igual que móvil).

Utilidad compartida: `lib/note-content.ts`.

### Sincronización móvil

La app Android guarda primero en SQLite local y sube al servidor con `syncAll()` cuando hay conexión. Para ver en web una nota creada en móvil:

- Debes usar **la misma cuenta**.
- La app debe tener **conexión** (o sincronizar al volver online).
- En web, recarga la libreta (vuelve a entrar o refresca).

---

## Preview en la lista de libretas

Las notas guardadas desde el editor enriquecido usan **HTML**. En la lista del cuaderno, `stripNotePreview()`:

1. Detecta si el contenido parece HTML.
2. Convierte a texto plano (quita etiquetas, decodifica entidades).
3. Mantiene compatibilidad con notas antiguas en markdown.
4. Recorta a ~100 caracteres.

Misma lógica que `mobile/lib/notebookCovers.ts`.

Utilidades en `lib/notebook-covers.ts` (paridad con móvil):

| Función | Uso en web |
|---------|------------|
| `stripNotePreview()` | Resumen en tarjetas de nota |
| `noteHtmlToPlainText()` | Búsqueda dentro del contenido enriquecido y compartir |
| `countNoteWords()` | Métricas de libreta, orden «Largas» y cabecera del editor |
| `estimateNoteReadMinutes()` | Tarjetas de nota y cabecera del editor (~220 palabras/min) |
| `isNotePinned()` / `togglePinnedNoteTag()` | Fijar notas arriba vía tag `pinned` en JSON de tags |

---

## Organización y productividad en libretas

Equivalente a `docs-mobile/17-notas-productividad-general.md` y al rediseño visual de `docs-mobile/22-notas-diseno-profesional.md`.

### Lista de notas

- **Búsqueda:** filtra por título y por texto plano del HTML (`noteHtmlToPlainText`), no por etiquetas crudas.
- **Orden:** chips **Recientes** (por `updatedAt`), **A-Z** (título en español) y **Largas** (más palabras primero). Las notas **fijadas** (`pinned` en tags) quedan siempre arriba.
- **Métricas de libreta:** cabecera con total de notas y palabras de la libreta activa.
- **Tarjetas:** preview legible, tags de color, minutos de lectura, conteo de palabras, fecha de actualización.

### Acciones por nota

| Acción | Comportamiento web |
|--------|-------------------|
| Fijar / desfijar | `PUT /api/notebooks/notes/:id` con tag `pinned` en el array JSON de tags |
| Mover | Modal elige otra libreta; mismo endpoint con `notebookId` destino |
| Compartir | `navigator.share` si existe; si no, copia título + texto plano al portapapeles |
| Exportar PDF | Abre ventana con el HTML de la nota y dispara `window.print()` (sin servidor) |
| Borrar | `DELETE /api/notebooks/notes/:id` con confirmación |

El tag `pinned` no aparece como chip de color en la UI (solo los tags de `NOTE_TAGS`: fe, familia, adoración, crecimiento).

### Cabecera del editor

Barra compacta con indicador de estado (**Listo** / **Sin guardar** / **Guardando…** / hora de último guardado), conteo de palabras, minutos estimados y toggle **Vista previa / Editar** (sin emojis, alineado al rediseño móvil).

---

## Autoguardado (web)

La web guarda en silencio tras **4 segundos** sin cambios mientras el editor está abierto (`contentDirty`):

1. Solicita HTML actual con `requestEditorHtml()` (timeout **5000 ms**, igual que móvil tras imágenes grandes).
2. Llama a `handleSaveNote(..., { silent: true })` → `PUT /api/notebooks/notes/:id`.
3. Si falla, no muestra alerta; el siguiente ciclo de autoguardado o un **Guardar** manual reintenta.

**Diferencia con Android:** en móvil el auto-guardado también corre al salir con **atrás** (`beforeRemove` en doc 14). En web, **Volver** cierra el editor **sin** guardar de inmediato. Si acabas de escribir y sales antes de que pasen los 4 s, pulsa **Guardar** o espera a ver **Guardado** en la cabecera.

El autoguardado no corre en **Vista previa** ni mientras ya hay un guardado en curso.

---

## Despliegue

Tras cambios en estos archivos, reinicia el contenedor de la app:

```bash
docker restart biblia2-app
docker logs -f biblia2-app   # esperar "Ready"
curl -s http://127.0.0.1:3003/api/health
```

Recarga el navegador con **Ctrl+Shift+R** en https://biblia2.dvguzman.com → menú **Notas**.

---

## Cómo probar

1. Inicia sesión y abre **Notas** en el menú.
2. Comprueba las tres pestañas: Libretas, Diario, Libros.
3. Abre una libreta → crea o edita una nota.
4. Usa formato (negrita, color, listas) y **Insertar versículo**.
5. Inserta una imagen, redimensiónala y alinéala; guarda, sal y vuelve a abrir la nota.
6. Inserta referencias cruzadas y una entrada del diccionario.
7. Activa **Vista previa** y verifica que el contenido se ve bien.
8. Guarda y vuelve a la lista: el resumen debe ser texto legible, no HTML crudo.
9. Fija una nota, cámbiala de orden con **Recientes/A-Z/Largas** y muévela a otra libreta.
10. Comparte una nota y exporta otra a PDF desde el enlace **PDF** de la tarjeta.

---

## Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---------|----------------|-----------|
| La imagen no se ve tras insertarla | Se guardó con `/api/media/:id` (requiere sesión) en lugar de `/uploads/{uuid}` | Reinsertar la imagen; ver `docs-mobile/21-insercion-y-edicion-de-imagenes.md` §9 |
| Guardé pero al volver falta texto reciente | Saliste con **Volver** antes del autoguardado (4 s) | Usar **Guardar** explícito o esperar el indicador **Guardado** |
| Toolbar del editor muerta o colores vacíos | Escape `\n` mal escapado en el template de `lib/note-editor-html.ts` | Usar `\\n` dentro del template literal; ver doc 21 §5 |
| Referencias o diccionario no insertan nada | Modal cerrado sin selección o error de API | Revisar red en DevTools; comprobar `/api/references` y `/api/dictionary` |
| Nota fijada no sube al inicio | Tag `pinned` ausente en el JSON de tags | Verificar respuesta del `PUT`; recargar lista de notas |

---

## Documentación relacionada

| Documento | Contenido |
|-----------|-----------|
| [`docs-mobile/17-notas-productividad-general.md`](../docs-mobile/17-notas-productividad-general.md) | Origen móvil: búsqueda, orden, pin, mover, compartir |
| [`docs-mobile/21-insercion-y-edicion-de-imagenes.md`](../docs-mobile/21-insercion-y-edicion-de-imagenes.md) | Imágenes, URL pública `/uploads/`, panel de edición, regresión toolbar |
| [`docs-mobile/14-notas-autoguardado-y-preview.md`](../docs-mobile/14-notas-autoguardado-y-preview.md) | Autoguardado al salir en Android (contraste con web) |
| [`docs-mobile/22-notas-diseno-profesional.md`](../docs-mobile/22-notas-diseno-profesional.md) | Rediseño visual móvil de libretas y editor |

---

## Notas técnicas

- El lector bíblico (`components/bible-reader`) sigue usando `NotebookSidebar` directamente en el panel lateral, sin pestañas.
- La publicación de notas al feed de comunidad se retiró del editor web para igualar la UX móvil (solo Guardar / Borrar).
- La web ahora tiene autoguardado silencioso tras **4 s** sin escribir y solicita el HTML actual del iframe (`requestEditorHtml`, timeout 5 s) antes del guardado manual y del autoguardado.
- Las imágenes de notas usan URLs absolutas bajo `/uploads/` (sin auth), no `/api/media/:id`. Mismo contrato que móvil (`getPublicUploadUrl`).
- `notebookEditingNote` en `lib/app-section-registry/types.ts` incluye `tags?: string` para conservar tags al editar entre secciones.

---

*Última revisión: julio 2026.*
