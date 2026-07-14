# 21 — Inserción y edición de imágenes en notas

Documentación de la funcionalidad para insertar imágenes en las notas, con soporte para redimensionamiento, alineación y cambio de posición en el editor enriquecido (julio 2026).

---

## 1. Diseño y Arquitectura

La funcionalidad sigue un flujo híbrido entre **React Native** (para el hardware y la red) y la **WebView** (para la manipulación del DOM enriquecido).

```text
┌────────────────────────┐                    ┌────────────────────────┐
│  React Native (App)    │                    │  WebView (Editor)      │
├────────────────────────┤                    ├────────────────────────┤
│ 1. Recibe 'openImage'  │ ◄─ [postMessage] ──│ Click en 🖼️ en toolbar │
│ 2. Abre ImagePicker    │                    │                        │
│ 3. Sube a /api/upload  │                    │                        │
│    (o base64 si offline)                    │                        │
│ 4. Envía URL al editor │ ── [handleAction]─►│ Inserta imagen en DOM  │
│                        │                    │ Click en img abre panel│
│                        │                    │ de edición (flotante)  │
└────────────────────────┘                    └────────────────────────┘
```

---

## 2. Flujo de Inserción (Galería + Subida + Fallback Offline)

Cuando el usuario hace clic en el botón de **Imagen (🖼️)** en la barra de herramientas del editor:

1. **Permiso y Selección:** Se solicitan permisos para acceder a la galería del dispositivo (`expo-image-picker`). Si se conceden, se abre el selector.
2. **Subida a Servidor (Online):** Si el dispositivo cuenta con conexión a internet, se sube el archivo al backend usando `api.uploadImage`. La nota inserta la URL **pública y absoluta** `api.getPublicUploadUrl(filename)` → `https://biblia2.dvguzman.com/uploads/<filename>` (ver §9: la URL `/api/media/:id` que devuelve el upload no sirve para el WebView), lo cual mantiene la nota pequeña y rápida de sincronizar.
3. **Conversión a Base64 (Offline/Fallo):** Si el dispositivo está offline o la subida al servidor falla, se lee el archivo local en formato base64 con `expo-file-system` y se inserta como un Data URI (`data:image/jpeg;base64,...`). De este modo, la app es **100% funcional offline**.
4. **Inserción de Bloque HTML:** Se inserta el bloque HTML en la posición del cursor (por defecto en modo Normal):
   ```html
   <div class="note-image-block" style="text-align: center; width: 60%; max-width: 100%; display: block; margin: 12px auto;">
     <img src="[URL]" style="width: 100%; height: auto; border-radius: 8px;" />
   </div>
   <p><br></p>
   ```

---

## 3. Panel de Edición Interactivo (WebView)

Al tocar cualquier imagen dentro del editor en modo de edición:

1. **Modo Edición de Fondos:** Para las imágenes que actúan de fondo (`z-index: -1`), para seleccionarlas se debe pulsar el botón **Fondos 🖼️** en la barra de herramientas. Esto asigna temporalmente `z-index: 10` a las imágenes de fondo, permitiendo que capten toques.
2. **Auto-envoltura (Compatibilidad):** Si la imagen no está dentro de un contenedor `.note-image-block`, el editor la envuelve automáticamente al hacer tap para permitir su edición.
3. **Panel inferior móvil:** Al tocar una imagen, se muestra `#image-edit-panel`. La imagen seleccionada obtiene un borde primario.
4. **Modo edición de imagen:** El WebView activa `body.image-editing`, oculta temporalmente la toolbar, hace `blur()` del editor y desactiva el teclado.
5. **Funcionalidades del Panel (Modo Híbrido):**
   - **Modo (Normal / Fondo):** Permite alternar entre el comportamiento estándar de bloque (Normal) y un posicionamiento absoluto detrás del texto (Fondo).
   - **Modo Normal:**
     - **Alineación:** Izquierda (float), Centro (block), Derecha (float), 100%.
     - **Reordenar (Subir/Bajar):** Intercambia la posición de la imagen con los bloques de texto adyacentes.
   - **Modo Fondo:**
     - Al convertirse a fondo, la imagen **conserva su coordenada visual exacta** relativa al texto para evitar saltos.
     - **Drag & Drop (Arrastrar):** La imagen se desacopla del texto y el usuario puede mantener presionada la imagen para arrastrarla libremente por la nota sin colisionar con las letras. (Las opciones de alinear y subir/bajar se ocultan).
   - **Cambiar tamaño (Ancho):** Un deslizador (`range` slider) permite redimensionar el ancho de la imagen (20% al 100%).
   - **Borrar:** Elimina la imagen del documento y cierra el panel.

