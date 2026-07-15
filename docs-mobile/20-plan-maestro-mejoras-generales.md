# Plan maestro de mejoras generales

Este documento funciona como bitacora viva para las mejoras grandes de la app movil. La idea es que cada bloque tenga estado visible, prioridad y notas de implementacion para continuar sin perder contexto.

## Estado general

| Estado | Area | Objetivo | Notas |
|--------|------|----------|-------|
| Hecho | Notas profesionales | Convertir Notas en una herramienta general, util aunque no sea solo para estudio biblico. | Busqueda, libretas, acciones rapidas, mover notas, fijar notas, compartir, insertar versiculos y referencias. |
| Hecho | Imagenes en notas | Pulir insercion, edicion y movimiento de imagenes dentro del editor enriquecido. | Modo Normal con reordenamiento animado; modo Fondo con arrastre libre sin salto inicial, movimiento por frame, historial al soltar y bloques atomicos para no abrir teclado. |
| Hecho | Lector biblico | Mejorar la lectura visual y la accion sobre versiculos. | Controles de tamano, densidad, alineacion, progreso del capitulo, seleccion y accesos a compartir, notas, referencias e imagenes. |
| Hecho | Imagen del versiculo | Hacer mas util la generacion visual de versiculos. | Presets visuales, mejor jerarquia y composicion editable desde el creador. |
| Hecho | Fuentes tipograficas | Corregir la aplicacion real de fuentes descargadas en el editor. | El editor WebView carga fuentes dinamicas y conserva mejor la seleccion al aplicar formato. |
| Hecho | Descargas offline | Hacer visible la descarga de Biblias y datos auxiliares. | Pantalla dedicada, acceso desde Biblia y lector, cola persistida y reanudacion dentro de la app. |
| Hecho | Continuidad de lectura | Recordar preferencias del lector y mostrar "Continuar lectura" en Inicio. | Implementado con almacenamiento local y verificado con TypeScript. |
| En curso | Busqueda universal | Unificar busqueda de Biblia, notas, devocionales, diccionario y referencias. | Ya prioriza resultados locales/offline; faltan referencias cruzadas e historial de busqueda. |
| En curso | Centro de inicio configurable | Hacer que Inicio sea mas personal y menos estatico. | Acciones rapidas activables/desactivables ya disponibles; falta reordenar modulos completos (recientes, plan, favoritos). |
| En curso | Sincronizacion visible | Mostrar estado claro de guardado, offline y pendientes de sincronizar. | Ya hay indicador de estado offline y contador de notas pendientes; falta reintento automatico de sincronizacion al recuperar conexion. |
| Pendiente | Compartir unificado | Crear una experiencia consistente para compartir versiculos, notas, devocionales e imagenes. | Reusar formato, creditos, version biblica y acciones del sistema. |
| Hecho | Onboarding ligero | Explicar en pocos pasos las funciones principales sin bloquear. | Tarjeta "Primeros pasos" descartable en Inicio (`components/OnboardingCard.tsx`): Biblia offline, busqueda universal, notas e imagenes de versiculos. Se oculta al omitirla y no vuelve a aparecer. |
| Hecho | Temas visuales y DVG | Adaptar toda la interfaz al ambiente de lectura con selector visual. | Nueve paletas en Perfil → Apariencia; edicion DVG solo para `role === "admin"` con `AdminThemeGuard`. Ver [25-temas-visuales-y-dvg.md](./25-temas-visuales-y-dvg.md). |

## Iteracion actual

Objetivo: mejorar la continuidad diaria de uso para que la app recuerde como estaba leyendo el usuario y le permita volver rapido desde Inicio.

| Estado | Tarea | Resultado esperado |
|--------|-------|--------------------|
| Hecho | Crear almacenamiento local para estado del lector. | `readerState` guarda preferencias visuales y ultima lectura. |
| Hecho | Persistir preferencias del lector. | Tamano de fuente, densidad y alineacion sobreviven al cerrar la app. |
| Hecho | Guardar ultima lectura. | Al cargar un capitulo, la app recuerda Biblia, libro y capitulo. |
| Hecho | Mostrar "Continuar lectura" en Inicio. | El usuario puede volver al ultimo capitulo desde la pantalla principal. |
| Hecho | Verificar TypeScript. | `npx tsc --noEmit` pasa correctamente en `mobile`. |
| Pendiente | Prueba manual mobile. | Revisar Inicio, Biblia, cambios de lectura y retorno desde "Continuar lectura". |

