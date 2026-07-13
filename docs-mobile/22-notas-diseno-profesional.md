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

## Portadas de libretas

El rediseño **conserva** la biblioteca tipo estantería (cuadrícula con portadas visibles). Solo se refinan espaciado, métricas y acciones flotantes; no se sustituye por filas sin imagen.

### Modelo de datos

Cada libreta guarda `coverImage` en SQLite local y en el servidor (`bible_notebooks.cover_image` vía `/api/notebooks`). El valor puede ser:

| Tipo | Formato | Ejemplo |
|------|---------|---------|
| Preset | ID que empieza con `grad-` | `grad-purple`, `grad-ocean` |
| Imagen personalizada | URL absoluta o ruta `/api/media/...` | Subida local, Unsplash o URL pegada |

`resolveCoverForSave(presetId, customUrl)` en `mobile/lib/notebookCovers.ts` prioriza la URL personalizada si existe; si no, guarda el preset elegido.

### Seis presets incluidos

`NOTEBOOK_PRESET_COVERS` define gradientes con etiquetas en español: Púrpura Imperial, Cielo Nocturno, Océano Profundo, Bosque Místico, Escritura Antigua y Gracia Divina. Mismos IDs que la web y el escritorio (`grad-purple` … `grad-rose`).

### Crear o editar portada

`NotebookConfigModal` centraliza el flujo:

1. **Preset** — cuadrícula de muestras con vista previa en `BookCover`.
2. **Unsplash** — búsqueda con orientación vertical; las URLs pasan por el proxy de imágenes cuando hace falta.
3. **Galería** — `expo-image-picker` + `api.uploadImage` guarda en `/api/media/...`.
4. **URL manual** — campo de texto para pegar un enlace externo.

Al guardar, `repoCreateNotebook` / `repoUpdateNotebook` persisten nombre y `coverImage`; la sincronización sube el cambio al reconectar.

### Renderizado (`BookCover`)

`mobile/components/BookCover.tsx` dibuja la portada como libro:

- **Preset** — `LinearGradient` con los tres colores del preset.
- **URL custom** — `Image` o `AuthedImage` (si la ruta requiere Bearer, p. ej. `/api/media/...`).
- **Unsplash** — `api.getImageProxyUrl` para evitar bloqueos en WebView/Android.

El título de la libreta se superpone en mayúsculas sobre la portada (mismo componente en la cuadrícula y en el modal de configuración).

### Cuadrícula de biblioteca

`NotebooksPanel` usa `FlatList` con `numColumns={2}` y tarjetas al `48%` de ancho. Cada tarjeta muestra:

- Portada (`BookCover`, 112×152).
- Nombre, recuento de notas, fecha de última actividad y palabras totales.
- Acciones flotantes (editar / eliminar) en la esquina superior derecha, sin tapar la portada.

La búsqueda por nombre y las métricas globales (libretas / notas / palabras) viven en el `ListHeaderComponent`, encima de la cuadrícula.

### Paridad web

La web usa el mismo campo `coverImage` y presets (`components/notebook-sidebar.tsx`, `lib/notebook-covers.ts`). La cuadrícula web es responsiva (2–5 columnas según ancho); móvil fija 2 columnas en teléfono. Ver [notas-web-paridad-movil.md](../docs/notas-web-paridad-movil.md#portadas-de-libretas).

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
- Inserción de versículos, referencias, diccionario, tablas, fuentes, colores e imágenes.
- Edición de imágenes con teclado bloqueado y toolbar oculta temporalmente.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `mobile/app/(tabs)/notes.tsx` | Header principal más limpio y consistente con el resto de la app. |
| `mobile/components/notes/NotebooksPanel.tsx` | Rediseño de biblioteca de libretas: panel de acción, métricas y tarjetas de 2 columnas con portada. |
| `mobile/components/BookCover.tsx` | Render de portada (gradiente, imagen remota o media autenticada). |
| `mobile/components/NotebookConfigModal.tsx` | Crear/editar libreta: presets, Unsplash, galería y URL manual. |
| `mobile/lib/notebookCovers.ts` | Presets, `resolveCoverForSave` y utilidades de texto/métricas. |
| `mobile/app/notebook/[id].tsx` | Rediseño de cabecera de libreta y tarjetas de nota sin perder acciones. |
| `mobile/app/note/[noteId].tsx` | Cabecera de documento profesional con estado, métricas, preview y aviso de edición de imagen. |

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
9. Crea una libreta con preset, otra con foto de Unsplash o galería; confirma que la portada se ve en la cuadrícula y persiste al reabrir.
10. Edita el nombre o portada de una libreta existente y verifica que la tarjeta se actualiza sin perder las notas.

---

## Documentos relacionados

| Documento | Relación |
|-----------|----------|
| [17-notas-productividad-general.md](./17-notas-productividad-general.md) | Búsqueda, métricas, orden y acciones de libretas/notas (base funcional). |
| [21-insercion-y-edicion-de-imagenes.md](./21-insercion-y-edicion-de-imagenes.md) | Imágenes **dentro** del editor de nota (distinto de portadas de libreta). |
| [14-notas-autoguardado-y-preview.md](./14-notas-autoguardado-y-preview.md) | Autoguardado, preview y fallback `getHtml` del editor. |
| [16-editor-webview-teclado-seleccion.md](./16-editor-webview-teclado-seleccion.md) | Teclado y selección en el WebView del editor. |
| [notas-web-paridad-movil.md](../docs/notas-web-paridad-movil.md) | Paridad web de notas, editor y portadas de libretas. |
