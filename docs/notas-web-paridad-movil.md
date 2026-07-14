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
| `components/notebook-sidebar.tsx` | Editor móvil, preview en lista, modo `embedded` dentro de pestañas |
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

- La pantalla **Notas** usa header en tarjeta, icono con borde y texto secundario como mobile.
- Las pestañas usan los nombres móviles: **Notas**, **Diario** y **Biblioteca**.
- La biblioteca de libretas usa panel de acción, métricas, búsqueda y cards en cuadrícula con portada e indicadores.
- El detalle de libreta usa cabecera compacta con portada, conteo de notas/palabras, acciones y búsqueda.
- El editor agrupa título, estado de guardado, palabras, minutos y vista previa dentro de una cabecera de documento.

### Selector de fuente

- El botón **Tt** abre un modal web equivalente al selector móvil.
- Incluye fuentes de sistema y las populares que usa mobile.
- Si hay texto seleccionado, aplica la fuente solo a esa selección.
- Si no hay selección, aplica la fuente al contenido completo y la deja persistida dentro del HTML guardado.

### Inserción y edición de imágenes

- El botón de imagen del editor abre un selector nativo de archivos desde React.
- La imagen se sube a `/api/upload` con `purpose=other`.
- Si el backend devuelve `filename`, la web inserta una URL absoluta `${origin}/uploads/{filename}` para que la imagen sobreviva al salir y volver a abrir la nota (mismo contrato que móvil; ver [`docs-mobile/21-insercion-y-edicion-de-imagenes.md`](../docs-mobile/21-insercion-y-edicion-de-imagenes.md) §9).
- La edición visual se mantiene dentro del iframe: redimensionar, alinear, subir/bajar bloques y borrar. El iframe emite `{ type: 'imageEditMode', active }` al host; `NoteRichEditor` expone `onImageEditMode` y `notebook-sidebar.tsx` muestra el chip **Editando imagen** y deshabilita el título mientras el panel está activo (paridad doc 22).
- El timeout de `requestEditorHtml` es **5000 ms** (notas con imágenes tardan más en cruzar el `postMessage`).

#### Brechas de paridad (solo móvil, julio 2026)

`lib/note-editor-html.ts` porta la edición básica de imágenes, pero **no** incluye aún las mejoras avanzadas de `mobile/lib/editorHtml.ts`:

| Funcionalidad | Móvil | Web |
|---------------|-------|-----|
| Modo **Fondo** (imagen detrás del texto) + botón **Fondos 🖼️** | Sí | No |
| Arrastre libre de fondos (`.is-dragging`, `body.image-dragging`) | Sí | No |
| Animación FLIP al **Subir/Bajar** bloques | Sí | Salto instantáneo |
| Historial **Deshacer/Rehacer** por instantáneas de HTML (`commitHistory`) | Sí | Solo `execCommand('undo')` nativo (no cubre ediciones de imagen) |
| Encabezado compacto fullscreen al editar imagen (oculta header nativo) | Sí | Chip en cabecera de documento |
| Fallback offline base64 en el picker | Sí | Requiere conexión para subir |

Notas abiertas en web con imágenes en modo **Fondo** se ven correctamente en vista previa, pero no se pueden editar en ese modo desde la web hasta portar la lógica. Detalle técnico: doc 21 §3–§4, §12–§13.

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

- El pill **Vista previa / Editar** usa iconos `Eye` / `Edit2` (texto plano, sin emojis) y alterna entre el editor enriquecido y el contenido renderizado con `NoteContent` (iframe en modo solo lectura).

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
4. Usa formato (negrita, color, listas), cambia fuente y usa **Insertar versículo**.
5. Inserta una imagen, redimensiónala y alinéala; guarda, sal y vuelve a abrir la nota.
6. Inserta referencias cruzadas y una entrada del diccionario.
7. Activa **Vista previa** y verifica que el contenido se ve bien.
8. Guarda y vuelve a la lista: el resumen debe ser texto legible, no HTML crudo.

---

## Notas técnicas

- El lector bíblico (`components/bible-reader`) sigue usando `NotebookSidebar` directamente en el panel lateral, sin pestañas.
- La publicación de notas al feed de comunidad se retiró del editor web para igualar la UX móvil (solo Guardar / Borrar).
- La web tiene autoguardado silencioso tras ~4 s sin escribir y solicita el HTML actual del iframe antes del guardado manual.
- **Volver** no dispara autoguardado inmediato (a diferencia del `beforeRemove` móvil): espera el debounce o pulsa **Guardar** antes de salir si acabas de editar.
- La fuente de toda la nota en móvil vive en SecureStore (`NOTE_FONT_<id>`); en web se persiste como envoltorio HTML — no hay sincronización cruzada (doc 20).

---

## Documentación relacionada

| Doc | Contenido |
|-----|-----------|
| [`docs-mobile/21-insercion-y-edicion-de-imagenes.md`](../docs-mobile/21-insercion-y-edicion-de-imagenes.md) | Inserción, panel de imagen, undo, arrastre, paridad web §10 |
| [`docs-mobile/22-notas-diseno-profesional.md`](../docs-mobile/22-notas-diseno-profesional.md) | Rediseño visual móvil y paridad del editor web |
| [`docs-mobile/16-editor-webview-teclado-seleccion.md`](../docs-mobile/16-editor-webview-teclado-seleccion.md) | Teclado, `imageEditMode`, swatch Auto |
| [`docs/planes-lectura.md`](./planes-lectura.md) | Planes de lectura (StudyHub / Perfil) |

---

*Última revisión: julio 2026 (paridad imágenes avanzadas y chip imageEditMode).*
