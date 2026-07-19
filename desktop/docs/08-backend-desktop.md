# 08 — Cambios en el backend (Next.js)

El desktop requiere cambios en el **repositorio raíz** (no solo en `desktop/`). La app móvil sigue usando `?mobile=1` → `bibliaapp://`; el desktop usa `?desktop=1&port=`.

---

## Archivos modificados

| Archivo                                 | Cambio                                                                        |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| `lib/google-oauth.ts`                   | Plataforma `desktop`, `buildDesktopOAuthRedirect()`, parse puerto desde state |
| `app/api/auth/google/route.ts`          | Acepta `?desktop=1&port=1024-65535`                                           |
| `app/api/auth/google/callback/route.ts` | Redirect a `http://127.0.0.1:{port}/callback?token=`                          |

---

## Iniciar OAuth desktop

```http
GET /api/auth/google?desktop=1&port=38473
```

- Crea state `desktop:38473:<random>`
- Cookie `google_oauth_state` (igual que web/móvil)
- Redirige a Google

Prioridad en route: si hay `port` válido → `desktop`; si no, `mobile=1` → mobile; else web.

---

## Callback exitoso (desktop)

```http
HTTP/1.1 302 Found
Location: http://127.0.0.1:38473/callback?token=<iv>:<ciphertext>
```

Errores:

```http
Location: http://127.0.0.1:38473/callback?error=Mensaje+de+error
```

---

## Despliegue

Tras actualizar el código en el servidor:

```bash
docker restart biblia2-app   # o tu método habitual
curl -s https://biblia2.dvguzman.com/api/health
```

Sin este despliegue, **Google login en desktop fallará** aunque la app esté actualizada.

---

## Compatibilidad

| Cliente | Parámetro           | Redirect final                       |
| ------- | ------------------- | ------------------------------------ |
| Web     | (default)           | `/auth/google/complete` + cookies    |
| Móvil   | `?mobile=1`         | `bibliaapp://auth/google?token=`     |
| Desktop | `?desktop=1&port=N` | `http://127.0.0.1:N/callback?token=` |

No hay conflicto entre clientes: cada uno usa su propio flujo.
