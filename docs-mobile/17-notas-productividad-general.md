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
| Referencias | Nueva herramienta para insertar referencias cruzadas desde un versículo origen |
| Imágenes en notas | Inserción desde galería, edición (tamaño, alineación, orden) y persistencia local-first — ver [21-insercion-y-edicion-de-imagenes.md](./21-insercion-y-edicion-de-imagenes.md) |

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
| `mobile/app/note/[noteId].tsx` | Estado de guardado, palabras/minutos, vista previa y referencias cruzadas |
| `mobile/components/InsertVerseModal.tsx` | Filtro local y navegación entre capítulos |
| `mobile/components/InsertReferenceModal.tsx` | Inserción de referencias cruzadas en notas |
| `mobile/lib/notebookCovers.ts` | Helpers de texto, palabras y lectura |
| `mobile/lib/referenceInsert.ts` | Formato HTML de referencias insertadas |
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
11. En el editor, usa **Versículo** con filtro y **Referencias** para insertar contenido relacionado.