## Iteracion en progreso - Recientes inteligentes

Objetivo: que Inicio muestre actividad util y accionable, no solo estadisticas.

| Estado | Tarea | Resultado esperado |
|--------|-------|--------------------|
| Hecho | Notas recientes en Inicio. | Muestra hasta 3 notas editadas recientemente, con libreta, fecha y preview. |
| Hecho | Abrir nota desde Inicio. | Tocar una nota reciente abre directamente el editor. |
| Hecho | Versiculos recientes o favoritos. | Mostrar acceso rapido a ultimos versiculos guardados/subrayados. |
| Hecho | Favoritos recientes en Inicio. | Muestra hasta 3 versiculos guardados y abre el lector en el pasaje correspondiente. |
| Hecho | Subrayados recientes. | Muestra hasta 3 versiculos subrayados y abre el lector en el pasaje correspondiente. |
| Hecho | Devocionales recientes mejor conectados. | El bloque evita repetir el devocional destacado y muestra un estado vacio mas claro. |
| Hecho | Verificar TypeScript. | `npx tsc --noEmit` pasa correctamente en `mobile`. |
| Pendiente | Prueba manual mobile. | Revisar que Inicio no quede demasiado largo en pantallas pequenas. |

## Iteracion en progreso - Acciones rapidas configurables

Objetivo: permitir elegir que tarjetas de "Acciones rapidas" se muestran en Inicio, y sumar accesos a descargas e imagen de versiculo.

| Estado | Tarea | Resultado esperado |
|--------|-------|--------------------|
| Hecho | Catalogo de acciones. | `lib/homeActions.ts` define las 9 acciones disponibles (incluye descargas e imagen de versiculo) con icono, titulo y descripcion. |
| Hecho | Persistencia de preferencia. | `getHomeActions`/`saveHomeActions` guardan la seleccion en `SecureStore`, con fallback a un set por defecto. |
| Hecho | Pantalla de personalizacion. | `app/customize-home.tsx` permite activar/desactivar cada accion con un switch (minimo una activa). |
| Hecho | Inicio dinamico. | `(tabs)/index.tsx` renderiza las tarjetas segun la preferencia guardada y recarga al volver a la pantalla. |
| Hecho | Acceso desde Perfil e Inicio. | Enlace "Personalizar" en la seccion de Inicio y fila en Perfil > Mi Biblia. |
| Hecho | Verificar TypeScript. | `npx tsc --noEmit` pasa correctamente en `mobile`. |
| Pendiente | Prueba manual mobile. | Activar/desactivar acciones, confirmar orden y navegacion (incluye flujo de imagen de versiculo, que guia al lector). |

## Iteracion en progreso - Recordatorios utiles

Objetivo: recordar al usuario acciones pendientes (racha, devocional, descargas) con control explicito por tipo.

| Estado | Tarea | Resultado esperado |
|--------|-------|--------------------|
| Hecho | Preferencia de recordatorios. | `lib/reminderPreferences.ts` guarda en `SecureStore` que tipos de recordatorio estan activos (racha, devocional, descargas), por defecto los tres activos. |
| Hecho | Recordatorio de devocional pendiente. | `lib/localNotifications.ts` programa una notificacion local a las 21:00 si el usuario no escribio devocional hoy y el recordatorio esta activo. |
| Hecho | Recordatorio de descargas incompletas. | Se programa una notificacion si hay tareas de descarga en estado `error` en `offlineDownloadManager`, respetando la preferencia del usuario. |
| Hecho | Racha de lectura controlable. | El recordatorio de racha (20:00) ahora tambien respeta la preferencia del usuario, ademas de requerir sesion y racha activa. |
| Hecho | Navegacion desde notificacion. | Tocar el recordatorio de devocional abre `/devotional/new`; el de descargas abre `/downloads`. |
| Hecho | Pantalla de control. | `components/ReminderSettings.tsx` agrega switches por tipo de recordatorio en Perfil. |
| Hecho | Verificar TypeScript. | `npx tsc --noEmit` pasa correctamente en `mobile`. |
| Pendiente | Prueba manual mobile. | Verificar permisos de notificaciones, disparo real de cada recordatorio y navegacion al tocarlas (requiere dispositivo/emulador). |

