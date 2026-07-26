# 18 — Bloques sin controles incrustados y pestañas contextuales

Corrección del comportamiento de las herramientas de los elementos insertados.
Julio 2026. Continúa
[`17-editor-pantalla-completa.md`](./17-editor-pantalla-completa.md).

---

## El principio

**El área del documento muestra exclusivamente el contenido final de la nota.**

Lo que se ve al editar debe parecerse lo máximo posible al PDF exportado. Ningún
bloque lleva barra de botones, encabezado, etiqueta de tipo ni controles al
pasar el cursor. Las acciones viven en la cinta superior, en una pestaña
contextual que aparece al seleccionar el elemento, como en Word.

Aplica a versículos, definiciones, tablas, imágenes, citas y a cualquier bloque
que se añada en el futuro.

## Qué se eliminó

La barra `.biblia-block-handle` que se dibujaba dentro de cada bloque
seleccionado, con `VERSÍCULO`, una vista previa del texto y los botones
`↑ ↓ Copiar Cortar Eliminar` (más `± Fila` y `± Columna` en las tablas).

Se retiró en tres capas, para que no reaparezca por ningún camino:

| Capa | Cambio |
|---|---|
| Construcción | `buildVerseBlockHtml`, `buildDictBlockHtml` y `buildTableBlockHtml` ya no la generan |
| Carga | `stripBlockHandles()` la borra al abrir la nota y antes de serializar |
| Estilo | `.biblia-block-handle` y `[data-block-action]` tienen `display: none` como cinturón de seguridad |

La tercera capa importa porque **web y móvil siguen añadiendo esa barra** cuando
abren la misma nota (`normalizeContentBlocks`). Al volver a desktop, el HTML
puede traerla; se descarta al cargar y no se vuelve a guardar.

### Efecto sobre las notas ya escritas

Ninguna pérdida de contenido: solo desaparece la interfaz que se había colado
dentro del campo `content`. Como `serializeNoteHtml` también limpia, la nota se
guarda más ligera la primera vez que se abre y se edita.

## Selección limpia

Al seleccionar un bloque solo se ve un **contorno dorado fino**. El borde de 2 px
está reservado como transparente desde el principio, así que activar la
selección **no desplaza el contenido ni aumenta su altura**. Al pulsar fuera, el
contorno desaparece y la pestaña contextual se cierra.

## Pestañas contextuales

Definidas en `components/notes/ribbon/contextualTabs.tsx`. Aparecen solas, se
activan solas y desaparecen al deseleccionar. **Inicio e Insertar permanecen
siempre visibles.**

| Selección | Pestaña | Grupos |
|---|---|---|
| Imagen | `Formato de imagen` | Tamaño (25/50/75/100 %), Posición, Ajuste (detrás del texto), Orden, Imagen |
| Versículo | `Formato de versículo` | Orden, Portapapeles, Bloque |
| Definición | `Formato de definición` | Orden, Portapapeles, Bloque |
| Tabla | `Diseño de tabla` | Filas, Columnas, Orden, Portapapeles, Bloque |

Todos los botones usan `onMouseDown` con `preventDefault`, así que abrir o usar
la pestaña **no roba el foco ni deshace la selección**. Abrirla tampoco modifica
el contenido.

### Cómo se comunica la selección

`initNoteEditorBlocks` pasó de devolver una función de limpieza a devolver un
**controlador**:

```ts
export type NoteBlockController = {
  move(direction: "up" | "down"): void;
  copy(): void;
  cut(): void;
  remove(): void;
  changeTable(action: TableAction): void;
  clear(): void;
  destroy(): void;
};
```

El editor avisa de la selección con `{ element, kind }`, donde `kind` es
`verse | dict | table | image`, y la cinta decide qué pestaña construir. El
documento no conoce la cinta y la cinta no conoce el DOM del documento: se
comunican por este contrato.

## Aclaración sobre el carrusel

Se corrigió la interpretación anterior. **Dos tarjetas es lo que se ve a la vez,
no el máximo de herramientas por categoría.** El panel muestra dos, sube a tres
o cuatro si hay ancho, y las flechas recorren el resto.

El panel de pestañas especiales quedó reservado a **insertar** contenido nuevo:

| Pestaña | Opciones |
|---|---|
| Fondos | Modo fondos · Imagen de fondo |
| Versículos | Insertar versículo · Cita destacada |
| Diccionario | Entrada Strong |
| Imagen | Subir imagen · Insertar tabla |

Las acciones *sobre* un elemento ya insertado se movieron a su pestaña
contextual, que es donde corresponden.

## Verificación

```bash
npm run check      # 12 casos
npx tsc --noEmit
npm run build
```

La segunda parte del banco de pruebas cambió de intención: antes afirmaba que la
barra **se reconstruía**; ahora comprueba que el envoltorio se rehace y que
**ninguna interfaz** (`.biblia-block-handle`, `[data-block-action]`,
`.biblia-block-btn`) aparece dentro del contenido. Se añadió un caso que abre una
nota antigua con la barra guardada y verifica que se descarta.

Pendiente de comprobación visual en WebKitGTK: seleccionar un versículo y ver
solo el contorno, que aparezca `Formato de versículo`, que al pulsar fuera se
cierre, y lo mismo con tabla, definición e imagen.
