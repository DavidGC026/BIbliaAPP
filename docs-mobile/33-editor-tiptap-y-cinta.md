# 33 — El editor de notas pasa a Tiptap con cinta estilo Word

Cambio de motor del editor del móvil y rediseño de su pantalla. Julio 2026.

Traslada al móvil el trabajo que el cliente de escritorio documenta en
`desktop/docs/15` (esquema Tiptap), `16` (cinta contextual) y `17` (pantalla
completa), y completa el `32` de esta misma carpeta, que ya había sacado los
controles del documento. Con una diferencia deliberada: **en el móvil Tiptap es
el editor, no una prueba detrás de un interruptor.**

---

## Por qué

`execCommand` está deprecado y se comporta distinto en cada motor. De ahí salían
dos problemas que no se arreglaban con más código:

1. **El HTML guardado podía quedar roto.** Es lo que documenta
   [`29-notas-bloques-de-contenido.md`](./29-notas-bloques-de-contenido.md): un
   Delete pegado a un versículo se llevaba media estructura y la nota quedaba
   inservible de forma permanente. Se reparaba *a posteriori* con
   `normalizeContentBlocks`, en cada tecla.
2. **No había modelo de documento que consultar**, así que la cinta contextual,
   combinar celdas, buscar y reemplazar o un índice navegable no tenían dónde
   apoyarse.

Con un esquema, un bloque **no puede quedar a medias**: o el nodo está o no
está. La reparación deja de hacer falta en vez de hacerse mejor.

## Lo que no cambia

**El formato guardado sigue siendo HTML en `NotebookNote.content`.** Tiptap lee
y escribe HTML de forma nativa, así que la base de datos, la API, la
sincronización y las notas ya escritas no se tocan, y lo que guarda el móvil lo
sigue reconstruyendo la web con su código de siempre. Eso se comprueba en cada
ejecución del banco de pruebas, no se supone.

El protocolo de mensajes entre React Native y el WebView tampoco cambia
(`getHtml`, `insertVerse`, `onChange`…), así que la pantalla de la nota no sabe
qué motor tiene debajo.

## Estructura

```
mobile/lib/tiptap/
├── extensions.ts            raíz de composición: buildNoteExtensions()
├── rawElement.ts
├── nodes/
│   ├── verseBlock.ts        blockquote.biblia-verse-quote  (atómico)
│   ├── dictBlock.ts         aside.biblia-dict-entry        (atómico)
│   ├── imageBlock.ts        div.note-image-block           (atómico, arrastrable)
│   └── blockHandle.ts       descarta la barra de botones al leer
├── bundle.generated.ts      ARCHIVO GENERADO (esbuild)
└── editor/
    ├── entry.ts             arranque y puente con React Native
    ├── ribbon.ts            motor de la cinta
    ├── ribbonTypes.ts       contrato RibbonTab / RibbonContext
    ├── blockCommands.ts     mover, copiar, cortar, eliminar el bloque
    ├── imageCommands.ts     ancho, alineación, fondo y arrastre
    ├── colorWheel.ts        rueda cromática
    ├── tablePicker.ts       selector de tabla
    └── tabs/                una pestaña por archivo + registro

mobile/lib/editor/
├── documentCss.ts           estilos del documento (edición y lectura)
└── ribbonCss.ts             estilos de la cinta
```

| Principio | Cómo se aplica |
|---|---|
| Responsabilidad única | Cada nodo resuelve un tipo de bloque; cada pestaña dibuja la suya; `entry.ts` no sabe de formato y las pestañas no saben de guardado |
| Abierto/cerrado | Un bloque nuevo se añade a `bibliaNodes`; una pestaña, a `ribbonTabs`. Nada existente se modifica |
| Sustitución de Liskov | Toda pestaña cumple `RibbonTab` y la cinta las trata igual |
| Segregación de interfaces | `RibbonContext` entrega solo el editor, el puente y la paleta |
| Inversión de dependencias | La cinta depende del registro de pestañas, no de `homeTab` ni de `tableTab` |

## La cinta

Va **abajo**, no arriba como en el escritorio. Es donde estaba la barra de
herramientas, queda al alcance del pulgar y el teclado la empuja hacia arriba en
vez de taparla.

