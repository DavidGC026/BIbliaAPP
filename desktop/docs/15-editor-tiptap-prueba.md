# 15 — Editor de notas: prueba de concepto con Tiptap

Prueba de viabilidad para sustituir el motor del editor de notas
(`contentEditable` + `document.execCommand`) por un modelo de documento real
basado en ProseMirror, a través de Tiptap. Julio 2026.

**Estado: prueba superada, migración no iniciada.** El editor que usa la app
sigue siendo el de `NoteEditorView.tsx`. Lo que hay aquí es el esquema y su
banco de pruebas.

---

## Por qué

`execCommand` está deprecado y se comporta distinto en los tres motores que
usamos: WebKitGTK (desktop), Chromium (web) y WebView de Android (móvil). De ahí
salen dos problemas que no se arreglan con más código:

1. **El HTML guardado puede quedar roto.** Documentado en
   `docs-mobile/29-notas-bloques-de-contenido.md`: al pulsar Delete junto a un
   versículo, el motor del navegador se lleva `.biblia-block-handle` y la nota
   queda sin forma de mover ni borrar ese bloque, de manera permanente. Hoy se
   repara *a posteriori* con `normalizeContentBlocks`.
2. **No hay modelo de documento que consultar**, así que buscar y reemplazar,
   índice navegable, historial de versiones, pegado limpio desde Word o una
   cinta contextual no tienen dónde apoyarse.

## Qué se decidió no cambiar

**El formato guardado sigue siendo HTML en `NotebookNote.content`.** Tiptap lee
y escribe HTML de forma nativa, así que la base de datos, la API, el sync y las
notas ya existentes no se tocan. Descartada la alternativa de guardar JSON de
bloques: obligaría a migrar todas las notas y a romper la compatibilidad entre
clientes, para conseguir un modelo tipado que Tiptap ya da sin ese precio.

## El hallazgo que hace segura la migración

`wrapAllContentBlocks` (`src/lib/noteEditorBlocks.ts:273`) reconstruye los
bloques a partir de elementos **desnudos**: un `<blockquote>`, una `<table>` o
un `<img>` sueltos se re-envuelven con su barra de botones al abrir la nota. Web
y móvil hacen lo mismo con `normalizeContentBlocks`.

Consecuencia: **Tiptap puede guardar HTML limpio, sin la barra de botones, y los
tres clientes la regeneran solos.** Eso saca la interfaz del dato del usuario
—hoy los `<button>` de `↑ ↓ Copiar Cortar Eliminar` se serializan dentro de cada
nota— sin necesidad de tocar web ni móvil.

---

## Estructura del código

Un nodo por archivo, con una raíz de composición que es el único punto que
conoce la lista completa. Añadir un bloque nuevo es añadir una línea a
`extensions.ts`: ni el editor ni los nodos existentes se modifican.

```
src/lib/tiptap/
├── extensions.ts          raíz de composición: buildNoteExtensions()
├── rawElement.ts          utilidad para renderizar HTML ya compuesto
├── nodes/
│   ├── verseBlock.ts      blockquote.biblia-verse-quote  (atómico)
│   ├── dictBlock.ts       aside.biblia-dict-entry        (atómico)
│   ├── imageBlock.ts      div.note-image-block           (atómico, arrastrable)
│   └── blockHandle.ts     descarta .biblia-block-handle al leer
└── __roundtrip__.ts       banco de pruebas
```

| Principio | Cómo se aplica |
|---|---|
| Responsabilidad única | Cada nodo resuelve un solo tipo de bloque y nada más |
| Abierto/cerrado | Un bloque nuevo se añade a `bibliaNodes`; no se modifica lo existente |
| Sustitución de Liskov | Todos los nodos cumplen el contrato `Node` de Tiptap, el editor no distingue |
| Segregación de interfaces | Extensiones pequeñas e independientes en vez de un módulo único |
| Inversión de dependencias | El editor dependerá de `buildNoteExtensions()`, no de cada nodo concreto |

### Detalle: por qué el versículo tiene `priority: 200`

`StarterKit` trae su propio nodo `blockquote` y ganaba la regla de parseo, con
lo que el versículo perdía su clase. Subir la prioridad de `VerseBlock` lo
resuelve y, de paso, deja el `blockquote` normal libre para usarse como cita
corriente, que hoy no existe.

---

## Banco de pruebas

```bash
npm run check:editor      # solo esta prueba
npm run check             # incluye la anterior y esta
```

Comprueba dos cosas distintas. **Parte 1 — ida y vuelta:** que el HTML real de
las notas entra al esquema y sale sin pérdidas.

| Caso | Verifica |
|---|---|
| Formato básico | negrita, cursiva, subrayado, listas ordenadas y sin ordenar |
| Encabezados | `h1`, `h2`, párrafos |
| Versículo con barra guardada | conserva `blockquote.biblia-verse-quote`; **descarta** la barra y sus botones |
| Diccionario Strong | conserva `aside.biblia-dict-entry`, `data-strong` y el lema |
| Tabla con encabezado | conserva `table`, `th`, `td` |
| Imagen normal | conserva `src`, `alt` y el bloque `note-image-block` |
| Imagen de fondo | conserva `is-background` y la posición `left`/`top` |

**Parte 2 — interoperabilidad:** que el HTML limpio que produce Tiptap lo
reconstruye el código que **ya existe**, sin modificarlo. Se ejecuta
`wrapAllContentBlocks` sobre la salida y se comprueba que vuelven el envoltorio
`.biblia-content-block` y la barra con sus acciones, incluidas las de fila y
columna de las tablas.

Resultado actual: **11 de 11 correctos**.

## Coste medido

| Concepto | Valor |
|---|---|
| Tiptap + ProseMirror + extensiones | 397 kB minificado, **125 kB gzip** |
| Bundle de desktop antes | 480 kB / 136 kB gzip |
| Licencia | MIT (`@tiptap/core`, `pm`, `starter-kit`, `extension-table`) |

En Tauri el peso es irrelevante porque la carga es local. En web sí cuenta, y es
donde habrá que decidir si el editor se carga de forma diferida.

Nada de lo que se necesita depende de servicios de pago: Tiptap Cloud
(colaboración, comentarios, IA, conversión a DOCX) queda fuera del alcance.

## Lo que la prueba todavía NO demuestra

- **Que funcione en WebKitGTK.** El banco de pruebas corre sobre jsdom en Node.
  Falta montar el editor en la app y abrirla en Linux.
- **Fidelidad con notas reales de la base de datos.** Los casos usan el formato
  que generan `buildVerseBlockHtml` y compañía, no un volcado de notas de
  usuarios.
- **Comportamiento de la cinta contextual**, que aún no existe.

## Archivos

| Archivo | Contenido |
|---|---|
| `src/lib/tiptap/extensions.ts` | Raíz de composición |
| `src/lib/tiptap/nodes/*.ts` | Un nodo por bloque |
| `src/lib/tiptap/rawElement.ts` | Utilidad de renderizado |
| `src/lib/tiptap/__roundtrip__.ts` | Banco de pruebas |
| `src/lib/noteEditorBlocks.ts` | Código actual; `wrapAllContentBlocks` es la pieza que da la compatibilidad |

Relacionado: [`13-editor-notas.md`](./13-editor-notas.md) describe el editor en
producción.
