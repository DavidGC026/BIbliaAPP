# 17 — Editor de notas a pantalla completa con cinta estilo Word

Rediseño de la pantalla del editor de notas para que el cuerpo del documento sea
el elemento dominante y las herramientas se organicen en una cinta superior
contraíble. Julio 2026.

Continúa [`16-editor-cinta-contextual.md`](./16-editor-cinta-contextual.md).
Aquí no se cambia el motor de edición: se rehace la **pantalla** que lo rodea, y
aplica tanto al editor actual como al nuevo.

---

## El problema medido

Sobre la captura de referencia (`Capturas Ejemplos/V1.png`), el cromo consumía
unos **490 px verticales** antes de la primera línea de texto. Tres capas
independientes lo causaban:

| Origen | Efecto |
|---|---|
| `NotesPage.tsx` envolvía el editor en `<div className="p-6">` | 24 px de relleno por lado |
| `.desktop-page` con `max-width: 96rem` y centrado | El contenido no alcanzaba los bordes |
| `AppLayout` con `<main overflow-auto>` | El scroll ocurría en la página entera |

A eso se sumaban `← Volver` en su propia fila, un título de 2xl con subtítulo,
una barra de herramientas de tres filas y una fila inferior con cuatro botones.

## La estructura nueva

```
AppLayout (h-screen, overflow-hidden)
├── aside          barra lateral contraíble  56 ↔ 16
└── main
    └── NoteEditorShell (h-100%)
        ├── NoteHeaderBar     una fila: volver · título · estado · Guardar · ⋯
        ├── WordRibbon        pestañas + grupos, contraíble
        │   └── SpecialTabsPanel   Fondos · Versículos · Diccionario · Imagen
        └── note-body         flex-1, min-height 0, scroll propio
```

La clave del alto es la cadena `h-screen → flex-1 → h-full → height:100%` con
**`min-height: 0`** en `.note-body`. Sin ese `min-height`, un hijo flex no se
encoge por debajo de su contenido y el scroll se escapa a la página.

`<main>` conserva `overflow-y-auto` a propósito: las demás pantallas siguen
desplazándose como siempre. El editor no genera ese scroll porque ocupa
exactamente el alto disponible.

## Componentes creados

| Archivo | Responsabilidad |
|---|---|
| `editor-shell/NoteEditorShell.tsx` | Rejilla vertical. No conoce el contenido de ninguna zona |
| `editor-shell/NoteHeaderBar.tsx` | Volver, título editable, estado, contador |
| `editor-shell/DocumentActions.tsx` | Guardar con estados + menú ⋯ con Eliminar |
| `ribbon/WordRibbon.tsx` | Pestañas, contraído y su persistencia |
| `ribbon/RibbonGroup.tsx` | Grupo etiquetado con separador |
| `ribbon/RibbonControls.tsx` | Botón, selector y muestra de color |
| `ribbon/SpecialTabsPanel.tsx` | Pestañas especiales con carrusel de dos tarjetas |
| `lib/editorLayoutPreferences.ts` | Estado de cinta, pestaña y barra lateral |

Ninguno supera las 200 líneas. `NoteEditorView` sigue siendo el anfitrión: toda
la lógica de guardado, formato e inserción permanece intacta; solo se
sustituyó su JSX.

## Decisiones de diseño

**Tokens en vez de colores sueltos.** Se añadieron `--note-chrome`,
`--note-hairline`, `--note-tone-sky` y `--note-tone-violet`, derivados con
`color-mix` de los tokens existentes. Los morados y azules que antes estaban
escritos a mano (`#7c3aed`, `sky-500`) pasan a ser variables, así que la
pantalla respeta los ocho temas de la app y no solo el oscuro.

**La cinta se anima con `grid-template-rows: 1fr → 0fr`.** Es la única forma de
animar altura sin fijar un valor en píxeles, que se rompería al cambiar de
pestaña o de ancho.

**Contraída deja solo la fila de pestañas**, y pulsar cualquiera la despliega,
igual que Word. El estado se guarda en localStorage junto con la última pestaña
usada y el estado de la barra lateral.

**Guardar refleja cuatro estados** — Guardar, Guardando…, Guardado, Error — con
icono y color. En reposo es un botón discreto de contorno; con cambios
pendientes se vuelve primario. Eliminar vive en el menú ⋯ con confirmación
obligatoria en dos pasos.

**El carrusel muestra dos tarjetas** y sube a tres o cuatro solo si hay ancho
(`ResizeObserver` a 640 y 900 px). Las flechas se desactivan en los extremos.

**Las tarjetas mapean a funciones reales, sin rellenos.** La pestaña Imagen
muestra una sola tarjeta —Subir imagen— hasta que hay una imagen seleccionada;
entonces aparecen ancho, alineación, mover y eliminar, que son las mismas
funciones del panel inferior anterior (`setImageWidth`, `setImageAlign`,
`moveImage`, `deleteImage`, `closeImageEditor`). Versículos y Diccionario tienen
una opción cada uno porque es lo que existe: no se inventaron opciones para
llenar el carrusel.

## Accesibilidad

- Todos los controles de icono llevan `title` y `aria-label`.
- `onMouseDown` con `preventDefault` en cada botón de formato: sin él se pierde
  la selección de texto al pulsar.
- `aria-pressed` en alternadores, `aria-selected` en pestañas, `aria-expanded`
  en los contraíbles, `role="menu"` en el menú de acciones.
- Foco visible con `box-shadow: 0 0 0 2px var(--ring)` en todos los controles.
- **Ctrl/Cmd + S** guarda. El menú se cierra con Escape o al pulsar fuera.

## Responsividad

| Ancho | Comportamiento |
|---|---|
| < 900 px | Se oculta el estado y el contador de la cabecera; el botón Guardar sigue mostrándolo |
| < 1100 px | Se ocultan las etiquetas de los grupos y los grupos marcados como secundarios |
| Cualquiera | `.ribbon-groups` desplaza en horizontal solo dentro de la cinta; la página nunca |

## Verificación

```bash
npx tsc --noEmit   # sin errores
npm run build      # correcto
npm run check      # 11/11
```

**Pendiente de comprobación visual.** El servidor de desarrollo no tiene entorno
gráfico, así que la revisión en WebKitGTK sigue sin hacerse. Al ejecutar
`npm run tauri dev` conviene mirar: que el cuerpo llegue a los bordes y a la
altura completa, que contraer cinta y barra lateral amplíe el área de escritura,
que el estado persista al reabrir, que el carrusel se desplace, y que insertar
versículo, diccionario, imagen y tabla siga funcionando.
