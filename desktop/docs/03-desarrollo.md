# 03 — Desarrollo local

## Requisitos

| Herramienta | Versión                            |
| ----------- | ---------------------------------- |
| Node.js     | 20+                                |
| Rust        | via [rustup.rs](https://rustup.rs) |

### Arch Linux

```bash
sudo pacman -S --needed webkit2gtk-4.1 base-devel curl wget file openssl \
  appmenu-gtk-module libappindicator-gtk3 librsvg nodejs npm rust
```

### Debian / Ubuntu

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

### Windows

WebView2 + [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/). Ver [11-windows.md](./11-windows.md).

---

## Instalación del proyecto

```bash
cd desktop
npm install
```

---

## Variables de entorno

Archivo `desktop/.env` (opcional):

```env
# Producción (default)
VITE_API_URL=https://biblia2.dvguzman.com
VITE_APP_VARIANT=internal
VITE_COMMUNITY_ENABLED=true
VITE_DEFAULT_BIBLE_ID=149

# Opcionales: sobrescribir enlaces legales
# VITE_TERMS_URL=https://...
# VITE_PRIVACY_URL=https://...
# VITE_COMMUNITY_GUIDELINES_URL=https://...
# VITE_SUPPORT_URL=mailto:...
# VITE_ACCOUNT_DELETION_URL=mailto:...

# Desarrollo local
# VITE_API_URL=http://127.0.0.1:3000
```

En `VITE_APP_VARIANT=public`, Comunidad y Grupos quedan ocultos salvo que se
defina expresamente `VITE_COMMUNITY_ENABLED=true`. Si no se configura
`VITE_DEFAULT_BIBLE_ID`, el cliente usa `defaultBibleId` del catálogo autorizado
y nunca supone el ID interno `149`.

---

## Comandos npm

| Comando              | Descripción                                         |
| -------------------- | --------------------------------------------------- |
| `npm run dev`        | Solo Vite en navegador (sin SQLite ni OAuth Google) |
| `npm run tauri dev`  | App de escritorio con hot reload                    |
| `npm run build`      | Compilar frontend (TypeScript + Vite)               |
| `npm run build:arch` | Build Tauri release + AppImage                      |
| `npm run pack:arch`  | Iconos + build + `.pkg.tar.zst` para pacman         |
| `npm run pack:deb`   | Iconos + build + `.deb` (Debian/Ubuntu)             |
| `npm run pack:win`   | Iconos + build + `.msi` / `.exe` (Windows)          |
| `npm run icons`      | Copiar logo web y regenerar iconos Tauri            |
| `npm run check`      | Self-check helpers auth                             |
| `npm run tauri`      | CLI Tauri (ver subcomandos)                         |

---

## Google OAuth

Flujo **localhost** (no deep link):

1. Usuario pulsa “Continuar con Google”
2. La app abre un servidor en `127.0.0.1:<puerto>` y lanza el navegador
3. Backend redirige a `http://127.0.0.1:<puerto>/callback?token=…`
4. Firefox muestra “Sesión iniciada — puedes cerrar esta pestaña”
5. BibliaAPP recibe el token y entra al inicio

**Requisito:** backend desplegado con soporte `desktop` — ver [08-backend-desktop.md](./08-backend-desktop.md).

---

## Sesión offline (auth)

- Token + usuario en plugin-store (`session.json`)
- Sin red al abrir: se muestra la app con sesión cacheada
- Indicador “Sin conexión” en barra lateral
- Al recuperar red: revalidación con `/api/auth/me`

---

## Biblia offline (SQLite)

- Solo en app Tauri (`npm run tauri dev` / build instalado)
- Descargar versión: Biblia → Descargas
- DB: SQLite vía `tauri-plugin-sql`
- Lector y búsqueda usan datos locales si la versión está descargada

Ver [07-api-y-offline.md](./07-api-y-offline.md).

---

## Artefactos de compilación

Tras `npm run build:arch`:

```text
src-tauri/target/release/bibliaapp-desktop          # binario
src-tauri/target/release/bundle/appimage/
  BibliaAPP_0.3.3_amd64.AppImage
packaging/arch/
  bibliaapp-desktop-0.3.3-1-x86_64.pkg.tar.zst      # npm run pack:arch
```

---

## Layout de pantallas

Las vistas principales comparten la clase **`.desktop-page`** definida en `src/styles/globals.css`:

```css
.desktop-page {
  box-sizing: border-box;
  width: 100%;
  max-width: 96rem; /* 1536 px */
  margin-inline: auto;
}
```

| Tipo de vista | Contenedor | Ejemplos |
| ------------- | ---------- | -------- |
| Contenido principal (listas, lectores, feeds) | `.desktop-page` | `HomePage`, `BibleReader`, `FeedPage`, `NotesPage`, `AdminUsersPage` (lista) |
| Formularios y lectura densa | `max-w-3xl` / `max-w-4xl` centrado | `ProfilePage`, formulario crear/editar usuario en `AdminUsersPage`, `LegalPage` |
| Auth / modales | `max-w-md` / `max-w-xl` | `LoginPage`, `LegalAcceptanceGate`, diálogos |

**Al añadir una pantalla nueva:** envuelve el contenido en `.desktop-page` salvo que sea un formulario largo o texto legal donde conviene un ancho de lectura más estrecho. No reutilices `max-w-5xl` / `max-w-6xl` sueltos: el límite anterior (`64rem` / `72rem`) dejaba márgenes excesivos en monitores amplios.

Detalle de arquitectura: [05-arquitectura.md](./05-arquitectura.md#estado-y-preferencias-v033).

---

## Solución de problemas

| Problema                        | Solución                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `webkit2gtk` no encontrado      | Instalar deps de Arch/Debian arriba                                           |
| Google “Load failed” en Firefox | Actualizar backend + app (OAuth localhost)                                    |
| Google login no completa        | Verificar despliegue backend [08-backend-desktop.md](./08-backend-desktop.md) |
| Sin SQLite en `npm run dev`     | Normal: usar `npm run tauri dev`                                              |
| Búsqueda offline vacía          | Descargar versión en Biblia → Descargas                                       |
| Icono genérico en Hyprland      | `npm run icons` + reinstalar paquete pacman                                   |
| CORS en navegador puro          | Usar `tauri dev`                                                              |

---

## Documentación relacionada

- Arch Linux: [04-arch-linux.md](./04-arch-linux.md)
- Debian: [09-debian-linux.md](./09-debian-linux.md)
- Auto-update: [10-auto-update.md](./10-auto-update.md)
- Arquitectura: [05-arquitectura.md](./05-arquitectura.md)
- Funcionalidades: [06-funcionalidades.md](./06-funcionalidades.md)
