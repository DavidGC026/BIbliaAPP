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

## Archivos y sesiones protegidos — 2026-09-23

Los handlers esperan `await getSession(req)`: la identidad requiere una familia de sesión registrada y el rol vigente en la BD. `/api/auth/logout` invalida todas las renovaciones de esa familia.

`lib/serve-media.ts` aplica las mismas reglas a `/api/media/:id`, `/api/uploads/:filename` y `/uploads/:filename`. Se exige sesión, metadatos de propietario y permiso; un archivo sin registro no se entrega. Las respuestas llevan `private, no-store`, `nosniff` y CSP restrictiva, sin confiar en MIME aportado por usuarios. Middleware reescribe la ruta antigua antes del servicio estático.

Los nuevos archivos se guardan en `data/uploads` (o `UPLOADS_DIR`, fuera de `public`). Al arrancar, `lib/upload-storage.ts` mueve los archivos antiguos de `public/uploads`; no sobrescribe nombres duplicados. Conservar ese directorio en el volumen persistente y en respaldos. La caché previamente almacenada en dispositivos o CDN necesita expiración/purga independiente.

Las subidas se limitan a 10 MiB y se decodifican y reencodifican con Sharp: PNG, JPEG, WebP y GIF; máximo 40 megapíxeles y 200 fotogramas. Se rechazan SVG, MIME engañoso, contenido que no decodifique y solicitudes demasiado grandes. Los errores internos 500 de las rutas revisadas dejan de devolver mensajes SQL o de configuración.

La migración y los cambios de clave/formato de sesión requieren un nuevo inicio de sesión una vez tras activar el servidor. Una desconexión normal posterior conserva las credenciales en el móvil.

Dependencias web: Next 16.3.6, Tiptap 3.31.3 y Sharp 0.35.4 o superior. `npm run build` fija Webpack para compilar este repositorio con carpetas nativas grandes sin el consumo excesivo observado en Turbopack. Se comprueba TypeScript separadamente porque la configuración previa permite omitirlo durante el build.

### Referencias históricas a archivos

La migración puede registrar un archivo sin metadatos únicamente si encuentra una referencia inequívoca en contenido existente. `source_id` junto con `legacy_feed`, `legacy_group` o `legacy_event` identifica ese contenido. La autorización consulta su visibilidad y pertenencia al grupo en cada lectura, comprueba que el contenido aún referencia el archivo y deniega si fue eliminado. Compartir otro grupo con el autor no basta. Los uploads normales no pueden solicitar estos tipos. Los archivos sin referencias o ambiguos permanecen bloqueados; no se atribuyen a un administrador por defecto.