## Fase 1 - Continuidad y uso diario

Prioridad alta porque reduce friccion en acciones frecuentes.

| Estado | Mejora | Alcance |
|--------|--------|---------|
| Hecho | Continuar lectura | Tarjeta en Inicio, persistencia local y navegacion directa al lector. |
| Hecho | Recientes inteligentes | Mostrar ultimas notas editadas, versiculos seleccionados y devocionales abiertos. |
| En curso | Acciones rapidas configurables | Permitir elegir accesos del Inicio: nueva nota, buscar, descargas, imagen de versiculo. |
| En curso | Recordatorios utiles | Lectura diaria, devocional pendiente y descargas incompletas, con control del usuario. |

## Iteracion en progreso - Busqueda universal

Objetivo: una sola pantalla de busqueda que combine Biblia, notas, devocionales y diccionario, priorizando datos locales/offline.

| Estado | Tarea | Resultado esperado |
|--------|-------|--------------------|
| Hecho | Busqueda local de versiculos. | `searchLocalVerses` en `offline/bibleStore.ts` busca con `LIKE` sobre la tabla `verses` cuando la Biblia esta descargada; `repoSearchVerses` cae a la API solo si no hay copia local y hay conexion. |
| Hecho | Busqueda local de notas. | `repoSearchNotes` filtra titulo y contenido (HTML limpio) de todas las notas ya sincronizadas en SQLite. |
| Hecho | Busqueda de devocionales. | Filtro en cliente sobre `api.listDevotionals()` por titulo, pasaje y contenido (sin cache offline todavia). |
| Hecho | Busqueda de diccionario. | Reusa `repoSearchDictionary`, que ya prioriza el diccionario descargado. |
| Hecho | Pantalla unificada. | `app/search.tsx` agrupa resultados por tipo (Biblia, Notas, Devocionales, Diccionario) con acceso directo a cada resultado y enlace "Ver mas" a la seccion completa. |
| Hecho | Acceso desde Inicio. | Nueva accion rapida "Busqueda universal" en `lib/homeActions.ts`, activada por defecto junto al buscador biblico existente. |
| Hecho | Historial local de busqueda. | `lib/searchHistory.ts` guarda las ultimas 10 busquedas en `SecureStore`; se muestran como chips cuando el campo esta vacio, con opcion de quitar una o borrar todo. |
| Hecho | Filtros por contexto (por tipo). | Chips "Biblia / Notas / Devocionales / Diccionario" permiten desactivar categorias completas antes de buscar; al menos una queda siempre activa. Filtrar por libro/libreta especifica queda pendiente. |
| Hecho | Verificar TypeScript. | `npx tsc --noEmit` pasa correctamente en `mobile`. |
| Pendiente | Filtro por libro o libreta especifica. | Acotar la busqueda de Biblia a un libro/capitulo actual, o de notas a una libreta puntual. |
| Pendiente | Prueba manual mobile. | Verificar resultados con y sin Biblia/diccionario descargados, historial, filtros por chip y navegacion desde cada tipo de resultado. |

## Fase 2 - Busqueda y navegacion

Prioridad alta/media porque conecta las secciones existentes.

| Estado | Mejora | Alcance |
|--------|--------|---------|
| En curso | Busqueda universal | Biblia, notas, devocionales y diccionario, con filtros por tipo e historial local. Referencias cruzadas y filtro por libro/libreta especifica quedan pendientes. |
| Pendiente | Resultados agrupados | Ya separados por tipo; faltan acciones rapidas extra (copiar, insertar, compartir) sobre cada resultado. |
| Hecho | Historial local de busqueda | Ultimas 10 busquedas guardadas localmente, visibles como chips reutilizables. |
| Hecho | Filtros por contexto | Chips para acotar la busqueda por tipo (Biblia, notas, devocionales, diccionario). Falta acotar por libro/libreta especifica. |

