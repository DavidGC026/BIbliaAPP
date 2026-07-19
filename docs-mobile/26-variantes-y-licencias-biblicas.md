# 26 — Variantes y licencias bíblicas

## Objetivo

Cada traducción expuesta por la API tiene licencia y **capacidades** propias (`canRead`, `canDownload`, `canCopy`, `canShare`, `canCreateImages`, `canUseAudio`). El cliente móvil debe respetar el catálogo filtrado y deshabilitar acciones que la licencia no permite.

Referencia backend web: [`docs/acceso-biblico-y-legal-web.md`](../docs/acceso-biblico-y-legal-web.md).

---

## Catálogo desde la API

`GET /api/bibles` devuelve:

```json
{
  "bibles": [
    {
      "bibleId": 149,
      "abbr": "RVR1960",
      "name": "Reina-Valera 1960",
      "catalogScope": "public",
      "canRead": true,
      "canDownload": true,
      "canCopy": true,
      "canShare": true,
      "canCreateImages": true,
      "canUseAudio": false,
      "license": "…",
      "copyright": "…"
    }
  ],
  "defaultBibleId": 149
}
```

**Reglas para el cliente:**

1. No hardcodear `149`; usar `defaultBibleId` o la primera versión accesible.
2. Solo iniciar descarga offline si `canDownload === true`.
3. Ocultar o deshabilitar copiar, compartir e imagen de versículo según los flags correspondientes.
4. Las traducciones `catalogScope: "internal"` solo aparecen para admins o usuarios con entitlement en `user_bible_entitlements`.

---

## Variantes de build (pública vs interna)

La app puede compilarse como **APK público** (`bibliaapp://`) o **build interna** (`bibliaapp-internal://`). El catálogo bíblico puede incluir traducciones `internal` solo para usuarios autorizados; la variante de build no sustituye la validación del servidor.

| Aspecto | Build pública | Build interna |
|---------|---------------|---------------|
| Esquema deep link | `bibliaapp://` | `bibliaapp-internal://` |
| OAuth Google | `?mobile=1` | `?mobile=1&variant=internal` |
| Catálogo API | Mismo endpoint; filtrado por sesión/rol | Igual |

Ver OAuth: [27-oauth-google-android-esquema.md](./27-oauth-google-android-esquema.md).

---

## Offline y SQLite

Paridad con desktop ([`desktop/docs/12-paridad-mobile-2026-07.md`](../desktop/docs/12-paridad-mobile-2026-07.md)):

1. Persistir `capabilities_json` (o equivalente) al cachear una versión.
2. No descargar capítulos si `canDownload` es falso.
3. Al refrescar el catálogo, eliminar texto local de versiones cuyo permiso fue retirado.
4. Un `403` en `/api/verses/bulk` no debe caer silenciosamente a descarga capítulo a capítulo.

Código de referencia: `mobile/lib/offline/*`, `mobile/lib/sync.ts`.

---

## Pantalla legal y licencias

La sección legal del perfil debe listar atribuciones y enlaces a las políticas públicas del backend:

- `/terminos`
- `/privacidad`
- `/normas-comunidad`

Las URLs base salen de `EXPO_PUBLIC_API_URL` (producción: `https://biblia2.dvguzman.com`).

---

## Errores frecuentes

| Síntoma | Causa probable |
|---------|----------------|
| Lista de versiones vacía | Sin filas activas en `bible_licenses` en producción |
| Descarga offline falla con 403 | Licencia sin `canDownload` |
| Usuario no ve traducción interna | Falta rol en `INTERNAL_BIBLE_ROLES` o entitlement |
| Versículo del día sin botón compartir | `canShare` / `canCreateImages` en false para esa versión |

---

## Comprobación

```bash
curl -s "$EXPO_PUBLIC_API_URL/api/bibles" -H "Authorization: Bearer $TOKEN" | jq '.defaultBibleId, .bibles[0].canDownload'
```
