# BibliaAPP Desktop — Documentación

Cliente de escritorio (Tauri v2 + React) para congregaciones. Consume la API REST de BibliaAPP; no accede directamente a MariaDB.

**Versión actual:** `0.3.0`
**Backend por defecto:** `https://biblia2.dvguzman.com`

---

## Índice

| #   | Documento                                                      | Contenido                          |
| --- | -------------------------------------------------------------- | ---------------------------------- |
| —   | [`../README.md`](../README.md)                                 | Inicio rápido                      |
| —   | [`../PLAN.md`](../PLAN.md)                                     | Plan de implementación             |
| 01  | [01-changelog.md](./01-changelog.md)                           | Historial de cambios               |
| 02  | [02-progreso-plan.md](./02-progreso-plan.md)                   | Estado vs. plan                    |
| 03  | [03-desarrollo.md](./03-desarrollo.md)                         | Requisitos, comandos               |
| 04  | [04-arch-linux.md](./04-arch-linux.md)                         | Arch / pacman                      |
| 05  | [05-arquitectura.md](./05-arquitectura.md)                     | Stack, flujos                      |
| 06  | [06-funcionalidades.md](./06-funcionalidades.md)               | Pantallas                          |
| 07  | [07-api-y-offline.md](./07-api-y-offline.md)                   | API, SQLite                        |
| 08  | [08-backend-desktop.md](./08-backend-desktop.md)               | OAuth backend                      |
| 09  | [09-debian-linux.md](./09-debian-linux.md)                     | Debian / `.deb`                    |
| 10  | [10-auto-update.md](./10-auto-update.md)                       | Actualizaciones                    |
| 11  | [11-windows.md](./11-windows.md)                               | Windows / `.msi`                   |
| 12  | [12-paridad-mobile-2026-07.md](./12-paridad-mobile-2026-07.md) | Port de novedades móviles de julio |

**Paridad web (Next.js):** [`../../docs/temas-visuales-web.md`](../../docs/temas-visuales-web.md) · [`../../docs/mejoras-uso-diario-web.md`](../../docs/mejoras-uso-diario-web.md) · [`../../docs/estilos-moviles-web.md`](../../docs/estilos-moviles-web.md)

Regla Cursor para agentes: [`.cursor/rules/desktop.mdc`](../../.cursor/rules/desktop.mdc)

---

## Resumen v0.3.0

- Auth (email + Google OAuth localhost), sesión offline
- Lector con resaltados, notas, favoritos, imagen de versículo — **sync offline**
- Biblia offline SQLite, búsqueda
- Libretas y notas con sync bidireccional (como móvil)
- Feed con comentarios, grupos con detalle, notificaciones SSE
- Empaquetado Arch + Debian; CI Linux/Windows; auto-update preparado
- Inicio inteligente, búsqueda universal, planes, actividad y preferencias avanzadas
- Diez temas, permisos por sección, administración y flujo legal
- Capacidades/licencias aplicadas también al caché SQLite

---

## Instalación rápida (Arch)

```bash
sudo pacman -U packaging/arch/bibliaapp-desktop-0.3.0-1-x86_64.pkg.tar.zst
```

Debian: [09-debian-linux.md](./09-debian-linux.md)
