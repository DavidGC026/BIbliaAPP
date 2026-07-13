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
| `components/note-rich-editor.tsx` | Puente iframe/web para imágenes, versículos, referencias, diccionario y selector de fuentes |
| `lib/note-editor-html.ts` | Plantilla HTML del editor; Google Fonts, `setFont`, imágenes |
| `next.config.mjs` | CSP ampliada para `fonts.googleapis.com` / `fonts.gstatic.com` |
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

### Selector de fuente

El botón **Tt** de la toolbar del iframe abre un modal React (no vive dentro del iframe, igual que versículos o referencias). Flujo:

```text
iframe toolbar (Tt)
  → postMessage { type: 'openFontModal' }
  → NoteRichEditor abre modal "Fuente de la nota"
  → usuario elige fuente
  → sendAction({ type: 'setFont', value: '<id>' })
  → handleAction en lib/note-editor-html.ts
       · con selección: wrapRangeStyle('fontFamily', …)
       · sin selección: applyFontToWholeEditor() envuelve el HTML en un <div style="font-family:…">
  → notifyChange() → onChange → autoguardado / Guardar
```

| Archivo | Rol |
|---------|-----|
| `components/note-rich-editor.tsx` | `NOTE_FONT_OPTIONS`, estado del modal, `sendAction({ type: 'setFont' })` |
| `lib/note-editor-html.ts` | `fontFamilyForValue()`, `applyFontToWholeEditor()`, handler `setFont` |
| `next.config.mjs` | CSP: `style-src … fonts.googleapis.com`, `font-src … fonts.gstatic.com` |

#### Fuentes disponibles (web)

| ID (`setFont.value`) | Nombre en UI | Categoría | `font-family` aplicada |
|----------------------|--------------|-----------|-------------------------|
| `Default` | Predeterminada | Sistema | `system-ui, sans-serif` |
| `serif` | Serif | Sistema | `serif` |
| `monospace` | Monospace | Sistema | `monospace` |
| `Lora` | Lora | Serif | `Lora, Georgia, serif` |
| `PlayfairDisplay` | Playfair Display | Serif | `'Playfair Display', serif` |
| `Merriweather` | Merriweather | Serif | `Merriweather, Georgia, serif` |
| `Inter` | Inter | Sans-serif | `Inter, system-ui, sans-serif` |
| `Montserrat` | Montserrat | Sans-serif | `Montserrat, system-ui, sans-serif` |
| `Roboto` | Roboto | Sans-serif | `Roboto, system-ui, sans-serif` |
| `Outfit` | Outfit | Sans-serif | `Outfit, system-ui, sans-serif` |
| `Poppins` | Poppins | Sans-serif | `Poppins, system-ui, sans-serif` |
| `Oswald` | Oswald | Sans-serif | `Oswald, system-ui, sans-serif` |
| `FiraCode` | Fira Code | Monospace | `'Fira Code', monospace` |
| `JetBrainsMono` | JetBrains Mono | Monospace | `'JetBrains Mono', monospace` |

Los IDs coinciden con las fuentes populares del móvil (`FontSelectorModal` / `POPULAR_FONTS`). En web **no** hay búsqueda de Google Fonts ni descarga offline: las tipografías web se cargan con un `<link>` a Google Fonts dentro del `srcDoc` del iframe.

#### Comportamiento al aplicar

- **Texto seleccionado:** la fuente se aplica solo al rango con `wrapRangeStyle('fontFamily', …)` (spans inline en el HTML guardado).
- **Sin selección:** `applyFontToWholeEditor()` envuelve todo el contenido en un `<div style="font-family:…">`. Ese estilo **viaja en el HTML** al servidor y se ve al reabrir la nota o en otro dispositivo que lea el HTML.
- **Vista previa:** `NoteContent` renderiza el HTML tal cual; los spans y el wrapper conservan la tipografía sin estado extra en React.

#### Paridad con móvil (diferencias importantes)

| Aspecto | Móvil | Web |
|---------|-------|-----|
| Modal de fuentes | `FontSelectorModal` nativo + búsqueda Google Fonts | Modal React con lista fija (`NOTE_FONT_OPTIONS`) |
| Carga de tipografías | Base64 embebido vía `base64Fonts` + `@font-face` | `<link>` a `fonts.googleapis.com` en el iframe |
| Fuente de **toda** la nota | Preferencia en `SecureStore` (`NOTE_FONT_<id>`), no en HTML | Wrapper `<div>` persistido en el HTML |
| Fuente sobre selección | `<font face>` / spans en HTML | Spans con `font-family` inline |
| Sincronización cuenta | Fuente global móvil **no** sube al servidor | Fuente global web **sí** queda en `content` de MySQL |

Si una nota se editó solo en móvil con fuente global (sin selección), la web puede mostrarla con la fuente por defecto hasta que el HTML incluya spans o el usuario reaplique la fuente en web. Detalle móvil: `docs-mobile/20-plan-maestro-mejoras-generales.md` (iteración «Fuentes por nota»).

#### CSP y despliegue

El iframe carga hojas y fuentes desde Google. Tras el cambio en `next.config.mjs`, la política debe incluir:

```text
style-src … https://fonts.googleapis.com
font-src  … https://fonts.gstatic.com
```

Sin esas entradas el modal funciona pero las tipografías caen a fuentes del sistema. Tras tocar `next.config.mjs`, reinicia el contenedor (`docker restart biblia2-app`) y recarga con **Ctrl+Shift+R**.

#### Problemas frecuentes (fuentes)

| Síntoma | Causa probable | Qué hacer |
|---------|----------------|-----------|
| Modal **Tt** no abre | Error de JS en el iframe (toolbar entera caída) | Revisar consola del iframe; ver regresión `.join('\\n')` en doc móvil 21 |
| Fuentes se ven «genéricas» | CSP bloquea Google Fonts | Verificar headers en `next.config.mjs` y recargar sin caché |
| Fuente no aparece en móvil tras guardar en web | Móvil espera SecureStore para fuente global | El HTML con wrapper/spans sí debería verse; fuente solo-SecureStore en móvil no baja a web |
| Cambio de fuente no persiste | Saliste con **Volver** antes del autoguardado (~4 s) | Esperar autoguardado o pulsar **Guardar** (igual que el resto del editor) |

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
- La web ahora tiene autoguardado silencioso tras unos segundos sin escribir y solicita el HTML actual del iframe antes del guardado manual.

---

*Última revisión: julio 2026.*
