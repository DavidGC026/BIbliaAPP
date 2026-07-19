# 27 — OAuth Google en Android (esquema de deep link)

## Problema

Tras autorizar en Google, la app móvil recibe el token mediante un **deep link** (`bibliaapp://auth/google?token=…`). Si el esquema nativo del APK no coincide con el que el backend usa al redirigir, el WebView se queda congelado y la sesión no se aplica.

---

## Flujo correcto

```text
App móvil                    Backend                         Google
    |  abre /api/auth/google?mobile=1[&variant=internal]
    | ------------------------>|
    |                          | state = mobile[:internal]:<nonce>
    |                          | cookie google_oauth_state
    | <---- redirect Google ---|
    |  usuario autoriza
    |                          | callback /api/auth/google/callback
    | <---- redirect deep link -|
    |  bibliaapp[ -internal]://auth/google?token=…
    |  aplica token en SecureStore
```

---

## Variantes de esquema

Constantes en [`lib/google-oauth.ts`](../lib/google-oauth.ts):

| Constante | URI |
|-----------|-----|
| `MOBILE_GOOGLE_REDIRECT` | `bibliaapp://auth/google` |
| `INTERNAL_MOBILE_GOOGLE_REDIRECT` | `bibliaapp-internal://auth/google` |

| Build | Parámetro al iniciar OAuth | Prefijo del state | Redirect |
|-------|---------------------------|-------------------|----------|
| Pública | `?mobile=1` | `mobile:` | `bibliaapp://…` |
| Interna | `?mobile=1&variant=internal` | `mobile:internal:` | `bibliaapp-internal://…` |

`getMobileOAuthRedirect(state)` elige el esquema leyendo el state, no una constante fija.

Rutas backend:

- Inicio: [`app/api/auth/google/route.ts`](../app/api/auth/google/route.ts)
- Callback: [`app/api/auth/google/callback/route.ts`](../app/api/auth/google/callback/route.ts)

---

## Requisitos en Android

1. **`app.json` / `app.config`**: `scheme` debe coincidir con la variante (`bibliaapp` vs `bibliaapp-internal`).
2. **Intent filters** en el manifest generado por Expo deben capturar `/auth/google`.
3. El código JS que abre OAuth debe pasar `variant=internal` solo en la build interna.

Desalineación típica: APK interno con esquema `bibliaapp-internal` pero OAuth iniciado sin `variant=internal` → el callback apunta a `bibliaapp://` y Android no entrega el intent a la app correcta.

---

## Errores en el deep link

El callback puede añadir `?error=…` al mismo esquema. El cliente debe mostrar el mensaje y cerrar el WebView/modal de login.

---

## Comprobación manual

1. Build interna: abrir OAuth y verificar en logs de red que la URL inicial incluye `variant=internal`.
2. Tras login, confirmar redirect a `bibliaapp-internal://auth/google?token=…` (no `bibliaapp://`).
3. `GET /api/auth/me` con el token guardado debe devolver el perfil.

---

## Referencias

- Web/API: sección OAuth en [`docs/acceso-biblico-y-legal-web.md`](../docs/acceso-biblico-y-legal-web.md)
- Auth móvil general: [06-autenticacion.md](./06-autenticacion.md)
