# BibliaAPP Desktop

Cliente de escritorio (**Tauri v2 + React**) para lectura bíblica, comunidad y grupos.

**Versión:** 0.3.2 · **Plataformas:** Arch Linux, Debian/Ubuntu, Windows

---

## Documentación

Índice: **[`docs/README.md`](./docs/README.md)**

| Tema        | Enlace                                               |
| ----------- | ---------------------------------------------------- |
| Changelog   | [docs/01-changelog.md](./docs/01-changelog.md)       |
| Arch Linux  | [docs/04-arch-linux.md](./docs/04-arch-linux.md)     |
| Debian      | [docs/09-debian-linux.md](./docs/09-debian-linux.md) |
| Windows     | [docs/11-windows.md](./docs/11-windows.md)           |
| Auto-update | [docs/10-auto-update.md](./docs/10-auto-update.md)   |

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
sudo pacman -U packaging/arch/bibliaapp-desktop-0.3.2-1-x86_64.pkg.tar.zst
```

El paquete se genera en `desktop/packaging/arch/` con `npm run pack:arch`.

---

## Qué incluye v0.3.2

- Login, sesión offline, Google OAuth
- Lector (resaltados, notas de versículo, favoritos, imágenes) — **sync offline** como móvil
- **Notas**: libretas con sync bidireccional SQLite, diario espiritual, libros de estudio (online)
- Biblia offline, búsqueda, **referencias cruzadas**, **diccionario Strong**, feed + comentarios, grupos, notificaciones
- Empaquetado Arch + Debian + Windows; CI GitHub Actions
- Auto-actualización (Perfil; publicar `latest.json` firmado pendiente)
- Inicio inteligente, búsqueda universal, planes de lectura, actividad y estadísticas
- Temas ampliados, preferencias del lector, permisos por sección y administración
- Flujo legal completo y capacidades/licencias de Biblias también offline
- Editor de notas con Auto semántico, imágenes normales/de fondo y autoguardado robusto
- Portadas de Unsplash/archivo y calendario completo con RSVP

---

## Backend

`https://biblia2.dvguzman.com` — configurable con `VITE_API_URL`  
OAuth desktop: [docs/08-backend-desktop.md](./docs/08-backend-desktop.md)
