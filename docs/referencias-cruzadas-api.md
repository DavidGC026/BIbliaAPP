# API de referencias cruzadas

Documentación de `GET /api/references` y consumidores (mapa arcoíris, lector, descarga offline móvil).

**Implementación:** `app/api/references/route.ts`  
**Tabla:** `bible_cross_references` (`vid_origen`, `vid_destino`, `votos`)

---

## Codificación de versículos (`vid`)

Cada versículo se identifica con un entero:

```text
vid = bookId * 1_000_000 + chapter * 1_000 + verse
```

Ejemplo: Juan 3:16 con `bookId = 43` → `vid = 43_003_016`.

La API de consulta por versículo recibe `bookId`, `chapter`, `verse` y opcionalmente `bible` (default `1`).

---

## Modos de la API

### 1. Referencias de un versículo (default)

```http
GET /api/references?bookId=43&chapter=3&verse=16&bible=1
```

**Respuesta:**

```json
{
  "references": [
    {
      "book_name": "Romanos",
      "book_id": 45,
      "chapter": 5,
      "verse": 8,
      "text": "…",
      "votos": 120
    }
  ]
}
```

- Máximo **100** referencias, ordenadas por `votos` DESC.
- Requiere los tres parámetros; sin ellos → `400`.

**UI:** modal de referencias en el lector (`components/cross-references-modal.tsx`) y en notas web (`components/notebook-sidebar.tsx`).

---

### 2. Mapa de arcos (`?arcs`)

Agregación capítulo-a-capítulo para el diagrama «mapa arcoíris»:

```http
GET /api/references?arcs
```

**Respuesta:**

```json
{
  "keys": [1, 2, 43, 45],
  "arcs": [0, 2, 15, 1, 3, 8]
}
```

- `keys`: índices de capítulos (clave = `FLOOR(vid / 1000)`).
- `arcs`: triples `[índice_origen, índice_destino, conteo]` (longitud múltiplo de 3).
- Cache: `Cache-Control: public, max-age=86400` (24 h).

**UI:**

| Cliente | Componente |
|---------|------------|
| Web | `components/references-rainbow-map.tsx` → `lib/rainbow-html.ts` |
| Desktop (Tauri) | `desktop/src/components/ReferencesRainbowMap.tsx` |

---

### 3. Export paginado (`?export`)

Descarga masiva para almacenamiento offline (móvil):

```http
GET /api/references?export&page=1
```

**Respuesta:**

```json
{
  "rows": [[43003016, 45005008, 120], [43003016, 62003016, 95]],
  "total": 350000,
  "page": 1,
  "totalPages": 14
}
```

- Cada fila: `[vid_origen, vid_destino, votos]`.
- Tamaño de página: **25 000** filas.
- Misma cache de 24 h.

**Consumidor móvil:** cola en `mobile/lib/offlineDownloadManager.ts` (ver [`docs-mobile/19-descargas-offline.md`](../docs-mobile/19-descargas-offline.md)).

---

## Tipado en el servidor

Desde julio 2026 las consultas usan interfaces `extends RowDataPacket` en lugar de `any[]`:

| Interfaz | Consulta |
|----------|----------|
| `ReferenceArcRow` | Agregación `?arcs` |
| `CountRow` | `COUNT(*)` en export |
| `CrossReferenceExportRow` | Filas `?export` |
| `CrossReferenceRow` | JOIN con `bible_verses` por versículo |

Convenciones generales: [`build-web-typescript.md`](./build-web-typescript.md).

---

## Importación de datos

Los scripts en `scripts/` (`import_all_refs.ts`, `setup_refs.sql`, etc.) pueblan `bible_cross_references`. No hay migración Prisma; la tabla debe existir antes de usar la API.

Comprobar que hay datos:

```bash
# Con .env.local configurado
npx tsx -e "
import { getPool } from './lib/mysql';
const [r] = await getPool().query('SELECT COUNT(*) AS n FROM bible_cross_references');
console.log(r);
process.exit(0);
"
```

---

## Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---------|----------------|-----------|
| Mapa arcoíris vacío | Tabla sin datos o error de red | Verificar `?arcs` en navegador; revisar logs del contenedor |
| Modal sin referencias | `bookId` incorrecto para la versión | Confirmar `bible` y IDs de libro de `bible_books` |
| Descarga offline atascada | Páginas de export incompletas | Revisar `totalPages` y que cada `page` devuelva hasta 25k filas |
| Build falla en `route.ts` | `query<any[]>` | Migrar a interfaces `RowDataPacket` (ver build doc) |
