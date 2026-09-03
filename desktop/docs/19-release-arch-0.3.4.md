# 19 — Release Arch 0.3.4

Fecha: **2026-07-28**.

## Contenido de la versión

- Tema **DVG** con la misma paleta que móvil y web: acciones e indicador de
  foco en rojo, bordes y campos en dorado cálido, texto y superficies
  secundarias en crema/dorado. Antes usaba bordes rojos. Ver
  [01-changelog.md](./01-changelog.md).
- Arreglada la miniatura de vista previa del selector de temas
  (`ThemeSwitch.tsx`): usaba clases CSS inexistentes y todas mostraban el
  tema activo en vez del propio; ahora cada una recibe sus colores por
  estilo en línea.
- `APP_VERSION` (mostrado en Perfil) dependía de `import.meta.env.PACKAGE_VERSION`,
  que nunca se inyectaba, así que la app mostraba siempre "0.3.3" sin
  importar la versión real compilada desde el 0.1.0. `vite.config.ts` ahora
  define esa variable a partir de `package.json` en cada build.

## Artefacto Arch

```text
packaging/arch/bibliaapp-desktop-0.3.4-1-x86_64.pkg.tar.zst
```

- Tamaño: `10,424,116` bytes.
- SHA-256: `30847458dcf7f1eb32a32fc16ff53daed779d34104de3933b1d5e2d0b6f15390`.
- Arquitectura: ELF64 x86-64 PIE, no despojado (`not stripped`).
- Dependencias dinámicas resueltas sin ninguna `not found` (`ldd`), incluye
  GTK 3, WebKitGTK 4.1, libsoup 3, GLib, cairo, pango.

Instalación:

```bash
sudo pacman -U packaging/arch/bibliaapp-desktop-0.3.4-1-x86_64.pkg.tar.zst
```

El artefacto se excluye de Git mediante `desktop/.gitignore`; debe
conservarse o publicarse por separado de los fuentes.

## Entorno de compilación

Esta compilación se hizo en Debian 13 (trixie), no en Arch, igual que la
0.3.3. `pacman`/`makepkg` no están disponibles en esta máquina, así que el
paquete se validó directamente como tar Zstandard (`.PKGINFO`, permisos,
rutas y dependencias dinámicas con `ldd`), no con una instalación real vía
`pacman -U`.

El toolchain de Rust del sistema (`apt`, 1.85.0) resultó insuficiente:
varias dependencias de Tauri (`darling`, `zbus`, `time`, `icu_*`) requieren
rustc 1.86–1.88. Se instaló `rustup` en `$HOME/.cargo` con el canal stable
(1.97.1) para compilar.

## Validación ejecutada

```bash
npm run check
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
npm run pack:arch
```

Tauri también produjo:

- `src-tauri/target/release/bundle/appimage/BibliaAPP_0.3.4_amd64.AppImage`;
- `src-tauri/target/release/bundle/deb/BibliaAPP_0.3.4_amd64.deb`.
