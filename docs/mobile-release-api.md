# Distribución de APK móvil desde la web

La web expone la última versión de la app Android y muestra un aviso de descarga en navegadores móviles.

---

## Resumen

| Pieza | Ubicación | Rol |
|-------|-----------|-----|
| Metadatos | `GET /api/mobile-release` | Versión, tamaño y URL de descarga |
| Descarga | `GET /api/mobile-release/download` | Sirve el APK más reciente |
| Lógica | `lib/mobile-release.ts` | Escanea `mobile/releases/` y compara versiones |
| Banner | `components/mobile-app-banner.tsx` | Aviso en móvil (solo Android para descargar) |
| APKs | `mobile/releases/BibliaAPP-{version}-release.apk` | Archivos en disco del servidor |

La app móvil vive en un **repositorio aparte**; este repo solo sirve el APK si los archivos están presentes en el servidor.

---

## API

### `GET /api/mobile-release`

Ruta: `app/api/mobile-release/route.ts`

Sin APK disponible:

```json
{ "available": false }
```

Con APK:

```json
{
  "available": true,
  "version": "3.0.2",
  "filename": "BibliaAPP-3.0.2-release.apk",
  "size": 52428800,
  "downloadUrl": "/api/mobile-release/download"
}
```

### `GET /api/mobile-release/download`

Ruta: `app/api/mobile-release/download/route.ts`

- Responde `404` si no hay APK o el archivo no existe.
- Headers: `Content-Type: application/vnd.android.package-archive`, `Content-Disposition: attachment`.
- Cache: `max-age=300` (5 min).

---

## Convención de archivos

`lib/mobile-release.ts` busca en `process.cwd()/mobile/releases/` archivos que coincidan con:

```text
BibliaAPP-{version}-release.apk
```

La versión se compara numéricamente por segmentos (`3.0.10` > `3.0.9`). Solo se expone la más alta.

Restricciones de seguridad en `getMobileReleasePath()`:

- Rechaza rutas con `..` o `/`.
- El nombre debe coincidir con el patrón anterior.

---

## Banner en la web

`MobileAppBanner` se monta en `app/page.tsx`.

| Comportamiento | Detalle |
|----------------|---------|
| Visibilidad | Solo en user-agents móviles (`md:hidden`) |
| Datos | `useSWR` a `/api/mobile-release` |
| Descarga | En Android: redirige a `downloadUrl`. En iOS: alerta indicando usar la web |
| Cierre | `localStorage` clave `biblia_mobile_banner_dismissed_{version}` por versión |

Si no hay APK en disco, el banner no aparece (`available: false`).

---

## Operación en producción

1. Compila el APK en el repositorio móvil (ver `docs-mobile/13-build-apk-release.md`).
2. Copia el archivo al servidor web:

   ```bash
   mkdir -p /home/david/proyectos/BibliaAPP/mobile/releases
   cp BibliaAPP-3.0.2-release.apk /home/david/proyectos/BibliaAPP/mobile/releases/
   ```

3. No hace falta reiniciar Docker: la API lee el directorio en cada petición.
4. Verifica:

   ```bash
   curl -s https://biblia2.dvguzman.com/api/mobile-release
   ```

La carpeta `mobile/` está en `.gitignore`; los APKs **no se versionan** en Git.

---

## Errores frecuentes

| Síntoma | Causa probable |
|---------|----------------|
| `available: false` | Directorio `mobile/releases/` vacío o inexistente |
| Nombre de archivo ignorado | No sigue el patrón `BibliaAPP-X.Y.Z-release.apk` |
| Banner no se muestra en desktop | Comportamiento esperado (solo móvil) |
| iOS no puede descargar | Comportamiento esperado; solo Android |

---

*Última revisión: julio 2026.*
