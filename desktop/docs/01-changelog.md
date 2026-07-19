# 01 — Changelog

Registro cronológico de cambios en `desktop/`. Lo más reciente arriba.

---

## 2026-07-19 — v0.3.3: robustez offline y paquete Arch

- Las vistas principales usan un contenedor fluido, centrado y de hasta 1536 px para aprovechar mejor ventanas amplias.
- Navegación, acciones, estados vacíos y controles del lector/editor usan SVG locales uniformes en lugar de emojis dependientes del sistema.
- La Biblia predeterminada sin red prioriza una traducción realmente descargada.
- Libretas y notas muestran el estado local, incluso si está vacío, cuando la API no responde.
- Las sincronizaciones concurrentes esperan la misma operación y ya no duplican el envío de notas/libretas.
- El contador de cambios pendientes incluye notas, libretas, subrayados, favoritos y notas de versículo.
- La sincronización completa guarda todos los subrayados en SQLite para Inicio y Perfil offline.
- Los datos privados SQLite quedan asociados a la cuenta cacheada y se limpian al cambiar de usuario.
- Inicio conserva localmente el nombre de iglesia y el último versículo del día disponible.
- Paquete Arch verificable `bibliaapp-desktop-0.3.3-1-x86_64.pkg.tar.zst`.

## 2026-07-19 — v0.3.2: paridad completa del editor de notas

### Color y formato

- Color **Auto** semántico mediante `note-color-auto`, adaptable a cualquier tema sin guardar negro/blanco fijo
- Escritura con cursor colapsado para colores y tamaños; deshacer/rehacer, H1/H2 y seleccionar todo

### Imágenes

- Formato `note-image-block` compatible con móvil y migración automática del bloque usado por desktop 0.3.1
- Modos **Normal** y **Fondo**, ancho 20–100 %, alineación, ancho completo, orden y borrado
- Selección específica de fondos y arrastre libre con ratón, toque o lápiz
- Serialización limpia que preserva tamaño, modo y posición, pero no guarda contornos ni estados transitorios

### Autoguardado

- Cobertura de título, contenido, formato y todas las mutaciones de imágenes
- Cola para cambios producidos durante un guardado y reintento silencioso tras error
- Guardado final al volver, perder foco, ocultar la app o abandonar el editor desde otra sección
- Protección contra notas vacías y duplicados después de crear una nota nueva

Detalle: [13-editor-notas.md](./13-editor-notas.md).

## 2026-07-19 — v0.3.1: cierre de paridad avanzada

### Notas y libretas

- Autoguardado a los cuatro segundos, estado de guardado y conteo de palabras
- Tipografía persistente por nota y paleta de colores personalizable
- Imágenes desde archivo, subida autenticada o fallback local; bloques seleccionables y redimensionables
- Portadas de libreta con Unsplash, búsqueda, URL, archivo propio y gradientes

### Calendario, devocionales y navegación

- Recuperación de contraseña desde la pantalla de acceso
- Calendario completo con eventos de iglesia/grupo, RSVP y CRUD administrativo
- Lectura detallada, compartir y apertura de pasaje desde el diario devocional
- Accesos rápidos, métricas y rutas protegidos también por `allowedSections`
- Comunidad y Grupos desactivados por defecto en la variante pública
- Búsqueda universal y mapa arcoíris resuelven la Biblia predeterminada del catálogo autorizado

Detalle: [12-paridad-mobile-2026-07.md](./12-paridad-mobile-2026-07.md).

## 2026-07-19 — v0.3.0: paridad con móvil 3.9.5

### Navegación e Inicio

- Búsqueda universal con filtros e historial
- Inicio con continuar lectura, contenido reciente, anuncios, eventos y métricas
- Acciones rápidas configurables y onboarding descartable
- Navegación y subpestañas filtradas por `allowedSections`

### Lectura, estudio y notas

- Preferencias persistentes de fuente, densidad, alineación y tema del lector
- Planes de lectura con progreso y calendario
- Actividad, estadísticas y listado de subrayados
- Compartir uniforme, exportación PDF y estilo favorito de imágenes
- Estados vacíos comunes y contador de cambios pendientes

### Apariencia, administración y legal

