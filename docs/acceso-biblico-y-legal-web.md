# Acceso bíblico, legal y administración (web / API)

## Objetivo

Desde julio de 2026 el backend deja de servir todas las traducciones por igual. Cada versión bíblica tiene **licencia y capacidades propias** (`bible_licenses`), el registro exige **aceptación legal** y el panel de administración consume un **catálogo centralizado de secciones** en lugar de duplicar listas en web y móvil.

Este documento cubre la capa Next.js (`lib/`, `app/api/`, páginas legales). Paridad móvil: [`docs-mobile/26-variantes-y-licencias-biblicas.md`](../docs-mobile/26-variantes-y-licencias-biblicas.md), [`docs-mobile/28-admin-usuarios-y-aceptacion-legal.md`](../docs-mobile/28-admin-usuarios-y-aceptacion-legal.md). Desktop: [`desktop/docs/12-paridad-mobile-2026-07.md`](../desktop/docs/12-paridad-mobile-2026-07.md).

---

## Licencias y acceso bíblico

### Módulo central — [`lib/bible-access.ts`](../lib/bible-access.ts)

| Función | Uso |
|---------|-----|
| `listAccessibleBibles(req)` | Catálogo filtrado por sesión, alcance y entitlements |
| `assertBibleAccess(req, bibleId, capability?)` | Valida una versión concreta; lanza `BibleAccessError` (404/403) |
| `bibleAccessStatus(error)` | Mapea el error a código HTTP para las rutas |

**Capacidades** (`BibleCapability`): `canRead`, `canDownload`, `canCopy`, `canShare`, `canCreateImages`, `canUseAudio`.

**Alcance del catálogo** (`catalogScope` en `bible_licenses`):

| Valor | Quién la ve |
|-------|-------------|
| `public` | Cualquier cliente (incluido invitado si `canRead`) |
| `internal` | Solo roles en `INTERNAL_BIBLE_ROLES` o fila activa en `user_bible_entitlements` |

**Producción vs desarrollo:** si falla la consulta a `bible_licenses` en producción, el catálogo queda **vacío** (fail-closed). En desarrollo, cae a `bible_bibles` sin fila de licencia y habilita todas las capacidades para filas legacy (`catalogScope == null`).

### Respuesta de `/api/bibles`

```json
{
  "bibles": [{ "bibleId": 149, "abbr": "RVR1960", "name": "…", "canShare": true, … }],
  "defaultBibleId": 149
}
```

- `defaultBibleId` sale de `DEFAULT_PUBLIC_BIBLE_ID` si esa versión está en la lista accesible; si no, la primera disponible.
- El front **no debe** asumir el id fijo `149`; esperar a resolver `defaultBibleId` (ver también [`docs/mejoras-uso-diario-web.md`](./mejoras-uso-diario-web.md)).

### Rutas que validan acceso

| Ruta | Capacidad típica |
|------|------------------|
| `GET /api/books`, `/api/verses`, `/api/search`, `/api/references` | `canRead` |
| `GET /api/verses/bulk` | `canDownload` |
| `GET /api/favorites`, `/api/highlights`, `/api/highlights/all` | filtra filas de versiones no accesibles |
| `GET /api/verse-of-the-day` | elige entre versiones accesibles; UI oculta compartir/imagen según licencia |

Errores: **404** si la versión no está en el catálogo del usuario; **403** si la licencia no permite la acción (p. ej. descarga masiva sin `canDownload`).

### Variables de entorno

| Variable | Default | Efecto |
|----------|---------|--------|
| `DEFAULT_PUBLIC_BIBLE_ID` | (ninguno) | Versión por defecto en `/api/bibles` |
| `INTERNAL_BIBLE_ROLES` | `admin` | Roles CSV con acceso a traducciones `internal` |

### UI web afectada

- [`components/verse-of-the-day.tsx`](../components/verse-of-the-day.tsx) — oculta compartir y crear imagen cuando `canShare` / `canCreateImages` son falsos.
- [`components/references-explorer.tsx`](../components/references-explorer.tsx) — espera `defaultBibleId` del API.
- Lector y búsqueda — consumen el catálogo filtrado vía `/api/bibles`.

---

## Documentos legales y aceptación

Requisito para publicación en tiendas: páginas públicas y registro de aceptación.

### Páginas estáticas

| Ruta | Archivo |
|------|---------|
| `/terminos` | [`app/terminos/page.tsx`](../app/terminos/page.tsx) |
| `/privacidad` | [`app/privacidad/page.tsx`](../app/privacidad/page.tsx) |
| `/normas-comunidad` | [`app/normas-comunidad/page.tsx`](../app/normas-comunidad/page.tsx) |

