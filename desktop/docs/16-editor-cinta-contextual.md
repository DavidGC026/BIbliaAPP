# 16 — Editor de notas: cinta contextual sobre Tiptap

Segundo paso de la migración del editor de notas. Añade el editor Tiptap montado
dentro de la app, con una cinta de opciones que cambia según dónde esté el
cursor, al estilo de Word. Julio 2026.

**Estado: convive con el editor actual detrás de un interruptor.** El editor por
defecto sigue siendo el de `execCommand`. Continúa
[`15-editor-tiptap-prueba.md`](./15-editor-tiptap-prueba.md), donde se validó
que el HTML sobrevive el ida y vuelta.

---

## Cómo probarlo

En el editor de una nota, arriba a la izquierda, botón **«Probar editor
nuevo»**. Vuelve a pulsarlo para regresar al editor de siempre. El interruptor
no se guarda: cada nota abre con el editor actual.

Ambos editores comparten la misma nota, el mismo autoguardado y el mismo
`content`, así que se puede alternar sin perder nada.

## La cinta

Tres pestañas, dos de ellas contextuales:

| Pestaña | Cuándo aparece | Contiene |
|---|---|---|
| **Inicio** | Siempre | Deshacer/rehacer, H1-H3, negrita, cursiva, subrayado, tachado, listas, cita, alineación, tamaños, insertar tabla e imagen |
| **Tabla** | Cursor dentro de una tabla | Añadir y quitar fila o columna, combinar y dividir celdas, alternar encabezado, borrar tabla |
| **Imagen** | Imagen seleccionada | Ancho 25/50/75/100 %, alineación, modo fondo, borrar |

Regla de activación, igual que en Word: si una pestaña contextual coincide con
la selección se **activa sola**; al dejar de coincidir se vuelve a la que el
usuario tuviera elegida a mano.

Lo que hace esto posible es el esquema: `editor.isActive("table")` responde solo.
Con `execCommand` había que deducirlo recorriendo el DOM en cada cambio de
selección, y por triplicado.

### Combinar celdas ya funciona

`mergeCells`, `splitCell` y el redimensionado de columnas arrastrando el borde
vienen en `@tiptap/extension-table`. Son las funciones que en el editor actual
no existen y que a mano costarían cientos de líneas por cliente.

---

## Estructura

```
src/components/notes/tiptap/
├── TiptapNoteEditor.tsx    monta el editor y lo une a la cinta
├── Ribbon.tsx              decide qué pestaña mostrar
├── RibbonButton.tsx        botón y separador reutilizables
├── ribbonTypes.ts          contrato RibbonTab y RibbonContext
└── tabs/
    ├── ribbonTabs.ts       registro: único punto que conoce el conjunto
    ├── homeTab.tsx
    ├── tableTab.tsx
    └── imageTab.tsx
```

| Principio | Cómo se aplica |
|---|---|
| Responsabilidad única | `TiptapNoteEditor` monta; `Ribbon` elige pestaña; cada pestaña dibuja la suya. Ninguno guarda ni sabe de la API |
| Abierto/cerrado | Una pestaña nueva (p. ej. «Versículo») se añade a `ribbonTabs`; ni `Ribbon` ni las demás cambian |
| Sustitución de Liskov | Toda pestaña cumple `RibbonTab`; la cinta las trata igual sin distinguir cuál es |
| Segregación de interfaces | `RibbonContext` entrega solo lo que una pestaña necesita: el editor y dos devoluciones de llamada |
| Inversión de dependencias | `Ribbon` depende del registro, no de `homeTab` ni de `tableTab` |

### Detalles que costaron

- **`onMouseDown` con `preventDefault` en cada botón.** Sin él, pulsar mueve el
  foco fuera del editor y se pierde la selección sobre la que aplicar formato.
- **Redibujado por selección.** La cinta debe reaccionar a mover el cursor, no
  solo a escribir. Se fuerza con un contador en `selectionUpdate` y
  `transaction`; despachar una transacción ahí provocaría un bucle infinito.
- **`priority: 200` en `VerseBlock`.** Ver documento 15.
- **`TrailingNode`.** Sin él, una nota que termina en tabla o imagen deja al
  usuario sin sitio donde escribir.

## Integración con `NoteEditorView`

Los dos editores conviven sin duplicar la lógica de guardado:

- `applyChange(html)` registra HTML nuevo venga del editor que venga. Se extrajo
  de `markChanged`, que sigue existiendo porque se usa como `onInput` del
  `contentEditable` y no puede recibir argumentos.
- `currentHtml()` devuelve `latestHtmlRef` cuando el editor nuevo está activo,
  porque ahí el HTML vive en el editor y no en un `div` del DOM.
- `insertHtml()` se bifurca: con Tiptap inserta por comando y el esquema parsea
  el HTML al nodo que corresponda. Así el selector de tablas y la subida de
  imágenes, que ya existían, sirven para los dos.

## Coste

| | Antes | Después |
|---|---|---|
| Bundle | 480 kB / 136 kB gzip | 932 kB / **280 kB** gzip |

En Tauri la carga es local, así que el peso no se nota. Es un dato a tener en
cuenta cuando le toque a la web, donde probablemente convenga cargar el editor
de forma diferida.

## Verificación

```bash
npm run check      # 11 casos de esquema e interoperabilidad
npx tsc --noEmit   # tipos
npm run build      # bundle
```

**Pendiente y no verificado: que funcione en WebKitGTK.** Todo lo anterior corre
en Node y en el compilador. El servidor donde se desarrolla no tiene entorno
gráfico (`DISPLAY` vacío, sin Xvfb), así que hay que ejecutarlo en una máquina
con pantalla:

```bash
cd desktop && npm run tauri dev
```

Y comprobar ahí: que la nota carga con su formato, que la pestaña **Tabla**
aparece sola al entrar en una tabla, que el borde de columna se arrastra, que
**Imagen** aparece al seleccionar una, y que al guardar y reabrir en la web la
nota se ve igual.

## Lo que todavía falta para sustituir al editor actual

- Colores de texto y colores favoritos
- Selector de tipografía por nota
- Insertar versículo y diccionario Strong desde la cinta
- Arrastrar imágenes de fondo
- Pegado limpio desde Word y Google Docs
- Vista previa y exportación a PDF con el editor nuevo