- Ocho temas generales y DVG/UBG exclusivos para administradores
- Gestión de usuarios, roles y permisos por sección
- Aceptación legal obligatoria para cuentas pendientes
- Información legal, atribuciones y eliminación de cuenta
- Restricciones de licencia, migración `capabilities_json` y purga de descargas sin permiso

Detalle: [12-paridad-mobile-2026-07.md](./12-paridad-mobile-2026-07.md).

## 2026-06-28 — Diccionario Strong y referencias cruzadas

### Añadido

- Pestañas **Referencias** y **Diccionario** en Biblia
- `ReferencesExplorer`, `StrongDictionary`, `CrossReferencesModal`
- Botón **Referencias** en lector (versículo seleccionado)
- **📚 Diccionario** en editor de notas (`InsertDictionaryModal`)
- API: `getCrossReferences`, `searchDictionary`, `listDictionaries`

---

## 2026-06-28 — Fase 6: sync offline + Windows + CI

### Añadido

- **Sync offline** (paridad móvil): libretas, notas, resaltados, favoritos, notas de versículo
- `lib/sync.ts`, `notesStore.ts`, `readerStore.ts`, esquema SQLite ampliado
- `OfflineBanner`, UI migrada a `repo.*`
- **GitHub Actions** — `.github/workflows/desktop-build.yml` (Linux + Windows)
- **Windows** — `npm run pack:win`, [11-windows.md](./11-windows.md)
- Script `packaging/releases/generate-latest-json.sh`

### Empaquetado

- `bibliaapp-desktop-0.2.0-3-x86_64.pkg.tar.zst`

---

## 2026-06-28 — Notas, libretas, diario, libros + pacman pkgrel 2

### Añadido

- Pestaña **Notas** en navegación (`NotesPage`)
- **Libretas**: CRUD, portadas, editor de notas
- **Diario espiritual** (devotionals)
- **Libros de estudio** + bitácora de lectura
- API completa notebooks / devotionals / external-books

### Empaquetado

- `bibliaapp-desktop-0.2.0-2-x86_64.pkg.tar.zst`

---

## 2026-06-28 — v0.2.0: favoritos, auto-update, Debian

### Añadido

- **Favoritos** — `FavoritesPage`, API, botón ♥ en lector
- **Auto-update** — `tauri-plugin-updater`, `lib/updater.ts`, Perfil → Buscar actualizaciones
- **Debian** — target `deb`, `npm run pack:deb`, [09-debian-linux.md](./09-debian-linux.md)
- [10-auto-update.md](./10-auto-update.md), plantilla `packaging/releases/latest.json.example`
- Regla Cursor [`.cursor/rules/desktop.mdc`](../../.cursor/rules/desktop.mdc)

### Cambiado

- Versión **0.2.0** (package.json, Cargo, tauri.conf)
- `tauri.conf.json`: targets `appimage` + `deb`, updater configurado
- Documentación actualizada (README, 06-funcionalidades, índice docs)

### Notas

- Resaltados y notas en lector ya estaban implementados
- Clave privada de updater **no** va al repo; ver 10-auto-update.md
- Servidor `latest.json` en producción pendiente de despliegue

---

## 2026-06-28 — Fase 5: detalle de grupo, comentarios feed, notificaciones SSE

### Añadido

- **GroupDetailPage** — oración, calendario, actividad del grupo
- **FeedPostCard** — comentarios expandibles en el feed
- **NotificationBell** — campana en barra lateral con lista de notificaciones
- **notificationStream.ts** — SSE con `Authorization: Bearer` (fetch, no EventSource)
- API: `getGroup`, `getGroupPrayers`, `getGroupEvents`, `getGroupPosts`, `joinPrayerIntercession`
- API: `getFeedComments`, `addFeedComment`, `getNotifications`, `markNotificationsRead`

### Cambiado

- **GroupsPage** — clic en grupo abre detalle; soporte `openGroup` desde notificaciones
- **App.tsx** — navegación feed/grupos desde notificaciones

---

## 2026-06-28 — Imagen de fondo en versículo del día

### Cambiado

- **VerseOfDayCard** usa `backgroundImage` de `/api/verse-of-the-day`
- Respaldo vía `/api/unsplash` (misma lógica que web/móvil) si la API no trae URL
- Diseño 3:4 con overlay, alineado con la web

