# Servicio de uploads — subida y entrega de archivos

Documentación del flujo de imágenes subidas por usuarios (notas, avatares, grupos, etc.) y de las rutas que las sirven en producción (julio 2026).

---

## Resumen

| Etapa | Ruta / ubicación | Auth |
|-------|------------------|------|
| Subida | `POST /api/upload` | Sesión o Bearer |
| Almacenamiento | `public/uploads/<uuid>.<ext>` | — |
| Entrega pública (notas, `<img>`) | `GET /uploads/<filename>` | No |
| Entrega privada por nombre | `GET /api/uploads/<filename>` | Sesión + `canViewMedia` |
| Entrega privada por ID | `GET /api/media/<id>` | Sesión + `canViewMedia` |

Las notas (web y móvil) insertan URLs absolutas en `https://<host>/uploads/<filename>`. Esa URL debe funcionar **sin** cookie ni Bearer porque el `<img>` del editor no envía credenciales.

---

## Subida (`POST /api/upload`)

**Código:** `app/api/upload/route.ts`

1. Valida sesión (`getSession`).
2. Acepta `multipart/form-data` con `file` y `purpose` (p. ej. `other`, `avatar`, `group_cover`).
3. Restringe a imágenes (`image/*`), máximo **10 MB**, extensiones `png`, `jpg`, `jpeg`, `webp`, `gif`.
4. Genera `filename = crypto.randomUUID() + '.' + ext` y escribe en `public/uploads/`.
5. Registra el archivo en `user_media` (`createUserMedia`) según `purpose` y visibilidad.
6. Responde:

```json
{
  "url": "/api/media/<mediaId>",
  "mediaId": 123,
  "filename": "a1b2c3d4-....-png"
}
```

**Contrato para editores de notas:** usar `filename`, no `url`. La respuesta `url` apunta a `/api/media/<id>` (requiere auth) y no sirve dentro de un `<img>` en WebView o iframe sin credenciales. Ver `docs-mobile/21-insercion-y-edicion-de-imagenes.md` §9.

---

## Entrega pública (`GET /uploads/[filename]`)

**Código:** `app/uploads/[filename]/route.ts`

Ruta App Router **fuera** de `/api/*`. El middleware (`middleware.ts`) solo aplica CORS a `/api/:path*`, así que `/uploads/*` no exige token.

Comportamiento:

- Valida el nombre con `safeUploadFilename`: solo `[a-zA-Z0-9._-]+` y extensión permitida (`png`, `jpg`, `jpeg`, `gif`, `webp`, `pdf`).
- Lee `public/uploads/<filename>` en cada petición (`runtime: nodejs`, `dynamic: force-dynamic`).
- Responde con `Content-Type` acorde, `X-Content-Type-Options: nosniff` y `Cache-Control: public, max-age=31536000, immutable`.

### Por qué no basta con `public/uploads/` estático

En producción, `next build` genera el inventario de archivos en `public/` **en el momento del build**. Los archivos que `/api/upload` escribe **después** del arranque existen en disco pero Next los devolvía como **404** si solo se servían como estáticos.

La ruta dinámica conserva la misma URL (`/uploads/<filename>`) que ya guardan las notas en HTML, sin migrar contenido existente.

### Desarrollo local

`npm run dev` suele servir archivos nuevos de `public/` sin problema. El fallo aparece sobre todo tras `next build` + `next start` (Docker en producción).

---

## Rutas privadas (avatares, feed, permisos)

| Ruta | Código | Uso |
|------|--------|-----|
| `GET /api/media/<id>` | `app/api/media/[id]/route.ts` | URL devuelta por el upload; respeta visibilidad del registro `user_media`. |
| `GET /api/uploads/<filename>` | `app/api/uploads/[filename]/route.ts` | Mismo archivo en disco, pero con sesión y comprobación `canViewMedia` por filename. |

Cache: `private, max-age=3600` (a diferencia de la ruta pública).

Usar estas rutas cuando la imagen no debe ser pública por URL directa. Las notas usan la ruta pública por requisito del editor.

---

## Privacidad

- El `filename` es un UUID; no es enumerable.
- Quien tenga la URL exacta puede ver la imagen (mismo modelo que un enlace compartido).
- Avatares y medios con visibilidad restringida deben consumirse vía `/api/media/<id>` o `/api/uploads/<filename>`, no vía `/uploads/`.

---

## Despliegue y comprobación

Tras cambios en las rutas de upload o en `app/uploads/`:

```bash
docker restart biblia2-app
docker logs -f biblia2-app   # esperar "Ready"
curl -s http://127.0.0.1:3003/api/health
```

Probar una imagen recién subida (sustituir `<filename>`):

```bash
# Debe devolver 200 y Content-Type image/*
curl -sI "http://127.0.0.1:3003/uploads/<filename>"
```

En el navegador: insertar imagen en una nota, guardar, reiniciar el contenedor, volver a abrir la nota y confirmar que la imagen sigue visible.

---

## Problemas frecuentes

| Síntoma | Causa probable | Qué revisar |
|---------|----------------|-------------|
| Imagen rota tras guardar nota (producción) | 404 en `/uploads/...` antes del fix dinámico | Que exista `app/uploads/[filename]/route.ts` y el build esté actualizado. |
| Imagen no se ve en móvil pero la subida OK | HTML usa `/api/media/<id>` en lugar de `/uploads/<filename>` | `getPublicUploadUrl(filename)` en el cliente móvil. |
| 403 en imagen de nota | URL apunta a `/api/media/` o `/api/uploads/` | Cambiar a `/uploads/<filename>` en el HTML guardado. |
| 400 Invalid filename | Caracteres no permitidos en la URL | Solo UUID + extensión; sin rutas ni `..`. |
| 404 tras subida | Archivo no escrito o nombre distinto | `ls public/uploads/` en el contenedor; respuesta JSON de `/api/upload`. |

---

## Documentos relacionados

- Web — editor e imágenes en notas: [`notas-web-paridad-movil.md`](./notas-web-paridad-movil.md) § Inserción y edición de imágenes
- Móvil — flujo completo y URL pública: [`../docs-mobile/21-insercion-y-edicion-de-imagenes.md`](../docs-mobile/21-insercion-y-edicion-de-imagenes.md) §9–§10

---

*Última revisión: julio 2026.*
