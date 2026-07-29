# Editor de notas Tiptap en web

Fecha: 28 de julio de 2026

La web dejó de editar notas con `contentEditable` + `execCommand` y usa Tiptap
3, igual que mobile y el editor nuevo de desktop. La vista previa permanece
aislada y ligera: sigue renderizando el HTML guardado sin cargar Tiptap. El
componente del editor se importa de forma dinámica, por lo que ProseMirror solo
se descarga al entrar a editar una nota.

## Contrato compatible

`NotebookNote.content` continúa guardando **HTML**. No hay migración de base de
datos ni cambios en las APIs. El esquema reconoce y conserva:

- `blockquote.biblia-verse-quote` como `verseBlock` atómico;
- `aside.biblia-dict-entry` como `dictionaryBlock` atómico;
- `div.note-image-block` como `imageBlock` atómico y arrastrable;
- tablas editables y redimensionables de Tiptap;
- formato de texto, encabezados, listas, citas, alineación, fuente, tamaño y
  color.

Las barras `.biblia-block-handle` guardadas por el editor web anterior se
descartan al entrar al esquema. Son interfaz, no contenido, y ya no vuelven a
serializarse. Así Delete/Backspace no puede dejar medio versículo o media
definición dentro de la nota.

## Estructura y SOLID

```text
lib/tiptap/
├── extensions.ts                 composición del esquema
└── nodes/                        un tipo de contenido por archivo

components/notes/editor-shell/
├── note-editor-header.tsx        cabecera compacta compartida
└── use-immersive-viewport.ts     viewport visible del móvil como vars CSS

components/notes/tiptap/
├── tiptap-note-editor.tsx        monta editor y cinta
├── note-editor-ribbon.tsx        selección de pestaña y render declarativo
├── note-special-tools.tsx        inserciones rápidas exclusivas de escritorio
├── ribbon-types.ts               contratos pequeños de pestañas y acciones
├── editor-commands.ts            operaciones de bloques
├── image-commands.ts             atributos transaccionales de imagen
├── tabs/                         una responsabilidad por pestaña
├── table-insert-dialog.tsx       creación de tablas
├── font-picker-dialog.tsx        elección de tipografía
└── use-note-image-upload.ts      detalle HTTP de subida
```

- El editor depende de `buildNoteExtensions()`, no de cada nodo.
- La cinta depende del registro `tabs/ribbon-tabs.ts`, no de pestañas
  concretas. Añadir una pestaña no modifica su render.
- `NoteRichEditor` es un adaptador: conserva el contrato de guardado e
  inserciones de `notebook-sidebar`, pero la UI del documento no conoce SWR,
  tokens, endpoints ni estado de la nota.
- Cada comando modifica el documento con transacciones ProseMirror, de modo que
  tamaño/alineación de imagen y cambios de tabla participan en deshacer/rehacer.
- `NoteEditorHeader` solo presenta y emite acciones. El contenedor de la libreta
  decide cómo guardar, compartir, exportar o eliminar, evitando acoplar la UI a
  API, SWR o detalles de persistencia.
- `useImmersiveViewport` aísla la única responsabilidad de medir el viewport
  visible del móvil y publicarlo como variables CSS. El editor no lo conoce y
  `notebook-sidebar` solo decide *cuándo* está activo, no *cómo* se mide.

## Cinta adaptativa

- En escritorio (`min-width: 768px`) la cinta está arriba y el documento ocupa
  todo el ancho útil con márgenes fluidos. La sección exterior pierde tarjeta,
  borde y padding mientras se edita, igual que la superficie nativa.
- En móvil la cinta está abajo, al alcance del pulgar; el documento ocupa el
  resto de la pantalla y la cinta queda **pegada al teclado** porque la sección
  se ancla al viewport visible (alto y desplazamiento), no al de layout. El
  detalle de iOS está en
  [`estilos-moviles-web.md`](estilos-moviles-web.md#hueco-entre-la-cinta-del-editor-y-el-teclado-iphone).
- Pestañas y grupos desplazan horizontalmente. La cinta puede contraerse a la
  fila de pestañas.
- `Inicio` e `Insertar` son fijas. Versículo, definición, tabla e imagen abren
  automáticamente una pestaña contextual según la selección.
- Con `body.keyboard-open` desaparecen las etiquetas secundarias de grupo para
  recuperar alto sin perder acciones.

Las imágenes de fondo usan **Modo fondos**: normalmente quedan detrás del texto
y no capturan eventos; el modo las eleva temporalmente para seleccionarlas y
usar sus acciones contextuales.

## Adaptación visual del editor desktop

Se revisaron `desktop/docs/13-editor-notas.md`,
`desktop/docs/17-editor-pantalla-completa.md`,
`desktop/docs/18-bloques-sin-controles-incrustados.md` y las referencias de
`ejemplos/` del 28 de julio de 2026. La web adopta sus decisiones principales:

- cabecera estrecha en una sola línea con volver, título editable, estado,
  conteo, guardado y menú de acciones;
- `Ctrl/Cmd+S` ejecuta el mismo guardado explícito del botón;
- grupos de cinta separados por líneas en vez de tarjetas grandes;
- segunda fila de acceso a Fondos, Versículos, Diccionario e Imagen; al activar
  una categoría aparecen tarjetas de acción compactas;
- el título no se repite dentro de una tarjeta sobre el documento;
- la selección de versículos, definiciones, tablas e imágenes sigue usando
  pestañas contextuales y no incrusta botones dentro del contenido.

La fila especial se oculta en móvil porque sus acciones ya viven en las
pestañas desplazables de la cinta inferior. Así se conserva el alcance con el
pulgar y el espacio vertical cuando aparece el teclado.

## Archivos anfitriones

- `components/note-rich-editor.tsx` conserva `NoteContent` para lectura y
  expone `NoteRichEditorHandle.getHtml()` para guardado/autoguardado sin mover
  el foco.
- `components/notebook-sidebar.tsx` sigue siendo responsable de título,
  modales de versículo/diccionario, estado sucio y persistencia.
- `components/notes/editor-shell/note-editor-header.tsx` contiene la cabecera
  compacta compartida por los layouts responsive.
- `app/globals.css` contiene los estilos del documento, tablas, nodos atómicos
  y los dos layouts de cinta.

## Verificación

```bash
npm run check          # ida/vuelta Tiptap + banco legado de bloques
npx tsc --noEmit
npm run build
```

`check:editor` cubre formato, versículo sin controles serializados,
diccionario Strong, tabla, imagen normal e imagen de fondo. La comprobación
manual recomendada es abrir la misma nota en web, mobile y desktop; insertar
cada tipo de bloque; guardar; y confirmar que los otros clientes conservan el
contenido.