### Añadido

- `src/lib/resolveVerseBackground.ts`, `src/lib/verseThemeUnsplash.ts`

---

## 2026-06-28 — Documentación completa

### Añadido

- **05-arquitectura.md** — stack, carpetas, flujos OAuth y offline
- **06-funcionalidades.md** — pantallas y comportamiento por sección
- **07-api-y-offline.md** — endpoints, SQLite, sesión
- **08-backend-desktop.md** — cambios OAuth en el servidor Next.js

### Actualizado

- **README.md** (raíz `desktop/`) — índice, instalación Arch, v0.1.0
- **03-desarrollo.md** — OAuth localhost, SQLite, comandos `pack:arch` / `icons`
- **02-progreso-plan.md** — fases 0–5 al día
- **PLAN.md** — checkboxes y sección de estado actual
- **docs/README.md** — índice central

---

## 2026-06-28 — Búsqueda bíblica + offline SQLite + pacman pkgrel 2

### Añadido

- **Búsqueda** (`src/components/BibleSearch.tsx`): pestaña Biblia → Buscar.
  - Online: `GET /api/search?bible=&q=`
  - Offline: `LIKE` en tabla `verses` si la versión está descargada
- **Offline SQLite** (`tauri-plugin-sql`):
  - `src/lib/offline/db.ts` — esquema y helpers
  - `src/lib/offline/bibleStore.ts` — descarga/eliminación de versiones
  - `src/lib/repo.ts` — capa unificada online/offline
- **Descargas** (`src/pages/DownloadsPage.tsx`): pestaña Biblia → Descargas
- Script **`npm run pack:arch`**: iconos + build + `.pkg.tar.zst`
- Paquete: `packaging/arch/bibliaapp-desktop-0.1.0-2-x86_64.pkg.tar.zst`

### Cambiado

- `BibleReader` usa `repo.repoListBibles`, `repoGetVerses`, etc.
- `BiblePage` con sub-pestañas: Lector | Buscar | Descargas
- `App.tsx` inicializa SQLite con `initOffline()` al login

### Dependencias

- `@tauri-apps/plugin-sql`
- `tauri-plugin-sql` (Rust, feature `sqlite`)

---

## 2026-06-27 — Fase 3: pantallas núcleo + navegación

### Añadido

- **AppLayout** — barra lateral (Inicio, Biblia, Comunidad, Grupos, Perfil)
- **HomePage** — versículo del día, accesos rápidos
- **BibleReader** — versión, libro, capítulo, versículos
- **FeedPage** — feed siguiendo/explorar, publicar, like
- **GroupsPage** — listado, unirse por código
- **ProfilePage** — datos de cuenta
- API ampliada: feed, grupos, biblia

### Eliminado

- `DashboardPage.tsx` (reemplazado por HomePage + AppLayout)

---

## 2026-06-27 — Google OAuth localhost + logo web

### Problema resuelto

- En Hyprland/Firefox, `bibliaapp://` mostraba **Load failed** y abría segunda instancia

### Solución

- OAuth por **localhost**: servidor Rust en `127.0.0.1:<puerto>` recibe el token
- Backend: plataforma `desktop` en `lib/google-oauth.ts` (`?desktop=1&port=…`)
- Comando Rust `start_google_oauth_listener`
- `tauri-plugin-single-instance` + feature `deep-link`

### Logo

- Script `npm run icons` desde `public/logo.png` de la web
- Login e iconos del sistema actualizados

---

## 2026-06-27 — Inicialización + login + dashboard

### Añadido

- Scaffold **Tauri v2 + React 19 + Vite + Tailwind 4**
- Login email/password + Google (primera versión con deep link)
- Persistencia sesión (`tauri-plugin-store`): token + usuario
- Dashboard MVP: versículo del día, datos de cuenta
- Empaquetado Arch: AppImage, PKGBUILD, `build-pacman-pkg.sh`
- Primera compilación: `BibliaAPP_0.1.0_amd64.AppImage`
- Paquete inicial: `bibliaapp-desktop-0.1.0-1-x86_64.pkg.tar.zst`

### Documentación

- `PLAN.md`, `docs/` inicial