| Pestaña | Cuándo | Contiene |
|---|---|---|
| **Inicio** | Siempre | Deshacer/rehacer, H1/H2/Normal, tipografía y tamaño, negrita/cursiva/subrayado/tachado, listas, cita, alineación, color |
| **Insertar** | Siempre | Versículo, Diccionario, **Modo fondos**, Tabla, Imagen |
| **Formato de versículo** | Versículo seleccionado | Orden, Portapapeles, Bloque |
| **Formato de definición** | Definición Strong seleccionada | Orden, Portapapeles, Bloque |
| **Diseño de tabla** | Cursor dentro de una tabla | Filas, Columnas, Celdas (combinar, dividir, encabezado), Orden, Eliminar |
| **Formato de imagen** | Imagen seleccionada | Tamaño 25/50/75/100 %, posición, detrás del texto, orden, eliminar |

Regla de activación, igual que en Word: si una contextual coincide con la
selección se **activa sola**; al dejar de coincidir se vuelve a la que el usuario
tuviera elegida a mano. Lo que lo hace posible es el esquema:
`editor.isActive('table')` responde solo, sin recorrer el DOM.

La cinta se contrae con la flecha de su derecha y pulsar cualquier pestaña la
vuelve a desplegar.

### Refinamiento visual de la cinta

La primera versión trasladó todas las funciones, pero conservó glifos de texto
(`↶`, `B`, `⇤`, `✕`), un único radio y separadores verticales. En pantallas
pequeñas eso hacía que más de treinta acciones se leyeran como la misma pieza.

La cinta ahora tiene un lenguaje visual propio:

- `lib/tiptap/editor/ribbonIcons.ts` contiene un registro tipado de iconos SVG
  con trazo uniforme. No usa `@expo/vector-icons`: la cinta es DOM dentro del
  WebView y no puede montar componentes React Native. Los SVG se empaquetan con
  Tiptap y funcionan sin red ni fuente de iconos.
- Cada acción declara `icon` en `RibbonButtonSpec`; los botones compactos
  muestran la silueta y conservan el nombre en `aria-label`, mientras las
  acciones anchas combinan icono y texto.
- Inicio, Insertar y cada pestaña contextual llevan icono. Versículo,
  definición, tabla e imagen se distinguen antes de leer el título, y las
  contextuales mantienen además el fondo y borde primarios.
- Los grupos son tarjetas compactas con fondo alterno, borde redondeado y más
  espacio entre bloques. La etiqueta inferior sigue presente, pero ya no es la
  única separación visual.
- H1 y H2 conservan texto —es la representación más directa del estilo— con
  tamaño y peso distintos. El resto de formato, alineación, tablas y acciones
  de bloque usa iconografía vectorial real.

El render continúa siendo declarativo: añadir un icono a una acción no cambia
`Ribbon`, solo el descriptor de la pestaña. `renderItem` centraliza el DOM,
accesibilidad y combinación icono/etiqueta.

### Colocación directa de imágenes de fondo

Las imágenes detrás del texto usan ahora un modo temporal de colocación con un
principio explícito: **mientras se editan están delante; al finalizar vuelven
detrás**.

- Al pulsar **Detrás del texto**, la cinta activa automáticamente el modo de
  fondos. La imagen no desaparece: queda elevada, con contorno discontinuo y
  sombra, lista para arrastrarla.
- La pestaña contextual muestra **Finalizar fondo**. Al pulsarlo se apaga el
  modo temporal, se cierra la selección y la imagen vuelve inmediatamente a la
  capa inferior, sin tener que alternar entre Editar y Vista previa.
- El documento define capas locales: texto y bloques normales en la capa 1,
  fondos en la 0 y fondos en edición en la 10. Así el `z-index: -1` conservado
  en el HTML por compatibilidad nunca cae detrás del fondo opaco del WebView.
- Durante el arrastre, acercar el dedo a los 64 px superiores o inferiores
  desplaza `#editor` progresivamente. La posición incorpora la diferencia de
  scroll, de modo que la imagen sigue bajo el dedo aunque este se quede quieto
  junto al borde.

El auto-scroll usa el contenedor real que desplaza la nota (`#editor`), no
`.ProseMirror`: esta última representa el documento, pero su `scrollTop`
permanece en cero.

**Modo fondos** sigue siendo necesario: una imagen detrás del texto lleva
`pointer-events: none` para poder escribir encima, así que hay que elevarla un
momento para seleccionarla o arrastrarla. Es interfaz pasajera —una clase en el
`body`—, nunca se guarda en la nota.

**Todos los botones usan `preventDefault`** en `touchend` y `mousedown`: pulsar
uno no mueve el foco fuera del editor, así que no se pierde ni la selección ni
el teclado.

## Lo que gana el editor

- **Combinar y dividir celdas** y **redimensionar columnas** arrastrando el
  borde, que vienen de `@tiptap/extension-table`.
