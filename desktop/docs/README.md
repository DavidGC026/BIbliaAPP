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
| [../../docs/mobile-release-api.md](../../docs/mobile-release-api.md) | Distribución de APK Android desde la web |

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