## Iteracion en progreso - Estado offline y sincronizacion visibles

Objetivo: que el usuario vea de un vistazo si sus datos offline estan listos, descargandose o fallidos, y si tiene notas sin sincronizar.

| Estado | Tarea | Resultado esperado |
|--------|-------|--------------------|
| Hecho | Resumen de estado offline. | `summarizeOfflineDownloads` en `offlineDownloadManager.ts` agrega las tareas en `idle` / `syncing` / `error` con conteos. |
| Hecho | Indicador visual unico. | `components/OfflineStatusBadge.tsx` muestra "Contenido offline listo", "Descargando… N pendientes" o "N descargas fallidas"; se usa en Descargas y en la fila de Perfil. |
| Hecho | Reintentos mas claros. | En `app/downloads.tsx` el boton cambia a "Reintentar" cuando la tarea quedo en `error`, en vez de repetir "Descargar" de forma ambigua. |
| Hecho | Notas pendientes de sincronizar. | `repoCountPendingSync` cuenta notas/libretas locales con `dirty = 1`; `components/SyncStatusBadge.tsx` lo muestra en la pantalla de Notas. |
| Hecho | Verificar TypeScript. | `npx tsc --noEmit` pasa correctamente en `mobile`. |
| Pendiente | Prueba manual mobile. | Forzar una descarga fallida (sin red) y confirmar el badge de error y el boton "Reintentar"; verificar el contador de notas pendientes editando offline. |

## Fase 3 - Offline y sincronizacion

Prioridad media, pero importante para confianza.

| Estado | Mejora | Alcance |
|--------|--------|---------|
| Hecho | Descargas mas visibles | Accesos desde Biblia, lector y pantalla dedicada. |
| Hecho | Cola de descargas | Tareas persistidas y reanudadas al abrir la app. |
| Hecho | Estado global offline | Indicador unico de que datos estan listos, pendientes o fallidos (`OfflineStatusBadge`). |
| Hecho | Reintentos controlados | Boton "Reintentar" con mensaje de error visible por tarea fallida. |
| Hecho | Sincronizacion de notas | Contador de notas/libretas pendientes visible; el reintento automatico al recuperar conexion ya existia en `NetworkContext` (`syncAll()` se dispara solo al reconectar). |

## Iteracion en progreso - Temas de lectura

Objetivo: que el lector biblico tenga su propio tema visual, independiente del tema global de la app.

| Estado | Tarea | Resultado esperado |
|--------|-------|--------------------|
| Hecho | Paletas del lector. | `lib/readerState.ts` define `ReaderTheme` (`auto`, claro, sepia, noche, alto contraste) con paleta completa: fondo, texto, tarjetas, bordes y acento propio por tema. |
| Hecho | Persistencia. | El tema se guarda junto con tamano, densidad y alineacion en las preferencias del lector. |
| Hecho | Aplicacion en el lector. | Fondo, texto de versiculos, encabezado del capitulo, barra de progreso, numero de versiculo, seleccion y pastilla "Nota" usan la paleta activa; los subrayados usan la variante clara/oscura segun el tema del lector. |
| Hecho | Selector en ajustes de lectura. | Fila "Tema" en el modal de ajustes con muestras visuales de cada paleta y vista previa en vivo. |
| Hecho | Verificar TypeScript. | `npx tsc --noEmit` pasa correctamente en `mobile`. |
| Pendiente | Prueba manual mobile. | Revisar cada tema con subrayados de todos los colores, seleccion de versiculos y modo invitado; validar contraste en pantalla real. |

Decision: el "chrome" del lector (pastillas del encabezado, barra de acciones, modales) mantiene el tema global de la app; solo la superficie de lectura cambia con el tema del lector.

## Fase 4 - Pulido visual y accesibilidad

