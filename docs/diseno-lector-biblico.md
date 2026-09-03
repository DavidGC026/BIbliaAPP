# Rediseño visual del lector bíblico (web)

Fecha: agosto 2026

## Origen

Propuesta de diseño para hacer el lector más atractivo acercándolo a la
composición tipográfica de una Biblia impresa: texto en párrafos, capitular,
apertura de capítulo editorial y subrayados que parecen marcador. Las siete
mejoras están **implementadas y verificadas** (`npx tsc --noEmit` limpio y
revisión visual en navegador sobre el lector real).

Archivos tocados:

- [`lib/reader-preferences.ts`](../lib/reader-preferences.ts)
- [`components/bible-reader/reader-settings.tsx`](../components/bible-reader/reader-settings.tsx)
- [`components/bible-reader/verse-text.tsx`](../components/bible-reader/verse-text.tsx)
- [`components/bible-reader/index.tsx`](../components/bible-reader/index.tsx)
- [`components/bible-reader/reader-toolbar.tsx`](../components/bible-reader/reader-toolbar.tsx)
- [`app/layout.tsx`](../app/layout.tsx)
- [`app/globals.css`](../app/globals.css)

## 1. Modo párrafos (texto continuo)

El cambio de mayor impacto: el capítulo puede leerse como texto corrido con el
número de versículo en superíndice, como la RVR1960 impresa, en lugar de una
lista vertical de bloques.

- Nueva preferencia `layout: "verses" | "paragraphs"` en
  `lib/reader-preferences.ts` (persistida en `localStorage`; por defecto
  `"verses"` para no cambiar la experiencia de usuarios existentes).
- Nuevo grupo **Texto** (Versículos / Párrafos) en
  `reader-settings.tsx`; la rejilla de ajustes pasa a cinco columnas en
  escritorio.
- En `verse-text.tsx`, el modo párrafos renderiza cada `<li>` como `inline`
  con el botón también inline (un `inline-block` no se fragmentaría entre
  líneas y un versículo largo desbordaría). El número es un `<sup>` en sans
  bold con el color de acento, y un espacio de texto real tras cada versículo
  garantiza el punto de quiebre de línea entre versículos.

Decisiones en este modo:

- **Sin botones laterales por versículo** (romperían el ritmo de línea). La
  selección por clic/shift-clic sigue activa sobre el texto; el versículo
  seleccionado se marca con subrayado dorado (`underline` en `--primary`),
  visible incluso sobre un subrayado de color.
- **Las notas se crean desde la barra flotante**: `reader-toolbar.tsx` recibe
  `onAddNote`, activo solo con exactamente un versículo seleccionado
  (`handleAddNoteToSelection` en `index.tsx`). Un versículo con nota muestra un
  icono `FileText` superscript junto al texto.
- Los **comentarios clásicos** rompen el párrafo como bloque propio (un bloque
  dentro de un inline divide el formato en cajas anónimas; es el comportamiento
  CSS estándar y se ve correcto).
- El botón de insertar-en-cuaderno no aparece en modo párrafos: quien compone
  una nota trabaja en modo versículos.

## 2. Capitular en el versículo 1

La primera letra del capítulo flota a la izquierda a ~3 líneas de alto con el
color de acento, como las capitulares de manuscrito; el número "1" desaparece.

- Clase `.verse-dropcap` en `app/globals.css`. El tamaño es `3.15em` para que
  escale con el ajuste de fuente del lector (A−/A+).
- En `verse-text.tsx` se extrae la primera letra con `/^(\p{L})([\s\S]*)$/u`.
  **Solo aplica si el texto empieza con letra**: si una versión abriera el
  capítulo con comillas u otro signo, se muestra el "1" normal y no hay
  capitular.
- Funciona en ambos modos (versículos y párrafos). El `aria-label` del botón
  conserva el texto íntegro, así que la letra movida al span `aria-hidden` no
  afecta a lectores de pantalla.

## 3. Cabecera de capítulo editorial

La apertura de capítulo deja de ser un rótulo con líneas laterales:

- Nombre del libro en versalitas con tracking amplio (`tracking-[0.32em]`).
- Número del capítulo como numeral display en serif (`text-5xl md:text-6xl`).
- Fleurón `❦` flanqueado por dos filetes en `--primary/70` como ornamento.

## 4. Medida de lectura limitada

El `<ol>`, la cabecera y la navegación de capítulo comparten
`mx-auto w-full max-w-[68ch]`. En modo "Solo Biblia" las líneas ya no superan
los ~68 caracteres en monitores anchos; en modo dividido la columna suele ser
más estrecha que la medida y no cambia nada.

## 5. Subrayados tipo marcador

El destacado deja de ser un bloque con borde lateral grueso (parecía una
alerta) y pasa a pintar solo el texto, como un resaltador sobre el papel:

- Las clases viven en el span del texto con `box-decoration-clone`
  (la tinta cubre cada línea de un versículo quebrado) y esquinas de `0.2em`.
