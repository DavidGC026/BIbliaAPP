# 07 — API y capa offline

## Configuración

```typescript
// src/lib/config.ts
VITE_API_URL  → default https://biblia2.dvguzman.com
DEFAULT_BIBLE_ID = 149  // fallback local si la API no responde
```

`GET /api/bibles` devuelve `defaultBibleId` por iglesia. El lector, búsqueda, referencias y versículo del día usan ese valor y solo recurren a `DEFAULT_BIBLE_ID` si la API falla o no envía preferencia.

Todas las peticiones autenticadas llevan:

```http
Authorization: Bearer <token>
```

---

## Endpoints usados por el desktop

### Auth

| Método | Ruta                                | Uso                       |
| ------ | ----------------------------------- | ------------------------- |
| POST   | `/api/auth/login`                   | Login email               |
| POST   | `/api/auth/logout`                  | Cerrar sesión             |
| GET    | `/api/auth/me`                      | Perfil / revalidar sesión |
| GET    | `/api/auth/google?desktop=1&port=N` | Inicio OAuth Google       |

### Biblia (públicos o con token)

| Método   | Ruta                                             | Uso                          |
| -------- | ------------------------------------------------ | ---------------------------- |
| GET      | `/api/verse-of-the-day`                          | Inicio                       |
| GET      | `/api/bibles`                                    | Versiones + `defaultBibleId` |
| GET      | `/api/books?bible=`                              | Libros                       |
| GET      | `/api/verses?bible=&book=&chapter=`              | Capítulo                     |
| GET      | `/api/verses/bulk?bible=&book=`                  | Descarga offline (por libro) |
| GET      | `/api/search?bible=&q=`                          | Búsqueda online              |
| GET      | `/api/references?bible=&bookId=&chapter=&verse=` | Referencias cruzadas         |
| GET      | `/api/dictionary?…`                              | Diccionario Strong           |
| GET/POST | `/api/plans`                                     | Planes y progreso            |
| GET      | `/api/highlights/all`                            | Subrayados del usuario       |

### Comunidad e iglesia

| Método      | Ruta                                | Uso               |
| ----------- | ----------------------------------- | ----------------- |
| GET         | `/api/feed?type=following\|explore` | Feed              |
| POST        | `/api/feed/posts`                   | Publicar          |
| POST/DELETE | `/api/feed/posts/:id/like`          | Like              |
| GET         | `/api/groups`                       | Grupos            |
| POST        | `/api/groups/join`                  | Unirse por código |
| GET         | `/api/church-settings`              | Nombre iglesia    |

Implementación: `src/lib/api.ts`

### Actividad, administración y legal

| Método     | Ruta                      | Uso                             |
| ---------- | ------------------------- | ------------------------------- |
| GET/POST   | `/api/activity`           | Historial y registro de lectura |
| GET        | `/api/statistics`         | Progreso por libro              |
| GET        | `/api/events`             | Calendario unificado            |
| GET        | `/api/feed/announcements` | Anuncios oficiales              |
| POST       | `/api/legal/accept`       | Aceptación legal                |
| GET/POST   | `/api/admin/users`        | Usuarios administrados          |
| PUT/DELETE | `/api/admin/users/:id`    | Editar/eliminar usuario         |
| GET        | `/api/admin/sections`     | Catálogo de permisos            |

---

## Sesión persistente

| Archivo lógico | Ubicación real (Tauri)                        |
| -------------- | --------------------------------------------- |
| `session.json` | `~/.local/share/com.bibliaapp.desktop/store/` |

Claves:

- `bibliaapp_session` — token Bearer
- `bibliaapp_user` — JSON del usuario

Comportamiento (`AuthContext`):

1. Al abrir: restaurar token + usuario del store
2. Si hay red: `GET /api/auth/me` para revalidar
3. Sin red: mantener sesión cacheada
4. Solo **401/403** invalidan la sesión

Código: `src/lib/sessionStore.ts`, `src/context/AuthContext.tsx`

---

## SQLite offline (Biblia + anotaciones)

| Archivo        | Ubicación                       |
| -------------- | ------------------------------- |
| `bibliaapp.db` | Gestionado por Tauri plugin-sql |

### Tablas

```sql
-- Biblia
bibles (incluye capabilities_json), books, verses
-- Sync (como móvil)
meta, notebooks, notes, highlights, favorites, verse_notes
```

### Capa `repo.ts`

| Función                                       | Online        | Offline              |
| --------------------------------------------- | ------------- | -------------------- |
| `repoListBibles`                              | API + cache   | SQLite               |
| `repoListBooks` / `repoGetVerses`             | API           | SQLite si descargada |
| `repoSearchVerses`                            | `/api/search` | `LIKE` local         |
| `repoListNotebooks` / notas                   | sync + API    | SQLite               |
| `repoGetHighlights` / favoritos / verse notes | sync + API    | SQLite               |
| `downloadBible`                               | API           | Escribe SQLite       |

Sync: `lib/sync.ts` — `syncAll()` en login y al reconectar.

El caché respeta `canDownload`: no almacena capítulos de versiones solo online y elimina descargas cuyo permiso haya sido retirado.

Referencia: `mobile/lib/offline/*`, `mobile/lib/sync.ts`.

---

## Google OAuth (desktop)

Flujo actual (**no** usa `bibliaapp://`):

1. Frontend: `invoke('start_google_oauth_listener')` → puerto aleatorio
2. Abre `{API}/api/auth/google?desktop=1&port={puerto}`
3. Backend state: `desktop:{port}:{nonce}`
4. Tras Google, callback redirige a `http://127.0.0.1:{port}/callback?token=…`
5. Rust emite evento `google-oauth-callback` → `applySession`

Detalle backend: [08-backend-desktop.md](./08-backend-desktop.md)

---

## Anotaciones y favoritos

| Capa                                             | Uso                 |
| ------------------------------------------------ | ------------------- |
| `repo.repoGetHighlights` / `repoSetHighlights`   | Resaltados          |
| `repo.repoGetChapterNotes` / `repoSaveVerseNote` | Notas por versículo |
| `repo.repoListFavorites` / `repoAddFavorite`     | Favoritos           |

Implementado en `BibleReader` y `FavoritesPage`. Sync offline vía `lib/sync.ts`.

---

## Notificaciones

| Endpoint                        | Uso                     |
| ------------------------------- | ----------------------- |
| `GET /api/notifications`        | Lista + unreadCount     |
| `POST /api/notifications/read`  | Marcar leídas           |
| `GET /api/notifications/stream` | SSE (Bearer en desktop) |

---

## Self-check

```bash
npm run check   # src/lib/__check__.ts
```

Verifica helpers de errores auth y parseo de URLs OAuth.