---

## 4. Deshacer y Rehacer (Historial Unificado por Instantáneas)

**Antes (roto con imágenes):** los botones **Deshacer (↶) / Rehacer (↷)** caían en el `default` de `runToolbarAction` → `document.execCommand('undo'/'redo')`. El historial nativo del WebView **solo registra lo hecho con `execCommand`** (tecleo, `insertHTML`, `formatBlock`). Todas las ediciones de imagen mutan el DOM directamente (`style.width`, `setAlign`, `setMode`, `insertBefore`, `style.left/top` al arrastrar, `.remove()`), así que el undo nativo las ignoraba: por eso "no funcionaban" con imágenes (o revertían un cambio de texto no relacionado y desincronizaban el estado).

**Ahora (julio 2026):** `mobile/lib/editorHtml.ts` implementa un **historial propio por instantáneas de `editor.innerHTML`** que cubre texto **e** imágenes por igual:

- `undoStack` / `redoStack` + `lastSnapshot`; `HISTORY_LIMIT = 50` pasos (se descarta el más antiguo).
- `commitHistory()` fija un paso (ignora instantáneas idénticas). Se llama en cada operación discreta: formato/heading/tamaño de texto, insertar imagen/versículo/referencias/diccionario, y toda edición del panel de imagen (tamaño al soltar el slider, modo, alineación, subir/bajar, borrar, arrastrar al soltar).
- `scheduleHistory()` agrupa las ráfagas de tecleo en un solo paso tras 350 ms de inactividad (listener `input`).
- `recordImageChange()` = `notifyChangeNow()` + `commitHistory()` para las ediciones de imagen (sincroniza el host al momento y fija el paso).
- `performUndo()` / `performRedo()` restauran la instantánea con `applyHistorySnapshot()`, que limpia el chrome de edición, reasigna `innerHTML`, reinicia bloques (`initTableBlocks`) y notifica al host. Los botones `undo`/`redo` de la toolbar llaman a estas funciones (ramas nuevas en `runToolbarAction`).
- `updateContent` (contenido nuevo desde el host) reinicia el historial (`lastSnapshot`, `undoStack`, `redoStack` vacíos).

> Coste: cada paso guarda el HTML completo; con imágenes **base64** grandes cada instantánea pesa, de ahí el límite de 50 pasos y el descarte de instantáneas idénticas. Las imágenes subidas (`/uploads/`) son URLs cortas y no tienen este coste.

---

