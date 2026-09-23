# 05 — API y backend

La app móvil **no implementa lógica de negocio**: consume los mismos endpoints que la web en `app/api/`.

**Base URL por defecto:** `https://biblia2.dvguzman.com`

Configurable vía `EXPO_PUBLIC_API_URL` (ver [08-configuracion-entorno.md](./08-configuracion-entorno.md)).

## Autenticación en peticiones

```http
Authorization: Bearer <token>
Content-Type: application/json
```

El token se obtiene de `POST /api/auth/login`. El backend lo valida en `lib/auth.ts` (`getSession`).

---

## Endpoints implementados en el cliente móvil

Implementación en [`mobile/lib/api.ts`](../mobile/lib/api.ts).

### Auth

| Método | Ruta | Función cliente | Auth | Descripción |
|--------|------|-----------------|------|-------------|
| POST | `/api/auth/login` | `login()` | No | Email + password → `{ token, user }` |
| POST | `/api/auth/logout` | `logout()` | Sí | Borra cookie y token local; aún no revoca copias del Bearer en servidor |
| GET | `/api/auth/me` | `getMe()` | Opcional | `{ user: User \| null, token?: string }`, perfil y renovación de sesión vigente |

**Login — cuerpo:**

```json
{ "email": "usuario@ejemplo.com", "password": "..." }
```

**Login — respuesta exitosa:**

```json
{
  "success": true,
  "token": "v2:<iv>:<ciphertext>:<tag>",
  "user": { "id": 1, "name": "...", "email": "...", "role": "reader" }
}
```

**Errores habituales:**

| HTTP | Mensaje / code |
|------|----------------|
| 401 | Credenciales incorrectas |
| 403 | `EMAIL_NOT_VERIFIED` — verificar correo en web |

---

### Biblia (públicos)

| Método | Ruta | Función | Query |
|--------|------|---------|-------|
| GET | `/api/verse-of-the-day` | `getVerseOfDay()` | `idBible` (opcional, default 149) |
| GET | `/api/bibles` | `listBibles()` | — |
| GET | `/api/books` | `listBooks(bibleId)` | `bible=<id>` |
| GET | `/api/verses` | `getVerses(...)` | `bible`, `book`, `chapter` |

**Versículo del día — respuesta:**

```json
{
  "theme": "Tema del día",
  "reference": "Juan 3:16",
  "text": "...",
  "idBook": 43,
  "chapter": 3,
  "verse_start": 16,
  "verse_end": 16,
  "idBible": 149
}
```

**Versiones — item:**

```json
{ "bibleId": 149, "abbr": "RVR1960", "name": "Reina Valera 1960" }
```

**Libros — item:**

```json
{ "bookId": 1, "bookName": "Génesis", "chapters": 50 }
```

**Versículos — item:**

```json
{
  "id": 123,
  "bookId": 1,
  "bookName": "Génesis",
  "chapter": 1,
  "verse": 1,
  "text": "En el principio..."
}
```

---

### Comunidad e iglesia (requieren auth)

| Método | Ruta | Función | Query |
|--------|------|---------|-------|
| GET | `/api/feed` | `getFeed()` | `type=following\|explore`, `limit`, `offset` |
| GET | `/api/groups` | `listGroups()` | — |
| GET | `/api/groups/preview` | `previewGroupByCode()` | `code` (público) |
| POST | `/api/groups/join` | `joinGroupByCode()` | `{ inviteCode }` |
| GET | `/api/tts` | `getTtsVoices()` | `info=voices` |
| GET/POST/PUT/DELETE | `/api/prayers` | `listMyPrayers()`, `createPrayer()`, … | — |
| GET/POST/PATCH | `/api/friends` | `listFriends()`, `sendFriendRequest()`, … | `tab=pending` |
| GET | `/api/users/search` | `searchUsers()` | `q` |
| GET | `/api/profile/[username]` | `getPublicProfile()` | — |
| POST/DELETE | `/api/profile/[username]/follow` | `followUser()`, `unfollowUser()` | — |
| GET/POST | `/api/discipleship` | `listDiscipleship()`, `requestDiscipleship()`, … | `discipleId` |
| GET | `/api/church-settings` | `getChurchSettings()` | — |

**Feed — item (campos usados en UI):**

```json
{
  "id": 1,
  "content": "Texto de la publicación",
  "created_at": "2026-06-15T10:00:00.000Z",
  "user_name": "Nombre",
  "user_username": "usuario",
  "like_count": 3,
  "comment_count": 1,
  "is_liked": false
}
```

**Grupo — item:**

```json
{
  "id": 1,
  "name": "Célula Norte",
  "description": "...",
  "role": "congregante",
  "member_count": 12,
  "cover_image": null,
  "avatar_image": null
}
```

**Iglesia — respuesta:**

```json
{
  "settings": {
    "church_name": "Mi Iglesia",
    "church_logo_url": "/uploads/..."
  }
}
```

---

## Endpoints web aún no consumidos por el móvil

Referencia para ampliaciones ([10-roadmap.md](./10-roadmap.md)):

| Área | Rutas ejemplo |
|------|----------------|
| Búsqueda | `GET /api/search?bible=&q=` |
| Registro | `POST /api/auth/register` |
| Subida archivos | `POST /api/upload` |
| Comentarios bíblicos | `/api/commentaries` — corpus de muestra; no está en el móvil a propósito |

Código fuente de rutas: carpeta [`app/api/`](../app/api/) en la raíz del repo.

---

## Tipos TypeScript

Definidos en [`mobile/lib/types.ts`](../mobile/lib/types.ts). Deben mantenerse alineados con las respuestas reales del backend (`lib/types.ts` y queries SQL en `lib/bible.ts`, `lib/groups.ts`, etc.).

---

## Health check

Para verificar que el backend responde:

```bash
curl -s https://biblia2.dvguzman.com/api/health
```

Útil al depurar conexión desde el móvil.
