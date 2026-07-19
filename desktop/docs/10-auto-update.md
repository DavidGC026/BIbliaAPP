# 10 — Auto-actualización

BibliaAPP Desktop usa **`tauri-plugin-updater`** para buscar e instalar actualizaciones firmadas.

---

## Comportamiento en la app

- **Perfil → Buscar actualizaciones**
- Si hay versión nueva → botón **Instalar**
- SSE + polling de notificaciones es independiente (ver [06-funcionalidades.md](./06-funcionalidades.md))

Sin servidor de releases configurado, la app muestra un mensaje claro (no falla silenciosamente).

---

## Configuración (`tauri.conf.json`)

```json
"plugins": {
  "updater": {
    "endpoints": [
      "https://biblia2.dvguzman.com/desktop/releases/latest.json"
    ],
    "pubkey": "…clave pública minisign…"
  }
}
```

`bundle.createUpdaterArtifacts: true` genera artefactos firmables al compilar.

---

## Generar claves de firma (una vez)

```bash
cd desktop
CI=true npm run tauri -- signer generate -w ~/.tauri/bibliaapp.key -p 'TU_PASSWORD'
```

- **Privada:** `~/.tauri/bibliaapp.key` — no subir al repo
- **Pública:** copiar contenido de `.pub` a `pubkey` en `tauri.conf.json`

Variables al firmar en CI:

```bash
export TAURI_SIGNING_PRIVATE_KEY_PATH=~/.tauri/bibliaapp.key
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD='TU_PASSWORD'
```

---

## Publicar una release

1. Compilar: `npm run pack:arch` o `npm run pack:deb`
2. Firmar el bundle (Tauri CLI / GitHub Action `tauri-action`)
3. Subir artefacto al servidor (o GitHub Release vía tag `desktop-v*`)
4. Generar manifest: `./packaging/releases/generate-latest-json.sh 0.3.0`
5. Publicar `latest.json` en el servidor

Ejemplo de endpoint:

```text
GET https://biblia2.dvguzman.com/desktop/releases/latest.json
```

---

## Código frontend

- `src/lib/updater.ts` — `checkForUpdates()`, `installUpdate()`
- Solo activo dentro de Tauri (`__TAURI_INTERNALS__`)

---

## Seguridad

- Nunca commitear la clave privada
- Rotar claves si se filtra la privada
- El manifest debe servirse por HTTPS
