# Notas web — paridad con diseño móvil

Documentación de los cambios (junio 2026) que alinean la sección **Notas** de la web con la app Android.

---

## Resumen

La pestaña **Notas** del menú web ahora replica la estructura y el editor de la app móvil:

| Área | Antes (web) | Ahora (web, como móvil) |
|------|-------------|-------------------------|
| Navegación | Dos filas de tabs parcialmente duplicadas | Una fila: **Notas · Diario · Biblioteca · Planes · Oración** |
| Editor | Textarea plano + barra de tags/adjuntos | Editor enriquecido WYSIWYG (mismo HTML base que Android) |
| Fuentes | Botón sin modal funcional | Selector de fuente conectado al iframe, con fuentes de sistema y populares |
| Imágenes | Sin inserción desde editor | Subida a `/api/upload`, inserción pública, modo Normal/Fondo y edición visual dentro del editor |
| Color automático | `inherit` podía conservar el color explícito del padre | Marcador semántico `.note-color-auto`, resuelto con el tema vigente |
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
| `components/ui/segment-tabs.tsx` | UI desplazable de pestañas segmentadas compartida por los hubs web |
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
| `lib/app-section-registry/nav.client.tsx` | Oculta destinos hijos agrupados, incluida `library`, sin eliminarlos del catálogo ni de permisos |
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
- Las pestañas usan los nombres móviles: **Notas**, **Diario**, **Biblioteca** y **Planes**; **Oración** se conserva como capacidad adicional de web.
- La biblioteca de libretas usa panel de acción, métricas, búsqueda y cards en cuadrícula con portada e indicadores.
- El detalle de libreta usa cabecera compacta con portada, conteo de notas/palabras, acciones y búsqueda.
- El editor agrupa título, estado de guardado, palabras, minutos y vista previa dentro de una cabecera de documento.

### Selector de fuente

- El botón **Tt** abre un modal web equivalente al selector móvil.
- Incluye fuentes de sistema y las populares que usa mobile.
- Si hay texto seleccionado, aplica la fuente solo a esa selección.
- Si no hay selección, aplica la fuente al contenido completo y la deja persistida dentro del HTML guardado.

### Inserción y edición de imágenes

- El botón etiquetado **Insertar imagen** y el icono 🖼️ de la toolbar abren el selector nativo de archivos desde React.
- La imagen se sube a `/api/upload` con `purpose=other`.
- Si el backend devuelve `filename`, la web inserta una URL absoluta `/uploads/{filename}` para que la imagen sobreviva al salir y volver a abrir la nota.
- `/uploads/[filename]` es una ruta dinámica de Next (`app/uploads/[filename]/route.ts`): lee el archivo en cada petición. Esto es necesario porque el servidor de producción solo indexa como estáticos los archivos presentes durante `next build`; las imágenes agregadas después del arranque devolvían 404 aunque existieran en disco.
- Cada imagen es un bloque atómico (`contenteditable="false"`, `draggable="false"`), incluso al cargar notas antiguas, para evitar que el cursor rompa el HTML o active una edición accidental.
- El panel permite redimensionar, alinear, subir/bajar con animación y borrar.
- El slider conserva su evento nativo de `mousedown`: el panel evita el foco del editor en el resto de controles, pero no aplica `preventDefault()` sobre `input[type="range"]`, porque eso bloqueaba el arrastre con mouse en escritorio.
- El selector **Normal / Fondo** convierte una imagen en fondo absoluto detrás del texto. El botón **Fondos 🖼️** activa temporalmente su selección y permite arrastrarla con mouse, touch o lápiz; el hit-test geométrico sigue encontrándola aunque haya texto encima.
- Las posiciones, tamaños, modos y alineaciones se notifican al host sin debounce, por lo que se conservan al guardar y son compatibles con las notas creadas en mobile.

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

### Color automático según el tema

El swatch **A** no guarda negro o blanco como valor fijo. Al aplicarlo:

1. `clearColor()` envuelve la selección o el punto de escritura en `<span class="note-color-auto">`.
2. Se eliminan `style.color` y atributos `<font color>` que estén dentro del tramo seleccionado.
3. `#editor .note-color-auto` resuelve el texto con el token `colors.text` del tema actual y usa `!important` para superar un color explícito heredado de un ancestro.
4. Al abrir nuevamente la nota, el iframe se genera con los tokens del tema vigente; por eso el mismo HTML aparece oscuro en tema claro y claro en tema oscuro.

No se usa `color: inherit`: si la selección estaba dentro de un `span` rojo, heredar significaba conservar precisamente ese rojo. La clase semántica evita ese caso y mantiene el contenido adaptable.

Implementación: `lib/note-editor-html.ts`. Paridad móvil: `mobile/lib/editorHtml.ts`.

---

## Pestañas de la sección Notas

Equivalente a `mobile/app/(tabs)/notes.tsx`:

```text
Notas
├── Notas       → NotebookSidebar (embedded)
├── Diario      → Devotionals
├── Biblioteca  → PersonalLibrary
├── Planes      → ReadingPlans
└── Oración     → PrayerRequests
```

Antes, `NotesHub` añadía una fila `Notas / Devocional / Oración` encima de la fila interna `Notas / Diario / Biblioteca`. Ahora `NotesSection` es el único dueño de la navegación y filtra cada destino mediante `allowedSections`.

Las secciones hijas siguen registradas en `APP_SECTION_CATALOG` para permisos, compatibilidad y enlaces existentes, pero no se duplican en el menú principal. Al seleccionar una lectura desde **Planes**, `handleSelectVerse` cambia a la sección **Leer** y posiciona el lector en el pasaje.

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
2. Comprueba la fila única: Notas, Diario, Biblioteca, Planes y Oración (según permisos).
3. Abre una libreta → crea o edita una nota.
4. Usa formato (negrita, color, listas), cambia fuente y usa **Insertar versículo**.
5. Inserta una imagen desde el botón etiquetado, redimensiónala y alinéala; prueba Subir/Bajar y verifica su animación.
6. Cámbiala a **Fondo**, cierra el panel, activa **Fondos 🖼️** y arrástrala aun cuando tenga texto encima.
7. Guarda, sal y vuelve a abrir la nota; verifica tamaño, alineación, modo y posición.
   Comprueba también que `GET /uploads/{filename}` responde 200 después de reiniciar el contenedor.
8. Inserta referencias cruzadas y una entrada del diccionario.
9. Activa **Vista previa** y verifica que el contenido se ve bien.
10. Guarda y vuelve a la lista: el resumen debe ser texto legible, no HTML crudo.
11. Aplica un color a un texto, selecciónalo y pulsa **A**; debe recuperar el color normal del tema y adaptarse al alternar claro/oscuro.

---

## Notas técnicas

- El lector bíblico (`components/bible-reader`) sigue usando `NotebookSidebar` directamente en el panel lateral, sin pestañas.
- La publicación de notas al feed de comunidad se retiró del editor web para igualar la UX móvil (solo Guardar / Borrar).
- La web ahora tiene autoguardado silencioso tras unos segundos sin escribir y solicita el HTML actual del iframe antes del guardado manual.

## Regla de documentación para cambios web

Todo cambio que afecte código web debe actualizar o crear documentación dentro de `docs/`. Si también modifica comportamiento compartido con mobile, se actualiza además el documento correspondiente en `docs-mobile/`, manteniendo referencias cruzadas entre ambas implementaciones.

---

*Última revisión: julio 2026.*