Prioridad media para que la app se sienta mas profesional y comoda.

| Estado | Mejora | Alcance |
|--------|--------|---------|
| Hecho | Lector mas configurable | Tamano, densidad, alineacion y progreso del capitulo. |
| Hecho | Temas de lectura | Auto, claro, sepia, noche y alto contraste, con selector en ajustes de lectura. |
| Pendiente | Preferencias globales | Centralizar tamano de texto, tema y comportamiento de lectura. |
| Hecho | Estados vacios consistentes | Componente `ui/EmptyState` (tarjeta punteada con emoji, titulo, mensaje y accion opcional) aplicado a eventos, notificaciones, feed y grupos; distingue error de vacio real. Las pantallas nuevas deben usarlo. |
| Pendiente | Revision mobile fina | Ajustar espaciados, textos largos y botones en pantallas pequenas. Requiere dispositivo. |

## Iteracion en progreso - Compartir unificado

Objetivo: que compartir un versiculo, nota o devocional tenga el mismo formato y credito desde cualquier seccion.

| Estado | Tarea | Resultado esperado |
|--------|-------|--------------------|
| Hecho | Modulo unico de compartir. | `lib/share.ts` centraliza el formato: `shareVerse` (cita + referencia + version + enlace), `shareNote` (titulo + texto plano + credito) y `shareDevotional` (titulo, pasaje, reflexion, aplicacion); `safeShare` ignora la cancelacion del usuario. |
| Hecho | Versiculo del dia. | `VerseOfDayCard` usa el formato unificado en lugar de su mensaje propio. |
| Hecho | Lector biblico. | El compartir de seleccion pasa por `safeShare` y conserva su enlace directo al pasaje web. |
| Hecho | Favoritos y subrayados. | Boton de compartir por versiculo en `FavoritesPanel` y `HighlightsPanel`. |
| Hecho | Notas. | Compartir desde la lista de la libreta y tambien desde el encabezado del editor de nota (exporta como texto plano). |
| Hecho | Devocionales. | Boton de compartir en el encabezado de la pantalla de lectura del devocional. |
| Hecho | Verificar TypeScript. | `npx tsc --noEmit` pasa correctamente en `mobile`. |
| Pendiente | Prueba manual mobile. | Probar la hoja de compartir del sistema desde cada seccion y revisar el formato final del texto. |

## Fase 5 - Compartir y creacion

Prioridad media porque aumenta el valor fuera de la app.

| Estado | Mejora | Alcance |
|--------|--------|---------|
| Hecho | Imagenes de versiculos mejoradas | Presets y composicion mas cuidada. |
| Hecho | Plantillas guardadas | Boton "Guardar como mi estilo" en el creador persiste formato, diseno y color (`lib/verseImageTemplate.ts`) y se aplican al abrir de nuevo. El tamano de letra no se guarda porque se auto-ajusta al largo del versiculo. |
| Hecho | Compartir desde cualquier seccion | Formato unificado desde lector, versiculo del dia, favoritos, subrayados, notas y devocionales (`lib/share.ts`). |
| Hecho | Exportar notas | Al compartir una nota (editor o lista) se elige texto plano o PDF. `lib/noteExport.ts` usa `expo-print` y conserva el formato HTML del editor, con titulo, fecha y credito. Exportar como imagen queda descartado por ahora (el PDF cubre el caso documento). |

## Iteracion en progreso - Fuentes por nota y busqueda de Google Fonts

Objetivo: que la fuente elegida para una nota sobreviva al guardar y salir, y que la busqueda de fuentes no falle por mayusculas.

