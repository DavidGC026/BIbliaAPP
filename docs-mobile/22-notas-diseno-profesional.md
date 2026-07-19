# 22 — Notas: rediseño visual profesional

Mejora visual de la experiencia móvil de notas para que se sienta más limpia, seria y de uso diario, sin retirar funciones existentes.

---

## Objetivo

Convertir Notas en una superficie de trabajo más profesional:

- Menos ruido visual y menos decoración pesada.
- Jerarquía clara para libretas, portadas, métricas, búsqueda y acciones.
- Controles táctiles consistentes.
- Editor con apariencia de documento, estado de guardado visible y modo preview accesible.

---

## Cambios realizados

| Área | Mejora |
|------|--------|
| Tab Notas | Header compacto en tarjeta, icono con borde y estado de sincronización integrado. |
| Biblioteca de libretas | Se conserva la cuadrícula de 2 columnas con portadas/imágenes, refinando espaciado, métricas y acciones flotantes. |
| Métricas | Libretas, notas y palabras ahora aparecen como indicadores sobrios sobre fondo atenuado. |
| Detalle de libreta | Cabecera de libreta más compacta con actividad reciente, edición y borrado. |
| Tarjetas de nota | Título, fecha, lectura estimada, acciones y CTA de abrir quedan separados para lectura rápida. |
| Editor | Título, estado de guardado, conteo de palabras, minutos, vista previa y aviso de edición de imagen se agrupan en una sola cabecera de documento. |
| Acciones | Compartir, borrar, guardar, fijar, mover y exportar se conservan con iconos más discretos y áreas táctiles estables. |

---

## Funciones conservadas

- Búsqueda de libretas.
- Búsqueda dentro de notas por título y contenido HTML limpio.
- Orden por recientes, A-Z y notas largas.
- Fijar y desfijar notas.
- Mover notas entre libretas.
- Compartir como texto y exportar PDF.
- Borrar notas y libretas.
- Autoguardado y guardado manual.
- Vista previa.
- Inserción de versículos, diccionario, tablas, fuentes, colores e imágenes.
- Edición de imágenes con teclado bloqueado y toolbar oculta temporalmente.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `mobile/app/(tabs)/notes.tsx` | Header principal más limpio y consistente con el resto de la app. |
| `mobile/components/notes/NotebooksPanel.tsx` | Rediseño de biblioteca de libretas: panel de acción, métricas y tarjetas de 2 columnas con portada. |
| `mobile/app/notebook/[id].tsx` | Rediseño de cabecera de libreta y tarjetas de nota sin perder acciones. |
| `mobile/app/note/[noteId].tsx` | Cabecera de documento profesional con estado, métricas, preview y aviso de edición de imagen. |

---

## Paridad web: editor con el mismo diseño que el móvil (julio 2026)

La vista de edición de notas de la web (`components/notebook-sidebar.tsx`) se adaptó al diseño del editor móvil (`mobile/app/note/[noteId].tsx`):

- **Header de acciones**: iconos discretos de compartir (`Share2`, reutiliza `handleShareNote` con Web Share API/portapapeles) y borrar (`Trash2`), y botón **Guardar** como pill redondeado (`rounded-full`) con fondo primario, como en el móvil.
- **Cabecera de documento** (ya existente en tarjeta): título grande, punto de estado, texto `Guardando... / Sin guardar / Guardado hh:mm / Aún sin guardar`, contador `N palabras · M min` y pill de **Vista previa/Editar** ahora con icono (`Eye`/`Edit2`), igual que el toggle del móvil.
- **Chip "Editando imagen"**: el editor del iframe ya emitía `{ type: 'imageEditMode', active }` (port del doc 21 §10); `NoteRichEditor` lo expone con la prop `onImageEditMode` y la vista muestra el mismo aviso que el móvil y **bloquea el input del título** mientras el panel de imagen está activo (equivalente web de `editable={!imageEditMode}`).
- El estado se resetea al cambiar de nota y al pulsar Volver.
- **Móvil web (julio 2026):** cabecera más compacta, métricas de palabras/min ocultas en pantallas `< sm`, modo inmersivo al editar desde la sección Notas (header/tabbar ocultos) y altura del editor ligada a `visualViewport`. Ver [`docs/notas-web-paridad-movil.md`](../docs/notas-web-paridad-movil.md) § *Área de escritura en móvil web*.

Archivos: `components/note-rich-editor.tsx` (prop `onImageEditMode`), `components/notebook-sidebar.tsx` (header, chip, título, pill de preview).

---

## Pruebas recomendadas

```bash
cd mobile
npx tsc --noEmit
npm run android
```

1. Abre **Notas** y verifica que las pestañas `Notas`, `Diario` y `Biblioteca` sigan visibles.
2. En `Notas`, crea, edita y elimina una libreta.
3. Verifica que las libretas se muestran en cuadros de 2 columnas con sus portadas/imágenes.
4. Busca una libreta por nombre y confirma que la lista filtra correctamente.
5. Entra a una libreta y verifica búsqueda, orden por `Recientes`, `A-Z` y `Largas`.
6. Fija, mueve, comparte/exporta y borra una nota desde su tarjeta.
7. Abre una nota y confirma autoguardado, guardado manual, vista previa y conteo de palabras.
8. Inserta una imagen, tócala y confirma que el teclado se cierra, la toolbar se oculta y aparece el aviso `Editando imagen`.

---

## Refinamiento de Planes de lectura (julio 2026)

La sección **Notas → Planes** conserva toda su lógica de inscripción, avance, lectura y devocionales, pero adopta una jerarquía visual más clara:

- Cabecera propia con propósito de la sección y contador de planes activos.
- Separación explícita entre planes **En curso** y planes disponibles.
- Tarjeta activa con icono, duración, porcentaje destacado y progreso descrito como `N de M días`.
- La siguiente lectura se presenta como la acción principal, con botones diferenciados para leer, completar y escribir o consultar el devocional.
- El calendario completo usa un control más limpio para expandirse y contraerse.
- Los planes disponibles muestran duración y frecuencia junto al título, con una acción principal de ancho completo.
- Los planes ya inscritos se identifican mediante un estado visual compacto, en lugar de texto suelto.
- Los estados completados eliminan emojis tipográficos y usan símbolos nativos de Expo para mantener consistencia entre plataformas.

Archivo modificado: `mobile/components/ReadingPlansPanel.tsx`.
