# 04 — Arch Linux

Guía para compilar, instalar y distribuir BibliaAPP Desktop en **Arch Linux** (y derivadas: Manjaro, EndeavourOS, etc.).

Windows y Debian quedan para más adelante.

---

## 1. Dependencias de compilación

```bash
sudo pacman -S --needed \
  base-devel curl wget file openssl \
  webkit2gtk-4.1 \
  appmenu-gtk-module \
  libappindicator-gtk3 \
  librsvg \
  nodejs npm \
  rust
```

Verifica:

```bash
pkg-config --exists webkit2gtk-4.1 && echo OK
rustc --version
node --version   # 20+
```

---

## 2. Desarrollo (`tauri dev`)

```bash
cd desktop
npm install
npm run tauri dev
```

Requisito: sesión gráfica (Wayland o X11) para la ventana WebKitGTK.

---

## 3. Compilar AppImage (recomendado en Arch)

```bash
cd desktop
npm install
npm run build:arch
```

Equivale a `npm run tauri build`. El artefacto queda en:

```text
src-tauri/target/release/bundle/appimage/BibliaAPP_0.3.3_amd64.AppImage
```

Ejecutar sin instalar:

```bash
chmod +x src-tauri/target/release/bundle/appimage/BibliaAPP_*.AppImage
./src-tauri/target/release/bundle/appimage/BibliaAPP_*.AppImage
```

---

## 4. Instalar con PKGBUILD (pacman)

Desde el repo clonado:

```bash
cd desktop/packaging/arch
makepkg -si
```

Esto compila el proyecto e instala:

| Ruta                                                  | Contenido                      |
| ----------------------------------------------------- | ------------------------------ |
| `/usr/bin/bibliaapp-desktop`                          | AppImage renombrado/ejecutable |
| `/usr/share/applications/bibliaapp-desktop.desktop`   | Entrada de menú                |
| `/usr/share/icons/hicolor/128x128/apps/bibliaapp.png` | Icono                          |

Lanzar desde el menú de aplicaciones o:

```bash
bibliaapp-desktop
```

---

## 5. Google OAuth (localhost — Hyprland / Firefox)

Ya **no** usa `bibliaapp://` (Firefox mostraba “Load failed”).

1. Pulsa **Continuar con Google**.
2. La app abre un servidor en `127.0.0.1:<puerto>` y lanza el navegador.
3. Tras Google, el backend redirige a `http://127.0.0.1:<puerto>/callback?token=…`.
4. Firefox muestra “Sesión iniciada — puedes cerrar esta pestaña”.
5. BibliaAPP recibe el token y entra al inicio.

**Backend:** debe estar desplegado con soporte `?desktop=1&port=…` (`lib/google-oauth.ts`). Si usas producción, reinicia el contenedor web tras actualizar el código.

---

## Biblia — Buscar y Descargas

En **Biblia** hay tres pestañas:

- **Lector** — lectura con soporte offline si descargaste la versión
- **Buscar** — `/api/search` online; offline busca en SQLite
- **Descargas** — descarga/elimina versiones completas en SQLite local

---

## 6. Icono e instalación pacman

```bash
cd desktop
npm run pack:arch
sudo pacman -U packaging/arch/bibliaapp-desktop-0.3.3-1-x86_64.pkg.tar.zst
```

O paso a paso:

```bash
npm run icons
npm run build:arch
./packaging/arch/build-pacman-pkg.sh
```

Instala iconos en `hicolor` 16–256 px para Hyprland, Waybar y el lanzador.

---

## 7. Sesión offline

- Token y usuario en `~/.local/share/com.bibliaapp.desktop/store/session.json` (Tauri plugin store).
- Sin red: dashboard con sesión cacheada e indicador **Sin conexión — sesión guardada**.

---

## 8. Variables de entorno

Crea `desktop/.env` antes de compilar:

```env
VITE_API_URL=https://biblia2.dvguzman.com
```

Para backend local:

```env
VITE_API_URL=http://127.0.0.1:3000
```

---

## 9. Solución de problemas (Arch)

| Problema                        | Solución                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------ |
| `webkit2gtk-4.1` no encontrado  | `sudo pacman -S webkit2gtk-4.1`                                                                  |
| Ventana en blanco               | WebKitGTK requiere aceleración GPU; prueba `WEBKIT_DISABLE_COMPOSITING_MODE=1 bibliaapp-desktop` |
| AppImage no arranca             | `chmod +x` y FUSE: `sudo pacman -S fuse2` si aplica                                              |
| Google “Load failed” en Firefox | Actualiza backend + app (OAuth por localhost, no deep link)                                      |
| Icono genérico en Hyprland      | `npm run icons` y reinstala el paquete                                                           |

---

## 9. Próximos pasos (Arch)

- [ ] Publicar en AUR (`bibliaapp-desktop`)
- [ ] Iconos propios desde `mobile/assets`
- [ ] `.SRCINFO` generado con `makepkg --printsrcinfo`