| Estado | Tarea | Resultado esperado |
|--------|-------|--------------------|
| Hecho | Persistir la fuente por nota. | La fuente de toda la nota se aplica como estilo del contenedor del editor (no queda en el HTML guardado), asi que ahora se guarda en `SecureStore` con clave `NOTE_FONT_<id>` (`getNoteFont`/`saveNoteFont` en `lib/fontManager.ts`). Se restaura al abrir la nota, se asigna al id real tras el primer guardado de una nota nueva y se limpia al eliminar la nota. |
| Hecho | Vista previa con la fuente activa. | `NoteContent` acepta prop `font` y el editor se la pasa, para que la vista previa use la misma tipografia. |
| Hecho | Busqueda tolerante a mayusculas. | La API `css?family=` de Google es sensible a mayusculas ("lobster" → 400). `fetchGoogleFont` prueba el texto tal cual y luego con cada palabra capitalizada, y devuelve el nombre canonico de la familia parseado del CSS, con lo que el id coincide con `POPULAR_FONTS` y descargas previas (antes "playfair display" creaba un duplicado `playfairdisplay`). |
| Hecho | Buscar una fuente ya registrada la selecciona. | Antes solo mostraba una alerta "Info"; ahora la descarga si falta y la aplica. |
| Hecho | Corregir etiqueta "Defect (Sans)". | Ahora se muestra "Predeterminada (Sans)". |
| Hecho | Verificar TypeScript. | `npx tsc --noEmit` pasa correctamente en `mobile`. |
| Hecho | Regresion toolbar/colores (imagenes). | El panel de edicion de imagenes en `editorHtml.ts` usaba `.join('\n')` dentro del template literal de TypeScript. Eso convertia `\n` en un salto de linea real en el JS del WebView (`].join('` + newline + `');`), provocaba `SyntaxError` y tumba **todo** el script: toolbar muerta, fila de colores vacia y modal de fuentes sin abrir. Fix: `.join('\\n')`. Ver doc 21. |
| Pendiente | Prueba manual mobile. | Cambiar fuente sin seleccion, guardar, salir y reabrir; buscar "lobster" en minusculas; buscar una fuente ya descargada; confirmar dots de color y botones B/I/U tras el fix. |

### Como integrar la fuente por nota

1. Al abrir nota existente: `getNoteFont(id)` → `setActiveFont` **antes** de montar el WebView (`loading` sigue true hasta que termina).
2. `getEditorHtml(..., activeFont, base64Fonts, false, favoriteColors)` solo se construye una vez (`initialHtmlRef`); cambios posteriores van por `sendToEditor({ type: 'setFont' | 'loadFonts' })`.
3. Al elegir fuente en `FontSelectorModal`: `saveNoteFont(realId, fontName)` + `setFont` al editor. Si la nota es nueva y aun no tiene id, se guarda en el primer `repoCreateNotebookNote`.
4. Al borrar nota: `deleteNoteFont(id)`.

Limitaciones anotadas:

- La preferencia de fuente por nota es local al dispositivo (SecureStore), no viaja con la cuenta ni aparece en la web.
- La exportacion a PDF y el texto compartido usan el HTML guardado, asi que la fuente de toda la nota no se aplica ahi (los tramos con fuente aplicada sobre texto seleccionado si, porque quedan como `<font face>` en el HTML).
- Nombres con siglas ("PT Sans", "EB Garamond") siguen requiriendo las siglas en mayusculas: la capitalizacion automatica solo cubre la primera letra de cada palabra.
- Cualquier string JS embebido en el template de `getEditorHtml` debe escapar `\\n`, `\\uXXXX`, backticks y `${` o el WebView deja de ejecutar la toolbar entera.

## Riesgos y decisiones

- `expo-print` es un modulo nativo nuevo: funciona en Expo Go, pero el APK release necesita recompilarse (ver doc 13) para que la exportacion a PDF este disponible.
- La descarga en segundo plano actual continua mientras la app esta abierta o vuelve a primer plano; no es todavia un servicio nativo persistente si Android mata el proceso.
- El estado del lector se guarda localmente, no en cuenta de usuario. Es suficiente para continuidad en el mismo dispositivo.
- Las mejoras grandes deben seguir documentandose aqui antes o durante la implementacion para evitar perder decisiones.

## Como actualizar este plan

- Mover tareas de `Pendiente` a `En curso` cuando se empiecen.
- Marcar `Hecho` solo despues de compilar o probar la parte afectada.
- Anotar limitaciones reales, no solo lo ideal.
- Crear un documento especifico cuando una fase crezca demasiado para este plan maestro.
