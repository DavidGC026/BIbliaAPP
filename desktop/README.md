# BibliaAPP Desktop

Cliente de escritorio (**Tauri v2 + React**) para lectura bíblica, comunidad y grupos.

**Versión:** 0.2.0 · **Plataformas:** Arch Linux, Debian/Ubuntu, Windows

---

## Documentación

Índice: **[`docs/README.md`](./docs/README.md)**

| Tema | Enlace |
|------|--------|
| Changelog | [docs/01-changelog.md](./docs/01-changelog.md) |
| Arch Linux | [docs/04-arch-linux.md](./docs/04-arch-linux.md) |
| Debian | [docs/09-debian-linux.md](./docs/09-debian-linux.md) |
| Windows | [docs/11-windows.md](./docs/11-windows.md) |
| Auto-update | [docs/10-auto-update.md](./docs/10-auto-update.md) |

---

## Inicio rápido

```bash
cd desktop
npm install
npm run tauri dev      # desarrollo
npm run pack:arch      # Arch (.pkg.tar.zst)
npm run pack:deb       # Debian (.deb)
npm run pack:win       # Windows (.msi + .exe) — requiere SO Windows
```

## Instalar en Arch

```bash
sudo pacman -U packaging/arch/bibliaapp-desktop-0.2.0-3-x86_64.pkg.tar.zst
```

Ruta en el repo: `desktop/packaging/arch/bibliaapp-desktop-0.2.0-3-x86_64.pkg.tar.zst`

---

## Qué incluye v0.2.0

- Login, sesión offline, Google OAuth
- Lector (resaltados, notas de versículo, favoritos, imágenes) — **sync offline** como móvil
- **Notas**: libretas con sync bidireccional SQLite, diario espiritual, libros de estudio (online)
- Biblia offline, búsqueda, **referencias cruzadas**, **diccionario Strong**, feed + comentarios, grupos, notificaciones
- Empaquetado Arch + Debian + Windows; CI GitHub Actions
- Auto-actualización (Perfil; publicar `latest.json` firmado pendiente)

---

## Backend

`https://biblia2.dvguzman.com` — configurable con `VITE_API_URL`  
OAuth desktop: [docs/08-backend-desktop.md](./docs/08-backend-desktop.md)