## 4. Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| [`mobile/lib/editorHtml.ts`](file:///home/david/proyectos/BibliaAPP/mobile/lib/editorHtml.ts) | Estilos CSS para el bloque de imagen y panel inferior; Botón 🖼️ en toolbar HTML; Lógica JS de envoltura, selección, modo edición, slider, alineación y subir/bajar elementos. |
| [`mobile/app/note/[noteId].tsx`](file:///home/david/proyectos/BibliaAPP/mobile/app/note/[noteId].tsx) | Importaciones de `ImagePicker` y `api`; Receptor de `openImagePicker` e `imageEditMode` en `onWebViewMessage`; Método `handleImagePick()` con flujo de permisos, selección, subida y fallback offline a base64; bloqueo temporal del teclado al editar imágenes. |

---

## 5. Regresión: toolbar y colores “desaparecidos”

Síntoma: tras meter el panel de imágenes, en notas **no funcionaba ningún botón de la toolbar**, no se abría el selector de fuentes y la fila de colores quedaba vacía (HTML del `#colors-row` sin dots).

Causa: `getEditorHtml` construye el HTML/JS del WebView dentro de un **template literal** de TypeScript. El panel usaba:

```js
].join('\n');
```

En el template, `\n` se interpreta al generar el string y el JS embebido queda así:

```js
].join('
');
```

Eso es un `SyntaxError`. Como todo el editor vive en un único `<script>`, **falla el parseo completo**: no se enlazan los `.tb`, no corre `renderColors()` y `window.handleAction` tampoco existe.

Fix (julio 2026):

```js
].join('\\n');
```

Regla: cualquier escape pensado para el JS del WebView (`\n`, `\u200B`, `\'`, etc.) debe escribirse con la barra extra (`\\n`, `\\u200B`, …) dentro del template de `editorHtml.ts`.

Comprobación rápida:

```bash
cd mobile
npx tsx -e '/* generar getEditorHtml y */ node --check /tmp/editor_out.js'
```

---

## 6. Pruebas Manuales Recomendadas

1. **Insertar Imagen Online:** Abre una nota, pulsa `🖼️`, selecciona una foto. Verifica que se inserta correctamente y que la URL generada corresponde al servidor.
2. **Insertar Imagen Offline:** Desactiva el internet en el emulador o dispositivo, pulsa `🖼️` y selecciona una foto. Verifica que se inserta utilizando base64 y se ve perfectamente.
3. **Redimensionar:** Toca la imagen para abrir el panel de edición, arrastra el slider. Verifica que el tamaño cambia en vivo y se actualiza la etiqueta de porcentaje.
4. **Teclado y toolbar:** Al tocar la imagen, verifica que el teclado se cierra, no vuelve a abrirse mientras el panel está activo y la toolbar del editor queda oculta hasta cerrar el panel o tocar fuera.
5. **Cambiar Alineación:** Pulsa "Izquierda" o "Derecha". Verifica que el texto que rodea a la imagen fluye por el lado opuesto al de la imagen.
6. **Mover en el Documento:** Escribe varios párrafos de texto. Inserta una imagen. Selecciónala y pulsa `Subir` o `Bajar`. Verifica que la imagen se desplaza entre los párrafos de texto.
7. **Borrar:** Pulsa el botón `Borrar`. Verifica que el bloque de la imagen desaparece y el panel se cierra.
8. **Persistencia:** Guarda la nota, sal de la pantalla y vuelve a entrar. Verifica que la imagen conserva su alineación, posición y ancho previamente establecidos.

---

## 7. Corrección: guardado y parpadeo del panel de imágenes

Síntomas:

- Al insertar una imagen, pulsar **Guardar** y salir, la imagen podía no quedar persistida.
- El panel inferior de edición de imagen parpadeaba al mostrarse o al redimensionar.

Causas:

- `requestEditorHtml()` tenía un fallback de `450ms`. Con imágenes grandes o base64, el WebView puede tardar más en responder con `editor.innerHTML`; si ganaba el fallback, se guardaba el estado React anterior, sin la imagen recién insertada.
- Las ediciones de imagen usaban `notifyChange()` con debounce, así que el estado React podía quedar momentáneamente atrasado.
- El panel fijo ya no necesita reposicionarse durante cada evento de scroll; hacerlo provocaba reajustes visuales repetidos.
- En modo online, `repoUpdateNotebookNote()` subía al servidor y luego reemplazaba SQLite con `getNotebookNote()`. Si la respuesta remota no traía exactamente el mismo HTML, la copia local podía perder el `<img>`.
- El backend guardaba `bible_notebook_notes.content` como `TEXT`; una imagen base64 puede superar ese límite.

Fix:

- El fallback de `getHtml` en `mobile/app/note/[noteId].tsx` sube a `5000ms`.
- Las inserciones y ediciones de imagen usan `notifyChangeNow()` para sincronizar el HTML inmediatamente.
- Antes de responder a `getHtml`, el WebView limpia el estado visual de edición (`outline`, panel y `imageEditMode`) para no guardar estilos temporales.
- Se elimina el reajuste continuo del panel durante `scroll`; `keepImageVisible()` queda solo para apertura y cambios que realmente mueven la imagen.
- `repoCreateNotebookNote()` y `repoUpdateNotebookNote()` ahora son local-first: guardan primero el HTML exacto del editor en SQLite y luego intentan sincronizar.
- `ensureDbTables()` cambia `bible_notebook_notes.content` a `MEDIUMTEXT` para soportar notas con imágenes embebidas.

---

## 8. Corrección: al reabrir la nota se perdía la imagen y todo lo posterior

Síntoma (julio 2026): insertar una imagen, pulsar **Guardar**, salir y volver a entrar → la nota aparece **sin la imagen y sin todo lo escrito después de ella**. Si el usuario seguía editando, esa versión vieja se guardaba encima y la pérdida era permanente.

Causa: el guardado sí era local-first (SQLite quedaba correcto y `dirty = 1` si el push al servidor fallaba — típico con imágenes base64 grandes: límite de body del proxy, timeout, etc.). Pero al reabrir, `repoGetNotebookNote()` en `mobile/lib/repo.ts` hacía `api.getNotebookNote()` y devolvía **la copia del servidor directamente** al editor. `upsertNoteFromServer()` protegía la fila local dirty (no la pisaba), pero el valor devuelto era la versión vieja del servidor: la anterior a insertar la imagen. El editor cargaba ese HTML viejo, y el siguiente guardado (manual o autoguardado) sobrescribía la copia local buena.

Fix: tras el upsert, `repoGetNotebookNote()` **relee SQLite** (`getLocalNote`) y devuelve esa fila. Como `upsertNoteFromServer()` ya implementa la política de merge (gana la copia dirty o la más nueva), releer la fila local devuelve siempre la versión ganadora: la del servidor si es más nueva y no hay cambios pendientes, o la local con la imagen si el push aún no se ha logrado (se reintentará en el próximo `syncAll`).

Regla general: cualquier `repoGet*` que devuelva datos al usuario debe responder con la fila SQLite **después** del merge, nunca con la respuesta cruda del servidor.

---

## 9. Corrección: URL de imagen subida — pública y absoluta

Síntoma (julio 2026): al insertar una imagen con conexión, la subida a `/api/upload` funcionaba pero la imagen **no se veía** en el editor del móvil, así que en la práctica solo "funcionaba" el fallback base64 (notas gigantes, ver §7/§8).

Causas (dos fallos de contrato con la API web):

1. `/api/upload` devuelve `url: "/api/media/<id>"` — una URL **relativa**. El WebView del móvil carga el HTML por `srcDoc` sin `baseUrl`, así que `src="/api/media/9"` no resuelve contra ningún host.
2. Aunque se prefijara el host, `GET /api/media/:id` exige sesión (`getSession` + `canViewMedia`), y el `<img>` del WebView no manda ni cookie ni Bearer → 403.

Fix:

- `mobile/lib/api.ts`: `uploadImage()` tipa también `filename` en la respuesta, y se añade `getPublicUploadUrl(filename)` → `${API_BASE_URL}/uploads/<filename>` (absoluta y **sin auth**: `public/uploads/` lo sirve Next estáticamente y el middleware solo cubre `/api/*`).
- `mobile/app/note/[noteId].tsx` (`handleImagePick`): inserta `api.getPublicUploadUrl(uploadRes.filename)`; si el servidor no devuelve `filename`, cae al fallback base64 como antes.
- La web inserta el equivalente `${window.location.origin}/uploads/<filename>` (ver §10), así la misma nota se ve igual en web, móvil y escritorio.

Nota de privacidad: las imágenes de notas quedan accesibles para quien tenga la URL exacta (nombre `crypto.randomUUID()`, no adivinable). Es el mismo nivel de exposición que ya tenía la ruta estática `/uploads/` de Next.

---

## 10. Paridad web: editor de imágenes portado a la versión web

La función de imágenes existía solo en `mobile/lib/editorHtml.ts`; el editor web (`lib/note-editor-html.ts`, usado por `components/note-rich-editor.tsx` en un `<iframe srcDoc>`) no tenía nada, rompiendo la paridad del doc 12. Port (julio 2026):

- **`lib/note-editor-html.ts`** — copiado 1:1 del móvil, adaptado al host web (`postToHost` en vez de `window.ReactNativeWebView.postMessage`):
  - CSS de `.note-image-block` y `#image-edit-panel` (el panel lleva `max-width: 420px; margin: 0 auto` para pantallas de escritorio).
  - Botón `🖼️` (`data-action="insertImage"`) en la toolbar → postea `{ type: 'openImagePicker' }` al host.
  - Panel de edición completo: slider de ancho 20–100%, modos **Normal/Fondo**, alineación (izq./centro/der./100%), subir/bajar y borrar; `body.image-editing` oculta la toolbar y bloquea `contenteditable`.
  - Acción etiquetada **Insertar imagen** además del icono 🖼️, para que la función sea visible en escritorio y móvil web.
  - Botón **Fondos 🖼️** y selección de fondos con `z-index: 10 !important`; el fallback geométrico encuentra la imagen aun con texto encima.
  - Arrastre unificado con Pointer Events (mouse, touch y lápiz), posición acotada al editor e indicador visual durante el gesto.
  - Bloques atómicos (`contenteditable="false"`, `draggable="false"`) normalizados al cargar o actualizar contenido, y animación FLIP al usar Subir/Bajar.
  - Auto-envoltura al hacer clic en un `<img>` suelto (notas del móvil o antiguas) en `.note-image-block`.
  - `notifyChangeNow()` (sin debounce) para inserciones/ediciones de imagen; `getHtml` limpia el estado visual (`clearImageEditingChrome`) y vacía el debounce antes de responder — mismas garantías que §7.
  - `insertHtmlAtSelection` con fallback al final de la nota si no hay selección (el foco se pierde al abrir el diálogo de archivos).
  - Aplica la regla de escapes del §5: `join('\\n')` con barra doble dentro del template.
- **`components/note-rich-editor.tsx`**:
  - Mensaje `openImagePicker` → dispara un `<input type="file" accept="image/*">` oculto.
  - Sube con `POST /api/upload` (FormData + `Authorization: Bearer` desde `localStorage.biblia_token`, como el resto de la web), inserta `${origin}/uploads/<filename>` vía `handleAction insertImage`, con indicador "Subiendo imagen...".
  - El timeout de `requestEditorHtml` sube de 500ms a 5000ms (mismo motivo que §7: notas con imágenes tardan más en cruzar el `postMessage`).

Pruebas manuales web: insertar imagen desde el botón etiquetado, redimensionar/alinear/mover/borrar desde el panel; convertirla en Fondo, activar **Fondos 🖼️** y arrastrarla aunque haya texto encima; guardar, recargar y verificar persistencia; abrir en el móvil la misma nota y comprobar que se ve idéntica (y viceversa).

Documentación web detallada: [`docs/notas-web-paridad-movil.md`](../docs/notas-web-paridad-movil.md) (sección *Inserción y edición de imágenes*). La web usa Pointer Events para el arrastre y no expone Deshacer/Rehacer de imágenes.

## 11. Corrección: teclado se abría al tocar la imagen

Síntoma (julio 2026): Al tocar una imagen para modificarla (moverla o escalarla abriendo el panel inferior), el teclado virtual del móvil se desplegaba, e inmediatamente se cerraba o se quedaba abierto, generando una experiencia visual errática.

Causa: El toque del usuario (eventos `touchstart` y `mousedown`) dentro del área general del editor (`contenteditable="true"`) causaba que el navegador o WebView enfocara el editor automáticamente antes de que se ejecutara la lógica del panel inferior (la cual pone `contenteditable="false"` y hace `blur()`). Esto provocaba la aparición inminente del teclado, el cual no siempre era cancelado correctamente por el `Keyboard.dismiss()` desde React Native.

Fix:
- El contenedor `.note-image-block` generado ahora incluye la propiedad `contenteditable="false"` estáticamente en su HTML. Esto convierte al bloque de la imagen en un elemento "atómico" dentro del editor, previniendo que los toques sobre él originen un cambio de foco en el editor subyacente.
- Se añadió un listener para `mousedown` en el editor que detecta toques sobre elementos `IMG` e invoca `e.preventDefault()`, interceptando el enfoque automático de raíz antes de mostrar el panel.
- Al cargar el editor (`initTableBlocks`), las imágenes o notas previamente guardadas sin esta propiedad son actualizadas dinámicamente mediante `querySelectorAll` para aplicarles `contenteditable="false"`.

Archivos modificados:
- `mobile/lib/editorHtml.ts` (función `buildImageBlockHtml` y listeners de inicialización en el tag `<script>`).

---

## 12. Mejora: movimiento de imágenes más fluido (julio 2026)

Síntoma: mover imágenes se sentía **torpe**, tanto en modo **Fondo** (arrastrar) como en **Normal** (Subir/Bajar), sin respuesta visual y con saltos secos.

Cambios en `mobile/lib/editorHtml.ts`:

- **Arrastrar (modo Fondo):** al empezar el gesto la imagen recibe la clase `.is-dragging` (sombra, opacidad, `z-index` alto para flotar sobre el texto, `will-change: left/top` y sin transición) y `body.image-dragging` desactiva la selección de texto. Se añadió `touchcancel` además de `touchend` para cerrar el gesto de forma robusta. El cursor pasa a `grab`/`grabbing`. El `preventDefault` en `touchmove` ya evitaba el scroll de la página durante el arrastre.
- **Sin salto al convertir a Fondo:** antes se aplicaba `.is-background` antes de leer la posición visual, y el cambio a `position:absolute` podía recalcular `offsetLeft/offsetTop`. Ahora se mide el rectángulo actual contra el scroll del editor antes de cambiar el modo y se guarda `left/top` ya acotado al área editable.
- **Movimiento más estable:** los `touchmove` se agrupan con `requestAnimationFrame`; solo se escribe `left/top` una vez por frame, se limita la imagen dentro del contenido del editor y solo se registra historial al soltar si realmente hubo desplazamiento.
- **Bloque atómico:** las imágenes nuevas se insertan con `contenteditable="false"` y `draggable="false"`; las notas antiguas se normalizan al cargar, al restaurar undo/redo y al recibir contenido nuevo desde React Native. Esto evita foco accidental del editor y reduce aperturas del teclado al tocar o arrastrar.
- **Subir/Bajar (modo Normal):** el reordenamiento ahora usa una animación **FLIP** (`animateReorder`): mide la posición del bloque antes y después de `insertBefore` y anima la diferencia con `transform` (0.22 s), en vez del salto instantáneo. La imagen "se desliza" a su nueva posición.
- Todas estas operaciones pasan por `recordImageChange()`, así que además quedan cubiertas por el historial de Deshacer/Rehacer (ver §4).

CSS nuevo: `.note-image-block { transition: ... transform 0.22s ease; }`, `.note-image-block.is-dragging { ... }`, `body.image-dragging { user-select: none; }` y `cursor: grab` sobre los fondos seleccionables.

---

## 13. Corrección: seleccionar y arrastrar fondos era errático (julio 2026)

Síntomas: con una imagen en modo **Fondo** bajo texto, era casi imposible seleccionarla aun con el modo **Fondos 🖼️** activo; el arrastre "a veces funcionaba y a veces no", sin patrón aparente.

Tres causas encontradas en `mobile/lib/editorHtml.ts`:

1. **El z-index inline ganaba al CSS del modo selección.** `setMode('bg')` guarda `style.zIndex = '-1'` inline (necesario para que la nota se renderice igual fuera del editor). La regla `body.image-selection-mode .note-image-block.is-background { z-index: 10 }` no llevaba `!important`, y un estilo inline siempre gana a una regla CSS sin `!important`. Resultado: la imagen seguía en `z-index: -1` para el hit-testing y los toques los capturaban los párrafos que la cubrían (las cajas de un `<p>` ocupan todo el ancho, no solo su texto). Solo funcionaba tocando huecos sin ningún bloque encima — de ahí lo errático. **Fix:** `z-index: 10 !important` en las reglas de `image-selection-mode` / `image-editing`, y `#editor .note-image-block.is-dragging` para que el `z-index: 60 !important` del arrastre siga ganando por especificidad.

2. **Detección por `e.target` frágil → detección geométrica.** Aunque el z-index se corrija, cualquier elemento superpuesto (tablas, bloques de versículo con z-index propio) puede robar el toque. El `touchstart` ahora tiene fallback por coordenadas: si `e.target.closest('.note-image-block')` no da un fondo, `findBackgroundBlockAt(x, y)` recorre los `.note-image-block.is-background` y compara el punto contra `getBoundingClientRect()` con un margen de tolerancia de 14 px (`DRAG_SLOP`, ayuda con imágenes pequeñas). Prioridad: la imagen ya seleccionada; si no, la última del DOM cuyo rect contenga el punto. Con el panel abierto sobre un fondo (fuera del modo selección), el toque dentro del rect de la imagen activa también inicia arrastre. Tocar un fondo aún no seleccionado lo selecciona y permite arrastrar en el mismo gesto.

3. **Los listeners de arrastre no existían hasta abrir el panel una vez.** `touchstart/touchmove/touchend` del arrastre se registran dentro de `createPanel()`, que solo corría al seleccionar una imagen con éxito. Activar **Fondos** y tocar la imagen directamente no hacía nada la primera vez. **Fix:** `toggleImageSelectionMode()` llama a `createPanel()` (queda oculto) al activar el modo.

Prueba manual: nota con varios párrafos + imagen en modo Fondo debajo del texto → activar **Fondos 🖼️** → un toque sobre cualquier parte de la imagen (aunque haya texto encima) debe seleccionarla y permitir arrastrarla en el mismo gesto, de forma consistente.

---

## 14. Mejora: más espacio vertical — encabezado compacto y panel que no tapa (julio 2026)

Síntomas: el panel inferior de edición podía **tapar la imagen** que se estaba editando, y la tarjeta de título (título grande + estado + palabras/minutos + botón "Vista previa") robaba altura permanente a la nota.

Cambios en `mobile/app/note/[noteId].tsx`:

- **Encabezado compacto permanente:** la tarjeta de título pasa a ser una sola fila fija arriba: `TextInput` del título (17px) + punto de estado + texto de estado ("Guardando… / Guardado / N palabras") + botón de vista previa solo-icono. Se eliminan la línea de "N palabras · M min" y la hora del último guardado (`formatSaveTime`, `lastSavedAt`).
- **Modo edición de imagen a pantalla completa:** mientras `imageEditMode` está activo se oculta el header nativo (`headerShown: false`) y el encabezado se sustituye por una franja mínima "Editando imagen · toca fuera para terminar" (con `paddingTop: insets.top` para el notch). La nota gana toda esa altura y el panel inferior deja de solapar la imagen.

Cambio en `mobile/lib/editorHtml.ts`: `body.image-editing #editor { padding-bottom: 320px }` (antes 220px) para que `keepImageVisible()` siempre tenga margen para desplazar la imagen por encima del panel, incluso al final de la nota.

---

## 15. Refinamiento visual del título del editor (julio 2026)

Tras compactar el encabezado, el título compartía una sola línea con el estado y el botón de vista previa, por lo que quedaba comprimido y se percibía como otro control de la toolbar.

En `mobile/app/note/[noteId].tsx` el encabezado conserva una altura reducida, pero recupera jerarquía de documento:

- El título y el estado forman ahora un bloque de dos niveles; el botón de vista previa permanece alineado a la derecha.
- El título usa 20 px, peso 700 y un espaciado ligeramente cerrado, con el placeholder más descriptivo `Título de la nota`.
- El estado se muestra debajo con un indicador de 6 px y tipografía secundaria de 11 px.
- El botón de vista previa aumenta a 36 × 36 px para equilibrar visualmente el encabezado y conservar un área táctil cómoda.

Este cambio es exclusivamente de presentación; no modifica el guardado, la vista previa ni el flujo de inserción y edición de imágenes.
