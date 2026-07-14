# 17 — Notas como herramienta de productividad general

Mejoras en la sección de notas móvil (julio 2026) para que funcione como un espacio de apuntes profesional, no limitado al uso bíblico.

---

## Objetivo

La pestaña **Notas** ahora comunica y organiza mejor casos de uso generales:

- Ideas rápidas.
- Reuniones y clases.
- Investigación.
- Lectura y biblioteca personal.
- Estudio bíblico cuando aplique.

---

## Cambios principales

| Área | Mejora |
|------|--------|
| Entrada de Notas | Texto más general y tabs `Notas`, `Diario`, `Biblioteca` |
| Lista de libretas | Búsqueda por nombre, métricas de libretas/notas/palabras y orden por última actividad |
| Tarjetas de libreta | Muestran cantidad de notas y fecha de última actualización |
| Detalle de libreta | Búsqueda dentro de contenido HTML limpio, orden por recientes/A-Z/largas y resumen de notas/palabras/última actividad |
| Tarjetas de nota | Preview sin HTML, tags existentes y estimación de lectura |
| Editor | Estado de guardado visible, conteo de palabras, lectura estimada y control de vista previa sin emojis |
| Inicio | Acción **Nota rápida** que abre una nota nueva en la primera libreta o crea `Notas rápidas` |
| Organización | Notas fijadas arriba, mover a otra libreta y compartir como texto |
| Inserción bíblica | Modal de versículos con filtro por texto y navegación de capítulo |

---

## Utilidades compartidas

`mobile/lib/notebookCovers.ts` centraliza ahora:

- `noteHtmlToPlainText()`
- `stripNotePreview()`
- `countNoteWords()`
- `estimateNoteReadMinutes()`
- `isNotePinned()`
- `togglePinnedNoteTag()`

Estas funciones evitan repetir conversiones de HTML a texto en listas, búsqueda y métricas.

---

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `mobile/app/(tabs)/notes.tsx` | Header y etiquetas orientadas a notas generales |
| `mobile/app/(tabs)/index.tsx` | Acción rápida para crear nota |
| `mobile/components/notes/NotebooksPanel.tsx` | Búsqueda, métricas y tarjetas de libretas mejoradas |
| `mobile/app/notebook/[id].tsx` | Orden, búsqueda, resumen, lectura estimada, fijar, mover y compartir |
| `mobile/app/note/[noteId].tsx` | Estado de guardado, palabras/minutos y vista previa |
| `mobile/components/InsertVerseModal.tsx` | Filtro local y navegación entre capítulos |
| `mobile/lib/notebookCovers.ts` | Helpers de texto, palabras y lectura |
| `mobile/lib/repo.ts` / `mobile/lib/api.ts` / `mobile/lib/offline/notesStore.ts` | Movimiento de notas entre libretas |
| `app/api/notebooks/notes/[noteId]/route.ts` / `lib/bible.ts` | Soporte backend para mover notas online |

---

## Cómo probar

```bash
cd mobile
npm run android
```

1. Abre **Notas** y verifica que el header y tabs se lean como una herramienta general.
2. Crea varias libretas; busca por nombre y revisa que las métricas cambien.
3. Entra a una libreta con notas, busca texto que esté dentro del contenido enriquecido.
4. Cambia el orden entre **Recientes**, **A-Z** y **Largas**.
5. Edita una nota y confirma que el estado de guardado, palabras y minutos se actualicen.
6. Activa **Vista previa** y vuelve a **Editar** sin perder contenido.
7. Desde Inicio, toca **Nota rápida**; debe abrir el editor en una libreta existente o crear `Notas rápidas`.
8. En una libreta, fija una nota y verifica que suba al inicio.
9. Mueve una nota a otra libreta y confirma que desaparezca de la libreta actual.
10. Comparte una nota y comprueba que el sistema abra la hoja de compartir con título y texto.
11. En el editor, usa **Versículo** con filtro y confirma que ya no aparece la acción **Referencias**.

## Retiro de referencias en el editor (julio 2026)

La acción para insertar referencias cruzadas se eliminó de la toolbar de notas en web y mobile junto con su modal, estado y formateador. Esta decisión simplifica el editor y no elimina la sección de referencias del lector bíblico ni modifica bloques de referencias que ya estuvieran guardados dentro de notas antiguas.

### Qué se retiró

| Capa | Archivo | Cambio |
|------|---------|--------|
| Toolbar del iframe | `lib/note-editor-html.ts` | Botón `insertReferences` y evento `openReferenceModal` |
| Puente React ↔ iframe | `components/note-rich-editor.tsx` | Prop `onInsertReferences` y listener `openReferenceModal` |
| Host web | `components/notebook-sidebar.tsx` | Modal de inserción, estado SWR a `/api/references`, `formatReferenceInsertion()` |
| Mobile (paridad) | `mobile/lib/editorHtml.ts`, `mobile/app/note/[noteId].tsx` | Misma toolbar y modal equivalentes |

### Qué sigue disponible

- **Leer → Referencias** (`components/references-explorer.tsx`) y el mapa de arcos (`components/references-rainbow-map.tsx`) siguen consultando `/api/references`.
- El lector bíblico mantiene la acción contextual de referencias sobre un versículo seleccionado.
- Las notas antiguas conservan bloques `<blockquote>` con referencias ya insertadas; no se migran ni borran.
