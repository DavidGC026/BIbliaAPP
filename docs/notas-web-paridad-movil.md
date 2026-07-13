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
| Cabecera del editor | Iconos + Publicar + tags | **Volver** + iconos **Compartir/Borrar** + pill **Guardar**; tarjeta con título, estado, métricas y toggle **Vista previa/Editar** |
| Diseño visual | Web con estructura distinta | Header, estantería, detalle de libreta y editor adaptados al lenguaje visual mobile |
| Shell móvil global | Header compacto genérico | Header 58px, tabbar 72px + safe-area, hoja «Más» y `100dvh` (ver [`web-mobile-paridad-global.md`](./web-mobile-paridad-global.md)) |

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
| `components/notebook-sidebar.tsx` | Editor móvil, preview en lista, modo `embedded` dentro de pestañas; header con Share2/Trash2, chip «Editando imagen» |
| `components/note-rich-editor.tsx` | Puente iframe/web para imágenes, versículos, referencias y diccionario; prop `onImageEditMode` |
| `components/ui/segment-tabs.tsx` | Pestañas Notas/Diario/Biblioteca con márgenes y radios mobile (`mx-4`, `rounded-2xl`) |
| `app/page.tsx` / `app/globals.css` | Shell móvil global (tabbar, safe-area, `100dvh`) — ver [`web-mobile-paridad-global.md`](./web-mobile-paridad-global.md) |
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

### Cabecera del editor (julio 2026)

Equivalente a `mobile/app/note/[noteId].tsx` (detalle en [`docs-mobile/22-notas-diseno-profesional.md`](../docs-mobile/22-notas-diseno-profesional.md) § Paridad web):

| Control | Web (`notebook-sidebar.tsx`) | Comportamiento |
|---------|------------------------------|----------------|
| **Volver** | `ArrowLeft` + texto | Cierra el editor **sin** guardar inmediato; espera el autoguardado (4 s) o pulsa **Guardar** |
| **Compartir** | `Share2` | `navigator.share` o copia título + texto plano al portapapeles |
| **Borrar** | `Trash2` | Misma confirmación que antes (`handleDeleteNote`) |
| **Guardar** | Pill `rounded-full` primario | Solicita HTML al iframe (`getHtml`) y persiste |
| Estado | Punto ámbar/verde + texto | `Guardando...` / `Sin guardar` / `Guardado hh:mm` / `Aún sin guardar` |
| **Vista previa / Editar** | `Eye` / `Edit2` + texto | Sin emojis; iconos Lucide como en móvil |
| **Editando imagen** | Chip con `ImageIcon` | Visible cuando el iframe emite `imageEditMode`; el título queda `disabled` |

`NoteRichEditor` reenvía `{ type: 'imageEditMode', active }` del iframe a la prop `onImageEditMode`. El estado se resetea al pulsar **Volver** o al cambiar de nota.

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

- El pill **Vista previa** (icono `Eye`) muestra el contenido renderizado con `NoteContent` (iframe en modo solo lectura).
- **Editar** (icono `Edit2`) vuelve al editor enriquecido.

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
- La web tiene autoguardado silencioso tras **4 s** sin escribir (`notebook-sidebar.tsx`); solicita el HTML actual del iframe antes del guardado manual.
- **Volver** no dispara guardado inmediato (a diferencia del `beforeRemove` móvil en [`docs-mobile/14-notas-autoguardado-y-preview.md`](../docs-mobile/14-notas-autoguardado-y-preview.md)): espera el debounce o pulsa **Guardar**.
- El shell móvil de toda la app (header, tabbar, safe-area) está documentado en [`web-mobile-paridad-global.md`](./web-mobile-paridad-global.md).

---

## Documentación relacionada

| Documento | Contenido |
|-----------|-----------|
| [`web-mobile-paridad-global.md`](./web-mobile-paridad-global.md) | Shell móvil global (`page.tsx`, `globals.css`, tabbar) |
| [`docs-mobile/22-notas-diseno-profesional.md`](../docs-mobile/22-notas-diseno-profesional.md) | Rediseño visual de notas + paridad del editor web |
| [`docs-mobile/23-paridad-web-mobile-global.md`](../docs-mobile/23-paridad-web-mobile-global.md) | Misma paridad global, vista desde el equipo móvil |
| [`docs-mobile/21-insercion-y-edicion-de-imagenes.md`](../docs-mobile/21-insercion-y-edicion-de-imagenes.md) | Imágenes en el iframe y chip «Editando imagen» |

---

*Última revisión: julio 2026 (paridad global + editor profesional).*
