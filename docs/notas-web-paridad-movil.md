# Notas web — paridad con diseño móvil

Documentación de los cambios (junio 2026) que alinean la sección **Notas** de la web con la app Android.

---

## Resumen

La pestaña **Notas** del menú web ahora replica la estructura y el editor de la app móvil:

| Área | Antes (web) | Ahora (web, como móvil) |
|------|-------------|-------------------------|
| Navegación | Solo libretas | Pestañas **Libretas · Diario · Libros** |
| Editor | Textarea plano + barra de tags/adjuntos | Editor enriquecido WYSIWYG (mismo HTML base que Android) |
| Fuentes | Botón sin modal funcional | Selector de fuente conectado al iframe, con fuentes de sistema y populares |
| Imágenes | Sin inserción desde editor | Subida a `/api/upload`, inserción como URL pública y edición visual dentro del editor |
| Referencias | No disponible desde notas web | Modal de referencias cruzadas equivalente a mobile |
| Diccionario | Botón sin flujo completo | Modal Strong con búsqueda, exploración, paginación e inserción HTML |
| Vista previa | No existía | Toggle **Vista previa / Editar** |
| Lista de notas | Resumen con regex markdown | `stripNotePreview()` — soporta HTML y markdown, métricas y orden profesional |
| Cabecera del editor | Iconos + Publicar + tags | **Volver · Borrar · Guardar** con estado de guardado, palabras y lectura estimada |
| Diseño visual | Web con estructura distinta | Header, estantería, detalle de libreta y editor adaptados al lenguaje visual mobile |

---

## Archivos nuevos

| Archivo | Rol |
|---------|-----|
| `components/notes-section.tsx` | Pantalla unificada con encabezado y pestañas segmentadas |
| `components/ui/segment-tabs.tsx` | UI de pestañas (Libretas / Diario / Libros) |
| `components/note-rich-editor.tsx` | Editor iframe + vista previa de solo lectura |
| `lib/note-editor-html.ts` | Plantilla HTML del editor (portada desde `mobile/lib/editorHtml.ts`) |
| `lib/note-editor-theme.ts` | Colores del editor leídos de variables CSS del tema web |
| `lib/notebook-covers.ts` | `stripNotePreview()`, tags y utilidades de libretas |

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `components/notebook-sidebar.tsx` | Editor móvil, preview en lista, modo `embedded`, rediseño visual de estantería/detalle/editor |
| `components/notes-section.tsx` | Header en tarjeta y pestañas con etiquetas móviles (`Notas`, `Diario`, `Biblioteca`) |
| `components/note-rich-editor.tsx` | Puente iframe/web para imágenes, versículos, referencias y diccionario |
| `lib/app-section-registry/sections.client.tsx` | La sección `notebook` renderiza `NotesSection` |
| `lib/app-section-registry/outlet.tsx` | Layout `notebook` sin padding extra (pantalla completa) |

---

## Cómo funciona el editor enriquecido

1. `NoteRichEditor` monta un `<iframe>` con `srcDoc` generado por `getEditorHtml()`.
2. El iframe incluye la barra de formato **dentro** del HTML (negrita, tamaños, colores, listas, tablas).
3. Comunicación iframe ↔ React vía `postMessage` (mismo protocolo que el WebView de Android).
4. Botones **Fuente**, **Insertar versículo**, **Insertar referencias**, **Insertar del diccionario** e **imagen** envían eventos al padre; la web abre el modal correspondiente o el selector de archivos.
5. Al guardar, se solicita el HTML actual con `{ type: 'getHtml' }` antes del `PUT` a la API.
6. Al insertar bloques externos se marca la nota como modificada para que el botón Guardar y el autoguardado persistan el contenido.

### Adaptación visual mobile → web

Commit `f004885` (julio 2026) alinea la UI web con el rediseño móvil documentado en [`docs-mobile/22-notas-diseno-profesional.md`](../docs-mobile/22-notas-diseno-profesional.md).

| Vista web | Componente | Equivalente móvil |
|-----------|------------|-------------------|
| Header de sección | `components/notes-section.tsx` | `mobile/app/(tabs)/notes.tsx` |
| Biblioteca de libretas | `NotebookSidebar` (sin libreta activa) | `mobile/components/notes/NotebooksPanel.tsx` |
| Detalle de libreta | `NotebookSidebar` (libreta activa) | `mobile/app/notebook/[id].tsx` |
| Editor de nota | `NotebookSidebar` (`editingNote`) | `mobile/app/note/[noteId].tsx` |

**Sección Notas (`notes-section.tsx`):**

- Header en tarjeta con icono `FileText`, borde primario y subtítulo orientado a productividad general.
- Pestañas segmentadas con etiquetas móviles: **Notas**, **Diario**, **Biblioteca** (claves internas: `libretas`, `diario`, `libros`).

**Biblioteca de libretas (estantería):**

