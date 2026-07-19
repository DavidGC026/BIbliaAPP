# 06 — Funcionalidades por pantalla

## Layout

- **Barra lateral** fija (`AppLayout`); el área de contenido ocupa el resto del ancho.
- **Vistas principales** (Inicio, Biblia, Notas, Comunidad, Grupos, Calendario, Búsqueda, administración de usuarios, etc.) usan `.desktop-page`: ancho fluido, centrado, hasta **1536 px** (`96rem`).
- **Perfil**, **Legal** y los **formularios administrativos** de edición conservan contenedores más estrechos (`max-w-3xl` / `max-w-4xl`) para legibilidad.
- Modales y login mantienen anchos propios (`max-w-md`–`max-w-xl`).

Convención para desarrolladores: [03-desarrollo.md](./03-desarrollo.md#layout-de-pantallas).

---

## Login (`LoginPage`)

| Función            | Detalle                                                      |
| ------------------ | ------------------------------------------------------------ |
| Email / contraseña | `POST /api/auth/login`                                       |
| Google             | OAuth localhost (ver [03-desarrollo.md](./03-desarrollo.md)) |
| Recuperar acceso   | `POST /api/auth/forgot-password`                             |
| Logo               | `/logo.png` (mismo que la web)                               |

Requiere conexión para el primer login. Tras eso la sesión persiste offline.

---

## Inicio (`HomePage`)

- Saludo con nombre y nombre de iglesia (`/api/church-settings`)
- **Versículo del día** con imagen de fondo (API + Unsplash)
- Botón “Leer en la Biblia”
- Accesos rápidos: Juan 3, Salmo 23
- Continuar desde el último capítulo
- Notas, favoritos y subrayados recientes
- Anuncios, próximos eventos y métricas personales
- Acciones rápidas configurables y onboarding descartable
- Accesos y contenido filtrados por permisos de sección

---

## Biblia (`BiblePage`)

Tres sub-pestañas: **Lector** | **Buscar** | **Referencias** | **Diccionario** | **Descargas**

### Lector (`BibleReader`)

- Selector de **versión**, **libro**, **capítulo** (‹ ›)
- Versículos con numeración; clic / Shift+clic para seleccionar
- **Resaltados** (colores) — online u offline (sync al reconectar)
- **Notas** por versículo — online u offline
- **Favoritos** — añadir selección; sync offline
- **Copiar** y **crear imagen** del texto seleccionado
- **Referencias** en barra de selección → modal de referencias cruzadas
- Funciona **offline** para lectura si la versión está descargada
- Preferencias de tamaño, densidad, alineación y cinco temas de lectura
- Restricciones de licencia para copiar, compartir e imágenes

### Referencias (`ReferencesExplorer`)

- Selector versión / libro / capítulo / versículo
- Lista referencias cruzadas (`GET /api/references`)
- Clic abre el pasaje en el lector

### Diccionario (`StrongDictionary`)

- Búsqueda por código Strong (G25, H430) o palabra (agapao, shalom)
- Filtro griego / hebreo, exploración paginada
- API: `/api/dictionary`

### Buscar (`BibleSearch`)

- Online: `GET /api/search`
- Offline: SQLite si versión descargada

### Descargas (`DownloadsPage`)

- Descargar / eliminar versiones completas en SQLite
- Las versiones sin `canDownload` se muestran como «solo en línea»

---

## Comunidad (`FeedPage`)

| Función                   | API                    |
| ------------------------- | ---------------------- |
| Feed Siguiendo / Explorar | `GET /api/feed?type=`  |
| Publicar                  | `POST /api/feed/posts` |
| Like / unlike             | `POST/DELETE …/like`   |
| Comentarios               | `GET/POST …/comments`  |

---

## Grupos (`GroupsPage`)

| Función           | API                            |
| ----------------- | ------------------------------ |
| Listar grupos     | `GET /api/groups`              |
| Unirse por código | `POST /api/groups/join`        |
| Detalle           | Oración, calendario, actividad |

**GroupDetailPage:** peticiones de oración (interceder), eventos, publicaciones del grupo.

---

## Calendario (`EventsPage`)

- Eventos combinados de iglesia y grupos
- Confirmación **Voy / Tal vez / No puedo** en eventos de iglesia
- Creación y eliminación de eventos para administradores
- Ubicación, categoría, descripción y recuento de confirmados

---

## Perfil (`ProfilePage`)

- Datos de cuenta, racha, estado de sesión
- **Mis favoritos** → `FavoritesPage`
- **Buscar actualizaciones** (Tauri updater) — ver [10-auto-update.md](./10-auto-update.md)
- Cerrar sesión en barra lateral
- Diez temas visuales (DVG/UBG solo admin)
- Recordatorios de racha, devocional y descargas
- Actividad, estadísticas, subrayados, legal y administración

---

## Favoritos (`FavoritesPage`)

- Lista vía `repoListFavorites()` (SQLite offline o API)
- Abrir en lector / eliminar

---

## Barra lateral (`AppLayout`)

- Logo + iglesia
- Navegación: Inicio, Biblia, Búsqueda, Notas, Comunidad, Grupos, Calendario, Perfil
- **Notificaciones** 🔔 (SSE + polling)
- Indicador “Sin conexión”
- Cerrar sesión

---

## Notas (`NotesPage`)

Pestañas: **Libretas** | **Diario** | **Libros** | **Planes**

### Libretas

- Crear / editar / eliminar libretas con gradientes, Unsplash, URL o archivo propio
- Notas por libreta (título + contenido; compatible con HTML de la web)
- Botón **📚 Diccionario** en el editor para insertar entradas Strong
- Autoguardado a 4 s con cola, reintento y guardado al abandonar la vista
- Conteo de palabras, tipografía por nota, colores favoritos y **Auto** adaptable al tema
- Imágenes subidas o locales en modo normal/fondo, con tamaño, alineación, orden y arrastre libre
- Compartir y exportar mediante el diálogo PDF del sistema
- **Offline:** SQLite + `syncAll()` al reconectar (como móvil)
- Capa: `repo.repoListNotebooks`, `repoCreateNotebook`, etc.

Comportamiento y formato interoperable: [13-editor-notas.md](./13-editor-notas.md).

### Diario espiritual

- Entradas con emoción, versículo, reflexión y aplicación
- Vista de lectura, compartir y apertura del pasaje en la Biblia
- API: `/api/devotionals`

### Libros de estudio

- Biblioteca de libros externos + bitácora de lectura
- API: `/api/external-books`

### Lector bíblico (notas de versículo)

- Notas por versículo y resaltados — `repo.*` con sync offline

### Planes de lectura

- Unirse a planes, abrir la siguiente lectura y marcar días
- Porcentaje, barra de progreso y calendario completo

## Búsqueda universal (`UniversalSearchPage`)

- Biblia, notas, devocionales y Strong en una consulta
- Filtros, debounce e historial de diez búsquedas
- Abre directamente el capítulo o la nota encontrada

## Administración y legal

- `AdminUsersPage`: cuentas, roles y permisos por sección (solo admin)
- `LegalPage`: políticas, ayuda, eliminación de cuenta y licencias bíblicas
- `LegalAcceptanceGate`: bloquea cuentas con `legalAcceptedAt === null` hasta aceptar

---
