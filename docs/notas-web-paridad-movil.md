# Notas web — paridad con diseño móvil

Documentación de los cambios (junio 2026) que alinean la sección **Notas** de la web con la app Android.

---

## Resumen

La pestaña **Notas** del menú web ahora replica la estructura y el editor de la app móvil:

| Área | Antes (web) | Ahora (web, como móvil) |
|------|-------------|-------------------------|
| Navegación | Solo libretas | Pestañas **Libretas · Diario · Libros** |
| Editor | Textarea plano + barra de tags/adjuntos | Editor enriquecido WYSIWYG (mismo HTML que Android) |
| Vista previa | No existía | Toggle **Vista Previa / Modo Edición** |
| Lista de notas | Resumen con regex markdown | `stripNotePreview()` — soporta HTML y markdown |
| Cabecera del editor | Iconos + Publicar + tags | **Volver · Borrar · Guardar** (estilo móvil) |

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
| `lib/app-section-registry/sections.client.tsx` | La sección `notebook` renderiza `NotesSection` |
| `lib/app-section-registry/outlet.tsx` | Layout `notebook` sin padding extra (pantalla completa) |

---

## Cómo funciona el editor enriquecido

1. `NoteRichEditor` monta un `<iframe>` con `srcDoc` generado por `getEditorHtml()`.
2. El iframe incluye la barra de formato **dentro** del HTML (negrita, tamaños, colores, listas, tablas).
3. Comunicación iframe ↔ React vía `postMessage` (mismo protocolo que el WebView de Android).
4. Botones **Insertar versículo** y **Insertar del diccionario** envían eventos al padre; la web abre el modal de versículos existente en `notebook-sidebar.tsx`.
5. Al guardar, se solicita el HTML actual con `{ type: 'getHtml' }` antes del `PUT` a la API.

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

### Imágenes en notas (julio 2026)

| Cliente | Insertar imagen | Ver imagen guardada |
|---------|-----------------|---------------------|
| Android | Sí — galería, subida a `/api/upload` o base64 offline | Sí |
| Web | No — el editor iframe aún no expone el botón 🖼️ | Sí — el HTML con `<img>` se renderiza en vista previa y lista |

Flujo móvil documentado en [`docs-mobile/21-insercion-y-edicion-de-imagenes.md`](../docs-mobile/21-insercion-y-edicion-de-imagenes.md).

**Persistencia y tamaño del contenido:**

- Las notas de libreta guardan HTML completo en `bible_notebook_notes.content`.
- Una imagen offline va embebida como `data:image/...;base64,...` y puede superar el límite de `TEXT` (~64 KB en MariaDB).
- `ensureDbTables()` en `lib/bible.ts` crea la columna como `MEDIUMTEXT` (hasta ~16 MB) y ejecuta en arranque:

  ```sql
  ALTER TABLE bible_notebook_notes MODIFY content MEDIUMTEXT NOT NULL
  ```

  El `ALTER` va en un `try/catch` idempotente: en despliegues existentes se aplica al reiniciar la app; en instalaciones nuevas ya nace con `MEDIUMTEXT`.

- En Android, `repoCreateNotebookNote()` y `repoUpdateNotebookNote()` son **local-first**: escriben primero el HTML exacto del editor en SQLite y luego sincronizan. Evita perder `<img>` si la respuesta remota difiere del HTML local (ver doc 21, §7).

**Recomendación operativa:** preferir URLs de `/api/upload` cuando hay red; reservar base64 para offline. Tras desplegar el cambio de esquema, reinicia `biblia2-app` para que `ensureDbTables()` ejecute la migración.

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
4. Usa formato (negrita, color, listas) y **Insertar versículo**.
5. Activa **Vista Previa** y verifica que el contenido se ve bien.
6. Guarda y vuelve a la lista: el resumen debe ser texto legible, no HTML crudo.

---

## Notas técnicas

- El lector bíblico (`components/bible-reader`) sigue usando `NotebookSidebar` directamente en el panel lateral, sin pestañas.
- La publicación de notas al feed de comunidad se retiró del editor web para igualar la UX móvil (solo Guardar / Borrar).
- Auto-guardado al salir del editor **no** está en web; solo en Android (`docs-mobile/14-notas-autoguardado-y-preview.md`).

---

*Última revisión: julio 2026.*