- **Alineación de párrafo** (izquierda, centro, derecha).
- **Un solo historial** para todo: las ediciones de imagen entran en
  deshacer/rehacer porque son transacciones del documento. Antes hacía falta un
  historial propio por instantáneas de `innerHTML`, que con imágenes en base64
  llegaba a pesar megabytes.
- **Cita** como bloque propio, distinta del versículo.

## Lo que desaparece

| Se va | Dónde está ahora |
|---|---|
| Panel inferior de edición de imagen | Pestaña **Formato de imagen** |
| Barra de botones dentro del bloque | Pestañas contextuales (ya desde el [32](./32-notas-pestana-contextual.md)) |
| `normalizeContentBlocks` y el borrado en dos pasos | Innecesarios: un nodo del esquema no se rompe |
| Historial propio por instantáneas | El de ProseMirror |
| Modo `imageEditMode` que escondía la cabecera | Ya no hay panel que tapar |

`lib/noteEditorBlocks.ts` y `lib/noteEditorTable.ts` se quedan **solo con la
vista de lectura**: los estilos del documento y el guion que compacta las tablas
y las abre a pantalla completa al tocarlas. Eso lo siguen usando la vista
previa, las tarjetas de libreta y el PDF.

## La pantalla

Una sola fila de cabecera —volver, título editable, estado de guardado con
contador de palabras, **Guardar** y el menú de tres puntos—, y el cuerpo con
todo lo demás. La cabecera nativa se apaga (`headerShown: false`), que es lo que
libera el espacio.

Guardar refleja cuatro estados: Guardar, Guardando…, Guardado y Reintentar; se
vuelve primario cuando hay cambios sin guardar. Compartir, Exportar PDF y
Eliminar viven en el menú, y Eliminar sigue pidiendo confirmación.

## El bundle

Metro no empaqueta código para el WebView: lo que se le entrega es una cadena
dentro del HTML. Por eso el editor se compila aparte:

```bash
node scripts/build_editor_bundle.mjs     # tras tocar cualquier cosa de lib/tiptap
```

Deja el resultado en `lib/tiptap/bundle.generated.ts` (443 kB sin comprimir),
que **se versiona a propósito**: así una instalación limpia o una compilación en
EAS no dependen de que alguien recuerde ejecutar el script. El generador escapa
`</script` para que el código no cierre la etiqueta antes de tiempo.

Solo pesa en el APK; no hay descarga, así que no afecta al arranque ni consume
datos.

## Verificación

```bash
cd mobile
npm run build:editor    # tras tocar lib/tiptap
npm run check           # ida y vuelta (9 + 5), pagina del editor (32) e imagenes
npx tsc --noEmit
```

- **`test_editor_roundtrip.cjs`** — que el HTML real de una nota sobreviva el
  ida y vuelta por el esquema (formato, encabezados, color y tamaño del editor
  anterior, versículo con barra guardada, diccionario, tabla, imagen normal, de
  fondo y suelta), y que **la web reconstruya** lo que guarda el móvil, usando
  su propio `normalizeContentBlocks`. Esa segunda parte se salta sola si el
  repositorio web no está al lado.
- **`test_editor_page.cjs`** — monta en jsdom la página real que recibe el
  WebView, con su bundle, y la acciona: que el editor arranque, que la cinta se
  dibuje, que la pestaña contextual aparezca y se active sola al seleccionar un
  versículo, que subir y eliminar funcionen desde ella, que el documento no
  contenga ningún control, que el puente responda a `getHtml`, `insertVerse`,
  `insertImage`, `updateContent` y `setFont`, y que la vista de solo lectura
  siga compactando las tablas sin cargar el editor.

**Pendiente de comprobación en un dispositivo**, que es lo que no puede hacer
ninguna de las pruebas anteriores:

1. Que el teclado empuje la cinta y el cursor siga a la vista al escribir al
   final de una nota larga. — Probado en el APK 4.0.0: la cinta se quedaba a
   medias bajo el teclado. Corregido en
   [34](./34-notas-cinta-bajo-el-teclado.md).
2. Insertar versículo, diccionario, tabla e imagen, y que la pestaña contextual
   aparezca al tocarlos.
3. Arrastrar el borde de una columna y combinar dos celdas con el dedo.
4. Arrastrar una imagen de fondo.
5. Abrir una nota escrita en la web con bloques y barra guardada, editarla,
   guardar y volver a abrirla en la web.
6. Rendimiento con una nota larga y con imágenes en base64.
