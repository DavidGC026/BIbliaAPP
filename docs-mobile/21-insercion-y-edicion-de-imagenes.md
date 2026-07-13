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
4. **Inserción de Bloque HTML:** Se inserta el bloque HTML en la posición del cursor:
   ```html
   <div class="note-image-block" style="text-align: center; width: 60%; max-width: 100%; display: block; margin: 12px auto;">
     <img src="[URL]" style="width: 100%; height: auto; border-radius: 8px;" />
   </div>
   <p><br></p>
   ```

---

## 3. Panel de Edición Interactivo (WebView)

Al tocar cualquier imagen dentro del editor en modo de edición:

1. **Auto-envoltura (Compatibilidad):** Si la imagen no está dentro de un contenedor `.note-image-block` (por ejemplo, porque la nota proviene de la web o de una versión anterior), el editor la envuelve automáticamente al hacer tap para permitir su edición.
2. **Panel inferior móvil:** Se crea y muestra `#image-edit-panel` como panel fijo inferior, con controles táctiles estables para tamaño, alineación, movimiento y borrado.
3. **Resaltado Visual:** La imagen seleccionada obtiene un borde de marca (`outline`) de `2px solid` con el color primario del tema activo.
4. **Modo edición de imagen:** El WebView activa `body.image-editing`, oculta temporalmente la toolbar, hace `blur()` del editor y cambia `contenteditable` a `false` para bloquear el teclado mientras se edita la imagen. Además envía `{ type: 'imageEditMode', active }` a React Native, que ejecuta `Keyboard.dismiss()` y desactiva temporalmente el input del título.
5. **Funcionalidades del Panel:**
   - **Cambiar tamaño (Ancho):** Un deslizador (`range` slider) permite redimensionar el ancho del bloque de la imagen del `20%` al `100%` en tiempo real.
   - **Alineación y Ajuste de Texto (Float/Block):**
     - **Izquierda:** Flota la imagen a la izquierda (`float: left`) y permite que el texto fluya por el lado derecho.
     - **Centro:** Bloque centrado estándar (`margin: 12px auto`), sin texto flotando a los lados.
     - **Derecha:** Flota la imagen a la derecha (`float: right`) y permite que el texto fluya por el lado izquierdo.
     - **Completo:** Ajusta el ancho al 100% de la pantalla y fuerza visualización de bloque.
   - **Mover (Reordenar en el Documento):**
     - **▲ Subir:** Intercambia la posición en el DOM del bloque de la imagen con su elemento anterior (`previousElementSibling`), permitiendo mover la imagen a través del texto block-a-block.
     - **▼ Bajar:** Intercambia la posición con su elemento siguiente (`nextElementSibling.nextElementSibling`), moviendo la imagen hacia abajo.
   - **Borrar:** Elimina el bloque de la imagen del documento y cierra el panel.

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
  - Panel de edición completo: slider de ancho 20–100%, alineación (izq./centro/der./100%), subir/bajar, borrar; `body.image-editing` oculta la toolbar y bloquea `contenteditable`.
  - Auto-envoltura al hacer clic en un `<img>` suelto (notas del móvil o antiguas) en `.note-image-block`.
  - `notifyChangeNow()` (sin debounce) para inserciones/ediciones de imagen; `getHtml` limpia el estado visual (`clearImageEditingChrome`) y vacía el debounce antes de responder — mismas garantías que §7.
  - `insertHtmlAtSelection` con fallback al final de la nota si no hay selección (el foco se pierde al abrir el diálogo de archivos).
  - Aplica la regla de escapes del §5: `join('\\n')` con barra doble dentro del template.
- **`components/note-rich-editor.tsx`**:
  - Mensaje `openImagePicker` → dispara un `<input type="file" accept="image/*">` oculto.
  - Sube con `POST /api/upload` (FormData + `Authorization: Bearer` desde `localStorage.biblia_token`, como el resto de la web), inserta `${origin}/uploads/<filename>` vía `handleAction insertImage`, con indicador "Subiendo imagen...".
  - El timeout de `requestEditorHtml` sube de 500ms a 5000ms (mismo motivo que §7: notas con imágenes tardan más en cruzar el `postMessage`).

Pruebas manuales web: insertar imagen con 🖼️, redimensionar/alinear/mover/borrar desde el panel, guardar, recargar y verificar persistencia; abrir en el móvil la misma nota y comprobar que se ve idéntica (y viceversa).
