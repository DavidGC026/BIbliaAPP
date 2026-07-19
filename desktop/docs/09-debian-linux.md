# 09 — Debian / Ubuntu

Guía para compilar e instalar BibliaAPP Desktop en **Debian**, **Ubuntu** y derivadas.

---

## 1. Dependencias de compilación

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl wget file \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libxdo-dev \
  nodejs npm \
  rustup
```

Rust (si no lo tienes):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

Verifica:

```bash
pkg-config --exists webkit2gtk-4.1 && echo OK
node --version   # 20+
```

---

## 2. Desarrollo

```bash
cd desktop
npm install
npm run tauri dev
```

---

## 3. Compilar `.deb`

```bash
cd desktop
npm install
chmod +x packaging/debian/build-deb.sh
./packaging/debian/build-deb.sh
# o: npm run pack:deb
```

Artefacto:

```text
src-tauri/target/release/bundle/deb/bibliaapp-desktop_0.3.0_amd64.deb
```

(ruta exacta puede variar según versión de Tauri)

---

## 4. Instalar

```bash
sudo dpkg -i src-tauri/target/release/bundle/deb/*.deb
sudo apt -f install   # dependencias faltantes
```

Ejecutar: `bibliaapp-desktop` desde el menú de aplicaciones o terminal.

---

## 5. Arch vs Debian

| Formato             | Comando              | Uso                          |
| ------------------- | -------------------- | ---------------------------- |
| Arch `.pkg.tar.zst` | `npm run pack:arch`  | pacman -U                    |
| Debian `.deb`       | `npm run pack:deb`   | dpkg -i                      |
| AppImage            | `npm run build:arch` | portable en cualquier distro |

---

## 6. Windows

Pendiente. Requiere WebView2 + Visual Studio Build Tools en un runner Windows:

```bash
npm run tauri build -- --bundles msi,nsis
```

Ver [PLAN.md](../PLAN.md) fase 4.
