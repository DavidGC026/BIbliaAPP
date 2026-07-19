# 06 — Funcionalidades por pantalla

## Login (`LoginPage`)

| Función            | Detalle                                                      |
| ------------------ | ------------------------------------------------------------ |
| Email / contraseña | `POST /api/auth/login`                                       |
| Google             | OAuth localhost (ver [03-desarrollo.md](./03-desarrollo.md)) |
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
- Navegación: Inicio, Biblia, Comunidad, Grupos, Perfil
- **Notificaciones** 🔔 (SSE + polling)
- Indicador “Sin conexión”
- Cerrar sesión

---

## Notas (`NotesPage`)

Pestañas: **Libretas** | **Diario** | **Libros** | **Planes**

### Libretas

- Crear / editar / eliminar libretas con portadas de gradiente
- Notas por libreta (título + contenido; compatible con HTML de la web)
- Botón **📚 Diccionario** en el editor para insertar entradas Strong
- **Offline:** SQLite + `syncAll()` al reconectar (como móvil)
- Capa: `repo.repoListNotebooks`, `repoCreateNotebook`, etc.

### Diario espiritual

- Entradas con emoción, versículo, reflexión y aplicación
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
