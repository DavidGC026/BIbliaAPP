# 11 — Windows

Empaquetado de BibliaAPP Desktop para **Windows 10/11** (x64).

---

## Requisitos de desarrollo

1. [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (incluido en Windows 11; instalar en Windows 10 si falta)
2. [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) con **Desktop development with C++**
3. Node.js 20+ y Rust (`rustup`)

```powershell
cd desktop
npm install
npm run icons
npm run pack:win
```

Artefactos en:

```text
src-tauri\target\release\bundle\msi\BibliaAPP_0.3.3_x64_en-US.msi
src-tauri\target\release\bundle\nsis\BibliaAPP_0.3.3_x64-setup.exe
```

---

## Comandos npm

| Comando             | Descripción                                       |
| ------------------- | ------------------------------------------------- |
| `npm run build:win` | Compila frontend + bundles `.msi` y `.exe` (NSIS) |
| `npm run pack:win`  | Iconos + build Windows                            |
| `npm run tauri dev` | Desarrollo con hot reload                         |

---

## CI (GitHub Actions)

El workflow [`.github/workflows/desktop-build.yml`](../../.github/workflows/desktop-build.yml) compila en `windows-latest` al pushear cambios en `desktop/` o al crear un tag `desktop-v*`.

Para publicar release:

```bash
git tag desktop-v0.3.3
git push origin desktop-v0.3.3
```

Los instaladores aparecen como **draft release** en GitHub. Opcionalmente súbelos también a `https://biblia2.dvguzman.com/desktop/releases/` para el auto-updater.

---

## OAuth Google en Windows

Mismo flujo **localhost** que Linux:

1. La app abre el navegador predeterminado
2. Google redirige a `http://127.0.0.1:<puerto>/callback?token=…`
3. Windows Firewall puede pedir permiso la primera vez (red local)

---

## Auto-actualización

Configurado en `tauri.conf.json` → endpoint `latest.json`. Plataforma Windows:

```json
"windows-x86_64": {
  "signature": "…",
      "url": "https://…/BibliaAPP_0.3.3_x64-setup.nsis.zip"
}
```

Generar manifest: [`packaging/releases/generate-latest-json.sh`](../packaging/releases/generate-latest-json.sh)

Ver [10-auto-update.md](./10-auto-update.md).

---

## Offline

SQLite, sync de libretas/notas/resaltados/favoritos — misma lógica que Linux. Descarga de biblias en **Biblia → Descargas**.

---

## Solución de problemas

| Problema             | Solución                                                                       |
| -------------------- | ------------------------------------------------------------------------------ |
| `link.exe` not found | Instalar VS Build Tools con C++                                                |
| WebView2 missing     | Instalar [WebView2 Runtime](https://go.microsoft.com/fwlink/p/?LinkId=2124703) |
| Pantalla en blanco   | Ejecutar desde terminal para ver errores; revisar antivirus                    |
| Updater sin firma    | Configurar `TAURI_SIGNING_PRIVATE_KEY` en CI — ver 10-auto-update.md           |