- Panel **Biblioteca de trabajo** con CTA **Nueva libreta**.
- Métricas en rejilla de 3 columnas: total de libretas, libretas visibles tras filtro y modo de vista (`Todo` / `Filtro`).
- Búsqueda por nombre (`notebookSearch`) que filtra en cliente y ordena por fecha de creación descendente.
- Cuadrícula responsive: 2 columnas en móvil, hasta 4 en pantallas anchas (`md:grid-cols-3`, `xl:grid-cols-4`).
- Tarjetas con portada, badge **Libreta de estudio**, fecha de creación y acciones flotantes editar/eliminar.

**Detalle de libreta:**

- Cabecera en tarjeta con portada ampliada, conteo de notas/palabras y chips decorativos (**Recientes**, **Trabajo**).
- Búsqueda de apuntes por título y contenido HTML limpio (`searchQuery` + `stripNotePreview`).
- Orden por recientes, A-Z o notas largas; notas fijadas arriba.
- Tarjetas de nota con métricas de lectura, preview de texto, exportar **PDF** y CTA **Abrir**.

**Editor:**

- Barra superior solo con **Volver · Borrar · Guardar** (sin estado de guardado en la barra).
- Título, indicador de estado (punto ámbar/verde), palabras, minutos y toggle **Vista previa / Editar** agrupados en una tarjeta de documento.

### Selector de fuente

- El botón **Tt** abre un modal web equivalente al selector móvil.
- Incluye fuentes de sistema y las populares que usa mobile.
- Si hay texto seleccionado, aplica la fuente solo a esa selección.
- Si no hay selección, aplica la fuente al contenido completo y la deja persistida dentro del HTML guardado.

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

- El botón **Vista previa** muestra el contenido renderizado con `NoteContent` (iframe en modo solo lectura).
- **Editar** vuelve al editor enriquecido.
- En modo vista previa el autoguardado no corre (igual que en móvil al no editar).

---

## Pestañas de la sección Notas

Equivalente a `mobile/app/(tabs)/notes.tsx`:

```text
Notas
├── Notas       → NotebookSidebar (embedded, pestaña libretas)
├── Diario      → Devotionals
└── Biblioteca  → PersonalLibrary
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
2. Comprueba el header en tarjeta y las pestañas **Notas**, **Diario**, **Biblioteca**.
3. En **Notas**, verifica el panel **Biblioteca de trabajo**, las métricas y la búsqueda de libretas.
4. Abre una libreta: confirma cabecera con portada, chips y búsqueda/orden de apuntes.
5. Crea o edita una nota; usa formato, fuente e **Insertar versículo**.
6. Inserta una imagen, redimensiónala y alinéala; guarda, sal y vuelve a abrir la nota.
7. Inserta referencias cruzadas y una entrada del diccionario.
8. Activa **Vista previa** y vuelve a **Editar** sin perder contenido.
9. Guarda y vuelve a la lista: el resumen debe ser texto legible, no HTML crudo.
10. Edita una nota y pulsa **Volver** antes de 4 s sin guardar: los cambios no deben persistir (comportamiento esperado en web).

---

## Notas técnicas

- El lector bíblico (`components/bible-reader`) sigue usando `NotebookSidebar` directamente en el panel lateral, sin pestañas ni header de `NotesSection`.
- La publicación de notas al feed de comunidad se retiró del editor web para igualar la UX móvil (solo Guardar / Borrar).
- **Autoguardado web:** tras **4 s** sin cambios (`contentDirty`), se llama a `requestEditorHtml()` y `handleSaveNote(..., { silent: true })`. No corre en modo vista previa ni mientras ya guarda.
- **Volver no guarda:** a diferencia del `beforeRemove` de Android, pulsar **Volver** en web solo cierra el editor. Espera el autoguardado de 4 s o pulsa **Guardar** antes de salir si acabas de editar. Ver también [`docs-mobile/14-notas-autoguardado-y-preview.md`](../docs-mobile/14-notas-autoguardado-y-preview.md).
- Utilidades compartidas con móvil en `lib/notebook-covers.ts`: `stripNotePreview()`, `countNoteWords()`, `estimateNoteReadMinutes()`, `isNotePinned()`.

---

## Documentación relacionada

| Documento | Contenido |
|-----------|-----------|
| [`docs-mobile/22-notas-diseno-profesional.md`](../docs-mobile/22-notas-diseno-profesional.md) | Rediseño visual móvil que esta web replica |
| [`docs-mobile/17-notas-productividad-general.md`](../docs-mobile/17-notas-productividad-general.md) | Búsqueda, métricas y orden en listas |
| [`docs-mobile/14-notas-autoguardado-y-preview.md`](../docs-mobile/14-notas-autoguardado-y-preview.md) | Autoguardado móvil vs comportamiento web |
| [`docs-mobile/21-insercion-y-edicion-de-imagenes.md`](../docs-mobile/21-insercion-y-edicion-de-imagenes.md) | Imágenes en el editor enriquecido |

---

*Última revisión: julio 2026 (diseño mobile → web, commit `f004885`).*
