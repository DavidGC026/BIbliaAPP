# 22 — Notas: rediseño visual profesional

Mejora visual de la experiencia móvil de notas para que se sienta más limpia, seria y de uso diario, sin retirar funciones existentes.

---

## Objetivo

Convertir Notas en una superficie de trabajo más profesional:

- Menos ruido visual y menos decoración pesada.
- Jerarquía clara para libretas, métricas, búsqueda y acciones.
- Controles táctiles consistentes.
- Editor con apariencia de documento, estado de guardado visible y modo preview accesible.

---

## Cambios realizados

| Área | Mejora |
|------|--------|
| Tab Notas | Header compacto en tarjeta, icono con borde y estado de sincronización integrado. |
| Biblioteca de libretas | Se reemplazó la cuadrícula tipo estantería por filas profesionales con icono, métricas y acciones visibles. |
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
- Inserción de versículos, referencias, diccionario, tablas, fuentes, colores e imágenes.
- Edición de imágenes con teclado bloqueado y toolbar oculta temporalmente.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `mobile/app/(tabs)/notes.tsx` | Header principal más limpio y consistente con el resto de la app. |
| `mobile/components/notes/NotebooksPanel.tsx` | Rediseño de biblioteca de libretas: panel de acción, métricas y filas compactas. |
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
3. Busca una libreta por nombre y confirma que la lista filtra correctamente.
4. Entra a una libreta y verifica búsqueda, orden por `Recientes`, `A-Z` y `Largas`.
5. Fija, mueve, comparte/exporta y borra una nota desde su tarjeta.
6. Abre una nota y confirma autoguardado, guardado manual, vista previa y conteo de palabras.
7. Inserta una imagen, tócala y confirma que el teclado se cierra, la toolbar se oculta y aparece el aviso `Editando imagen`.

---

## Relacionado

- [17 — Notas como herramienta de productividad](./17-notas-productividad-general.md) — funcionalidad de productividad (búsqueda, métricas, orden, fijar, mover) sobre la que este doc aplica el rediseño visual.
- [21 — Inserción y edición de imágenes](./21-insercion-y-edicion-de-imagenes.md) — flujo de imágenes y aviso **Editando imagen** en la cabecera del editor.
- [20 — Plan maestro](./20-plan-maestro-mejoras-generales.md) — iteración «Notas: rediseño visual profesional».
