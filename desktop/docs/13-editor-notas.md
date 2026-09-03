# 13 — Editor de notas: formato, imágenes y autoguardado

Estado en desktop **v0.3.3**. Esta implementación replica el comportamiento del editor móvil y conserva un HTML compatible entre ambos clientes.

> **Aviso sobre la interfaz.** Desde el rediseño de julio de 2026, los controles
> que aquí se describen ya no viven en una barra de tres filas ni en la fila
> inferior de botones: están repartidos entre la cinta superior y el panel de
> herramientas especiales. Las **funciones** siguen siendo exactamente las que
> documenta este archivo; solo cambió dónde se pulsan. Ver
> [17-editor-pantalla-completa.md](./17-editor-pantalla-completa.md) para la
> distribución actual, y [15](./15-editor-tiptap-prueba.md) y
> [16](./16-editor-cinta-contextual.md) para el motor nuevo, que todavía no es
> el predeterminado.

## Barra de formato

El editor permite:

- deshacer y rehacer;
- encabezados H1/H2;
- negrita, cursiva, subrayado y tachado;
- listas, sangría, tamaños 14/16/20/28 y selección total;
- tipografía persistente por nota;
- tablas, versículos, entradas del diccionario Strong e imágenes;
- colores favoritos, selector libre del sistema y **Color automático**.

### Color automático

El botón redondo **A** no guarda negro, blanco ni el color que esté activo en ese momento. Envuelve el tramo en:

```html
<span class="note-color-auto">Texto</span>
```

La clase se resuelve con `var(--foreground)`, por lo que el texto se adapta al cambiar entre Sistema, Claro, Oscuro, Sepia y los demás temas. Al aplicarlo a texto que ya tenía color se eliminan colores inline anidados y atributos antiguos `font[color]`. También funciona con el cursor colapsado para que lo escrito a continuación quede en modo automático.

## Tablas configurables

El botón de tabla abre un selector equivalente al de mobile:

- entre 1 y 10 columnas;
- entre 1 y 20 filas;
- primera fila como encabezado opcional;
- vista previa inmediata antes de insertar.

Después de insertar, el primer clic selecciona el bloque y muestra **+ Fila**,
**− Fila**, **+ Col** y **− Col**, además de las acciones comunes. Un segundo
clic en una celda entra en edición de texto. Los límites impiden dejar la tabla
sin filas o columnas, y cada cambio dispara el mismo autoguardado del contenido.

## Imágenes normales y de fondo

Las imágenes usan el mismo bloque canónico de móvil:

```html
<div class="note-image-block" contenteditable="false" style="…">
  <img src="…" draggable="false" style="…" />
</div>
```

Al abrir una nota antigua, desktop migra de forma no destructiva sus bloques `biblia-image-block` al formato anterior. Las notas creadas en móvil se abren directamente, sin envolver ni duplicar la imagen.

### Inserción y persistencia

1. **Imagen** abre el selector de archivos y acepta formatos `image/*` de hasta 10 MB.
2. Con conexión intenta `POST /api/upload` y guarda la URL pública absoluta.
3. Si la subida falla o no hay red, guarda un `data:` URL dentro del HTML para que la imagen no se pierda offline.
4. La serialización elimina únicamente estados visuales de edición (`is-selected` e `is-dragging`); conserva origen, tamaño, modo, alineación y posición.

### Panel de edición

Al seleccionar una imagen se puede:

- alternar **Normal** / **Fondo**;
- cambiar el ancho entre 20 % y 100 %;
- alinear una imagen normal a izquierda, centro, derecha o ancho completo;
- subirla o bajarla en el flujo de la nota;
- borrarla.

Una imagen de fondo usa `is-background`, posición absoluta y coordenadas `left/top`. Mientras está seleccionada se puede arrastrar con ratón, lápiz o gesto táctil. El botón **Fondos 🖼️** eleva temporalmente todos los fondos para poder seleccionar los que estén debajo del texto. Ese modo y los contornos son UI transitoria: nunca se guardan en la nota.

## Autoguardado

El estado bajo el título muestra **Cambios pendientes · autoguardado en breve**,
**Autoguardando…** o **Guardado automáticamente**, además del conteo de palabras.

Se programa un guardado silencioso 1.5 segundos después del último cambio en:

- título o cuerpo;
- formato, color automático o color explícito;
- tablas, versículos y diccionario;
- inserción, tamaño, modo, alineación, orden, posición o borrado de imágenes.

También se fuerza un guardado al pulsar **Volver**, al perder el foco de la ventana, al ocultarse la aplicación y al desmontarse la vista por navegación lateral. Los guardados concurrentes se encolan: si el contenido cambia mientras hay una escritura en curso, el cambio nuevo no se marca como guardado ni se descarta. Un autoguardado fallido se mantiene pendiente y se reintenta después de 1.5 segundos.

Una nota nueva completamente vacía no se crea por accidente. Si ya tiene texto o imagen, el autoguardado puede crearla con el título provisional **Sin título**; el botón Guardar exige un título visible, igual que móvil. Tras el primer guardado se conserva el id creado para actualizar la misma nota y evitar duplicados.

## Archivos principales

- `src/pages/notes/NoteEditorView.tsx`: toolbar, panel de imagen y ciclo de guardado.
- `src/components/notes/TablePickerDialog.tsx`: dimensiones, encabezado y vista previa de tabla.
- `src/lib/noteEditorBlocks.ts`: HTML compatible, migración, selección y arrastre.
- `src/styles/globals.css`: color semántico e imágenes normales/de fondo.
- `src/lib/notePreferences.ts`: fuentes y colores favoritos locales.

## Verificación mínima

```bash
cd desktop
npm run check
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

Prueba funcional recomendada: crear una nota, insertar una tabla 4×5 con encabezado,
editar una celda, añadir/quitar una fila y columna, esperar el estado **Guardado
automáticamente**, cerrar y volver a abrir. Completar también la prueba de color
Auto e imágenes normales/de fondo y confirmar la interoperabilidad con móvil.