Layout compartido: [`components/legal/legal-page.tsx`](../components/legal/legal-page.tsx). Enlaces persistentes: [`components/legal/legal-footer.tsx`](../components/legal/legal-footer.tsx) (también en [`components/auth-screen.tsx`](../components/auth-screen.tsx)).

### API y persistencia

| Flujo | Comportamiento |
|-------|----------------|
| `POST /api/auth/register` | Requiere `acceptTerms: true`; si falta → **400**. Tras crear usuario, `markUserLegalAccepted` sella `users.legal_accepted_at`. |
| `POST /api/auth/login` | Devuelve `user.legalAcceptedAt` y `user.createdAt`. |
| `POST /api/legal/accept` | Sesión obligatoria; `{ accept: false }` → **400**; `{ accept: true }` (default) actualiza `legal_accepted_at`. |

Cuentas creadas antes del cambio pueden tener `legalAcceptedAt === null`; el cliente (web/móvil/desktop) debe mostrar un gate y llamar a `POST /api/legal/accept` antes de continuar.

Columna: `users.legal_accepted_at` (migración idempotente en [`lib/bible.ts`](../lib/bible.ts)).

---

## Catálogo de secciones para administración

`GET /api/admin/sections` — solo **admin** autenticado.

Respuesta:

```json
{
  "groups": [
    {
      "id": "ESTUDIO",
      "label": "Estudio bíblico",
      "sections": [{ "id": "search", "label": "Búsqueda" }]
    }
  ],
  "defaults": ["dashboard", "reading", …]
}
```

- `groups`: derivado de [`lib/app-section-registry/catalog.ts`](../lib/app-section-registry/catalog.ts) vía `APP_SECTION_GROUPS`; **excluye** entradas con `adminOnly: true`.
- `defaults`: `DEFAULT_READER_SECTIONS` (secciones con `defaultForReader`).

Implementación: [`app/api/admin/sections/route.ts`](../app/api/admin/sections/route.ts).

**Por qué existe:** web, móvil y desktop construyen el editor de permisos desde una sola fuente en el servidor, sin duplicar la lista en cada cliente. Para **añadir** una sección nueva al sistema, sigue la guía local [`docs/nuevas-secciones.md`](./nuevas-secciones.md) (catálogo + registro UI); el endpoint la expone automáticamente.

---

## OAuth Google — variante móvil interna

Build interna de Android usa esquema distinto al APK público.

| Variante | Inicio | State OAuth | Deep link de retorno |
|----------|--------|-------------|----------------------|
| Pública | `GET /api/auth/google?mobile=1` | `mobile:<nonce>` | `bibliaapp://auth/google` |
| Interna | `GET /api/auth/google?mobile=1&variant=internal` | `mobile:internal:<nonce>` | `bibliaapp-internal://auth/google` |

Lógica: [`lib/google-oauth.ts`](../lib/google-oauth.ts) (`buildGoogleOAuthState`, `getMobileOAuthRedirect`). Callback: [`app/api/auth/google/callback/route.ts`](../app/api/auth/google/callback/route.ts).

Detalle móvil: [`docs-mobile/27-oauth-google-android-esquema.md`](../docs-mobile/27-oauth-google-android-esquema.md).

---

## Errores frecuentes

### Catálogo vacío en producción

Comprueba que existan filas en `bible_licenses` con `status = 'active'` y `can_read = 1`. Sin tabla o sin datos, `listAccessibleBibles` devuelve `[]`.

### Front asume `bibleId = 149`

Usar `defaultBibleId` de `/api/bibles` o la primera entrada accesible. Hardcodear rompe entornos con otra versión por defecto o usuarios sin acceso a RVR1960.

### Permisos de sección desincronizados entre clientes

No mantener listas estáticas en web/móvil/desktop; consumir `GET /api/admin/sections` al abrir el panel de administración.

### OAuth móvil congelado tras login Google

El esquema del deep link debe coincidir con el `variant` usado al iniciar el flujo (`public` vs `internal`). Ver doc 27.

---

## Comprobación rápida

```bash
# Catálogo (invitado)
curl -s https://biblia2.dvguzman.com/api/bibles | jq '.defaultBibleId, (.bibles | length)'

# Secciones admin (requiere cookie/token de admin)
curl -s -H "Authorization: Bearer <token>" https://biblia2.dvguzman.com/api/admin/sections | jq '.defaults | length'

# Páginas legales
curl -sI https://biblia2.dvguzman.com/terminos | head -1
```
