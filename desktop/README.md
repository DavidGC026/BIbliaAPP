# BibliaAPP Desktop

Cliente de escritorio (Tauri v2 + React) para **Arch Linux**, **Debian** y **Windows**.

Consume la misma API REST que la web y la app móvil (`https://biblia2.dvguzman.com` por defecto).

## Inicio rápido

```bash
cd desktop
npm install
npm run tauri dev      # desarrollo
npm run tauri build    # compilación release
```

Documentación detallada: [`docs/README.md`](./docs/README.md)

Plan general: [`PLAN.md`](./PLAN.md)

## v0.1.0 — Incluye

- Login con email/contraseña y **Google OAuth**
- Persistencia de sesión **offline** (token + usuario en disco)
- Dashboard con versículo del día y datos de cuenta

## Arch Linux

Ver [`docs/04-arch-linux.md`](./docs/04-arch-linux.md) — AppImage, PKGBUILD y dependencias `pacman`.

```bash
npm run build:arch   # genera AppImage
```
