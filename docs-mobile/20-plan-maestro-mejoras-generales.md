# Plan maestro de mejoras generales

Este documento funciona como bitacora viva para las mejoras grandes de la app movil. La idea es que cada bloque tenga estado visible, prioridad y notas de implementacion para continuar sin perder contexto.

## Estado general

| Estado | Area | Objetivo | Notas |
|--------|------|----------|-------|
| Hecho | Notas profesionales | Convertir Notas en una herramienta general, util aunque no sea solo para estudio biblico. | Busqueda, libretas, acciones rapidas, mover notas, fijar notas, compartir, insertar versiculos y referencias. |
| Hecho | Lector biblico | Mejorar la lectura visual y la accion sobre versiculos. | Controles de tamano, densidad, alineacion, progreso del capitulo, seleccion y accesos a compartir, notas, referencias e imagenes. |
| Hecho | Imagen del versiculo | Hacer mas util la generacion visual de versiculos. | Presets visuales, mejor jerarquia y composicion editable desde el creador. |
| Hecho | Fuentes tipograficas | Corregir la aplicacion real de fuentes descargadas en el editor. | El editor WebView carga fuentes dinamicas y conserva mejor la seleccion al aplicar formato. |
| Hecho | Descargas offline | Hacer visible la descarga de Biblias y datos auxiliares. | Pantalla dedicada, acceso desde Biblia y lector, cola persistida y reanudacion dentro de la app. |
| Hecho | Continuidad de lectura | Recordar preferencias del lector y mostrar "Continuar lectura" en Inicio. | Implementado con almacenamiento local y verificado con TypeScript. |
| En curso | Busqueda universal | Unificar busqueda de Biblia, notas, devocionales, diccionario y referencias. | Ya prioriza resultados locales/offline; faltan referencias cruzadas e historial de busqueda. |
| En curso | Centro de inicio configurable | Hacer que Inicio sea mas personal y menos estatico. | Acciones rapidas activables/desactivables ya disponibles; falta reordenar modulos completos (recientes, plan, favoritos). |
| En curso | Sincronizacion visible | Mostrar estado claro de guardado, offline y pendientes de sincronizar. | Ya hay indicador de estado offline y contador de notas pendientes; falta reintento automatico de sincronizacion al recuperar conexion. |
| Pendiente | Compartir unificado | Crear una experiencia consistente para compartir versiculos, notas, devocionales e imagenes. | Reusar formato, creditos, version biblica y acciones del sistema. |
| Pendiente | Onboarding ligero | Explicar en pocos pasos las funciones principales sin bloquear. | Enfocado en Biblia offline, notas, imagenes y busqueda. |

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
| Hecho | Verificar TypeScript. | `npx tsc --noEmit` pasa correctamente en `mobile`. |
| Pendiente | Historial local de busqueda. | Guardar ultimas busquedas sin depender de internet. |
| Pendiente | Filtros por contexto. | Buscar solo en Biblia actual, notas, libreta, libro o version. |
| Pendiente | Prueba manual mobile. | Verificar resultados con y sin Biblia/diccionario descargados, y navegacion desde cada tipo de resultado. |

## Fase 2 - Busqueda y navegacion

Prioridad alta/media porque conecta las secciones existentes.

| Estado | Mejora | Alcance |
|--------|--------|---------|
| En curso | Busqueda universal | Una barra para Biblia, notas, devocionales y diccionario. Referencias y filtros por contexto quedan para una siguiente vuelta. |
| Pendiente | Resultados agrupados | Separar por tipo con acciones rapidas: abrir, copiar, insertar, compartir. |
| Pendiente | Historial local de busqueda | Mantener ultimas busquedas sin depender de internet. |
| Pendiente | Filtros por contexto | Buscar solo en Biblia actual, notas, libreta, libro o version. |

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
| En curso | Sincronizacion de notas | Contador de notas/libretas pendientes de subir ya visible; falta cola explicita de reintento automatico cuando vuelve la conexion. |

## Fase 4 - Pulido visual y accesibilidad

Prioridad media para que la app se sienta mas profesional y comoda.

| Estado | Mejora | Alcance |
|--------|--------|---------|
| Hecho | Lector mas configurable | Tamano, densidad, alineacion y progreso del capitulo. |
| Pendiente | Temas de lectura | Claro, sepia, noche y alto contraste. |
| Pendiente | Preferencias globales | Centralizar tamano de texto, tema y comportamiento de lectura. |
| Pendiente | Estados vacios consistentes | Mensajes y acciones claras cuando no hay datos, notas o descargas. |
| Pendiente | Revision mobile fina | Ajustar espaciados, textos largos y botones en pantallas pequenas. |

## Fase 5 - Compartir y creacion

Prioridad media porque aumenta el valor fuera de la app.

| Estado | Mejora | Alcance |
|--------|--------|---------|
| Hecho | Imagenes de versiculos mejoradas | Presets y composicion mas cuidada. |
| Pendiente | Plantillas guardadas | Guardar estilo favorito para imagenes. |
| Pendiente | Compartir desde cualquier seccion | Unificar acciones desde lector, nota, devocional y favoritos. |
| Pendiente | Exportar notas | Compartir nota como texto, imagen o documento simple. |

## Riesgos y decisiones

- La descarga en segundo plano actual continua mientras la app esta abierta o vuelve a primer plano; no es todavia un servicio nativo persistente si Android mata el proceso.
- El estado del lector se guarda localmente, no en cuenta de usuario. Es suficiente para continuidad en el mismo dispositivo.
- Las mejoras grandes deben seguir documentandose aqui antes o durante la implementacion para evitar perder decisiones.

## Como actualizar este plan

- Mover tareas de `Pendiente` a `En curso` cuando se empiecen.
- Marcar `Hecho` solo despues de compilar o probar la parte afectada.
- Anotar limitaciones reales, no solo lo ideal.
- Crear un documento especifico cuando una fase crezca demasiado para este plan maestro.