- Colores `*-400/45` (claro) y `*-400/40` (oscuro): el texto negro sigue
  legible sobre el marcador.
- En modo versículos el `<li>` conserva el anillo de selección y el hover; en
  modo párrafos la selección es el subrayado dorado inline descrito arriba.

## 6. Referencia viva y barra de progreso

El lector ya tenía scroll-spy (`currentVerse`) pero nunca lo mostraba:

- Escritorio: referencia en cursiva serif (`Salmos 23:4`) en la fila de
  controles del panel sticky. Móvil: el botón del pasaje muestra
  `Libro capítulo:versículo`.
- Barra de progreso de 3px al pie del panel sticky: el ancho es
  `currentVerse / total`, con mínimo del 2% para que siempre se perciba. Va en
  flujo con márgenes negativos y `rounded-b-xl` (sin `overflow-hidden` en el
  panel, para no recortar los desplegables de búsqueda).
- `handleChapterChange` y los botones de capítulo anterior/siguiente ahora
  reinician `currentVerse` a 1: antes la referencia y el progreso heredaban el
  versículo del capítulo anterior hasta el primer scroll.

## 7. Refinamiento tipográfico

- `app/layout.tsx`: Source Serif 4 carga su eje óptico (`axes: ['opsz']`) y
  `globals.css` declara `font-optical-sizing: auto`, así la serif ajusta su
  dibujo sola entre texto corrido y el numeral display de la cabecera.
- `text-wrap: pretty` en el texto del versículo (evita huérfanas).
- `hyphens: auto` cuando la alineación es justificada (`html lang="es"` ya lo
  habilita para español): la justificación ya no abre ríos de espacios.
- Números de versículo en modo versículos con `font-serif` +
  `oldstyle-nums` (cifras elzevirianas).

## Descartado a propósito

- **Letras rojas** (palabras de Jesús): sería lo icónico, pero
  `bible_verses.text` es texto plano sin marcadores; requeriría importar un
  dataset etiquetado. Candidato futuro si se consiguen los datos.
- **Transiciones animadas entre capítulos**: en un lector aportan poco y un
  movimiento constante al avanzar página cansa; el diseño gasta su boldness en
  la capitular y la cabecera.

## Verificación

```bash
npx tsc --noEmit
```

Pruebas manuales (hechas con navegador automatizado sobre `npm run dev`):

1. **Leer** → cualquier capítulo: cabecera con libro en versalitas, numeral
   grande y fleurón; versículo 1 con capitular.
2. Ajustes de lectura (**Lectura**) → **Texto → Párrafos**: texto corrido con
   números en superíndice; clic sobre un versículo lo subraya y abre la barra
   flotante.
3. Hacer scroll: la referencia del panel sticky y la barra de progreso siguen
   al versículo visible; cambiar de capítulo reinicia ambos a `capítulo:1`.
4. Subrayar versículos de varios colores: la tinta cubre solo el texto, incluidas
   las líneas quebradas de un versículo largo.
5. Justificar el texto en ajustes: la separación silábica evita huecos grandes.

## Ajuste de aire en controles (agosto 2026)

Los botones del panel sticky se veían apretados: la rejilla de cinco columnas
forzaba Tamaño, Texto, Lectura, Tema y Estudio a una sola fila con `gap-1`.

- `reader-settings.tsx` pasa a `flex-wrap` con `gap-x-5 gap-y-4` y `p-4`; cada
  grupo tiene `min-w` propio y los toggles suben a `h-10` con `px-3`.
- Escuchar / Lectura / Dividido / Solo Biblia: más alto (`h-9`) y más
  separación (`gap-3`); el switcher de vista usa `px-3 py-1.5`.
- Flechas de capítulo: `gap-2` respecto al select.
- Botones de nota por versículo: `size-8` (32px) en vez de `size-7`.

## Paridad móvil (agosto 2026)

Dos mejoras del lector web llegaron a la app React Native, adaptadas a las
capacidades de la plataforma:

- **Modo párrafos**: mismo toggle Versículos/Párrafos en los ajustes de lectura,
  con la misma preferencia persistida. React Native no tiene superíndice ni
  `box-decoration-clone`: el capítulo se compone como un único `<Text>` con un
  span por versículo, el número va inline en negrita al 60 % del cuerpo y el
  subrayado pinta solo el texto (un span con fondo translúcido, sin borde
  lateral). La capitular queda fuera por ahora: RN no tiene floats y un faux
  drop cap rompería el flujo del párrafo.
- **Referencia viva y progreso por versículo**: el pill inferior de navegación
  muestra `LIBRO CAP:VERS` según el versículo visible (scroll-spy con las cajas
  ya medidas para el salto a versículo) y la barra de progreso de la cabecera
  pasa de «capítulo / total del libro» a «versículo visible / versículos del
  capítulo». En modo párrafos ambos se aproximan por proporción sobre la caja
  del texto corrido.

Detalle completo en
[`docs-mobile/38-lector-parrafos-y-referencia-viva.md`](../docs-mobile/38-lector-parrafos-y-referencia-viva.md).
