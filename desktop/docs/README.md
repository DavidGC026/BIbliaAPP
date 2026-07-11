# BibliaAPP Desktop — documentación

Índice de documentación del cliente de escritorio (Tauri v2 + React).

---

## En este repositorio

| Documento | Contenido |
|-----------|-----------|
| [../README.md](../README.md) | Inicio rápido, empaquetado Arch/Debian/Windows |
| [../PLAN.md](../PLAN.md) | Arquitectura y decisiones técnicas (propuesta inicial) |
| [../../.cursor/rules/desktop.mdc](../../.cursor/rules/desktop.mdc) | Patrones de desarrollo (API, offline, OAuth, empaquetado) |
| [../../docs/referencias-cruzadas-mapa-arcoiris.md](../../docs/referencias-cruzadas-mapa-arcoiris.md) | Mapa arcoíris y API de referencias (web + desktop) |
| [../../docs/diccionario.md](../../docs/diccionario.md) | Diccionario Strong (compartido con web) |

---

## Configuración

| Variable | Uso |
|----------|-----|
| `VITE_API_URL` | URL base del backend (default `https://biblia2.dvguzman.com`) |

Build de desarrollo:

```bash
cd desktop
npm install
npm run tauri dev
```

Verificación mínima tras cambios en `src/lib/`:

```bash
npm run check
```

---

## Funcionalidades (v0.2.0)

- Login, sesión offline, Google OAuth (listener localhost)
- Lector: resaltados, notas de versículo, favoritos, imágenes, biblia offline
- Notas: libretas con sync SQLite bidireccional, diario, libros de estudio
- Referencias cruzadas + mapa arcoíris + diccionario Strong
- Feed, comentarios, grupos, notificaciones (SSE con Bearer)
- Empaquetado: `npm run pack:arch` · `pack:deb` · `pack:win`
- CI: `.github/workflows/desktop-build.yml` (tag `desktop-v*`)

---

## OAuth Google en escritorio

El flujo no usa deep links. Tauri abre el navegador del sistema y escucha en `localhost` para recibir el token. El backend debe permitir el origen del redirect configurado en producción.

Detalle de endpoints y CORS: revisar `app/auth/google/complete/page.tsx` y `app/api/auth/*` en el repo web.

---

## Mantener versiones alineadas

Sincronizar al publicar:

- `desktop/package.json` → campo `version`
- `desktop/src-tauri/Cargo.toml` → `version`
- `desktop/src-tauri/tauri.conf.json` → `version`

---

*Última revisión: julio 2026.*
