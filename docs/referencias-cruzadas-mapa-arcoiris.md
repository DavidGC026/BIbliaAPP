# Referencias cruzadas y mapa arcoíris

Documentación de la sección **Referencias** (grupo Estudio bíblico) y su visualización de conexiones entre capítulos.

---

## Resumen

| Modo | Dónde | Qué hace |
|------|-------|----------|
| **Lista** | Web y escritorio | Elige versículo → muestra referencias cruzadas con texto y votos |
| **Mapa arcoíris** | Web y escritorio | Vista a pantalla completa: arcos entre capítulos de toda la Biblia |

La sección está registrada como `references` en `lib/app-section-registry/catalog.ts` con `guestAccess: true`.

---

## Fuente de datos

Tabla `bible_cross_references`:

| Columna | Significado |
|---------|-------------|
| `vid_origen` | Versículo origen codificado: `bookId * 1_000_000 + chapter * 1_000 + verse` |
| `vid_destino` | Versículo destino (misma codificación) |
| `votos` | Peso de relevancia (mayor = más citado en el corpus) |

Si la lista devuelve vacío, suele faltar importar los datos (scripts en `scripts/import_all_refs.ts` en el servidor; no versionados en Git).

---

## API `GET /api/references`

Ruta: `app/api/references/route.ts`

### Referencias de un versículo

```
GET /api/references?bookId=1&chapter=1&verse=1&bible=149
```

| Parámetro | Obligatorio | Descripción |
|-----------|-------------|-------------|
| `bookId` | Sí | ID del libro |
| `chapter` | Sí | Capítulo |
| `verse` | Sí | Versículo |
| `bible` | No | ID de versión (default `1`; la UI usa `149` — Reina Valera) |

Respuesta: `{ references: [{ book_name, book_id, chapter, verse, text, votos }] }` — hasta 100 filas, ordenadas por `votos DESC`.

### Agregado para el mapa arcoíris

```
GET /api/references?arcs
```

Agrupa conexiones **capítulo a capítulo** (no versículo a versículo):

```sql
SELECT FLOOR(vid_origen / 1000) AS a, FLOOR(vid_destino / 1000) AS b, COUNT(*) AS n
FROM bible_cross_references
GROUP BY ...
```

Respuesta:

```json
{
  "keys": [1, 2, 5, ...],
  "arcs": [0, 3, 42, 1, 5, 18, ...]
}
```

- `keys`: IDs de libro únicos presentes en las referencias, ordenados.
- `arcs`: triples `[idxA, idxB, conexiones, ...]` indexando posiciones en `keys`.

Cache: `Cache-Control: public, max-age=86400` (24 h).

### Export paginado (clientes offline)

```
GET /api/references?export&page=1
```

Devuelve filas compactas `[vid_origen, vid_destino, votos]` en páginas de 25 000 filas. Lo usan los clientes nativos para descargar la tabla completa a SQLite.

---

## UI web

| Archivo | Rol |
|---------|-----|
| `components/references-explorer.tsx` | Pantalla principal: lista + botón al mapa |
| `components/references-rainbow-map.tsx` | Carga `/api/references?arcs` y `/api/books`, genera HTML |
| `lib/rainbow-html.ts` | Generador de HTML/canvas del mapa (espejo de `mobile/lib/rainbowHtml.ts`) |

### Flujo del mapa

1. `ReferencesExplorer` cambia a vista `"map"` → overlay `fixed inset-0`.
2. `ReferencesRainbowMap` obtiene `keys`/`arcs` y nombres de libros.
3. `buildPayload()` en el componente convierte claves de libro en etiquetas por capítulo (`"Génesis 1"`, …).
4. `getRainbowHtml(theme, payload)` devuelve un documento HTML autocontenido renderizado en `<iframe srcDoc>`.
5. El tema (claro/oscuro) lee variables CSS `--background`, `--foreground`, etc.

### Interacción en el mapa

- Zoom: rueda del ratón o pellizco.
- Pan: arrastrar.
- Clic en un capítulo: resalta sus conexiones.
- Filtros por libro en la barra superior del iframe.
- El canvas se dibuja una vez en alta resolución; el zoom usa transformaciones CSS (no redibuja).

---

## UI escritorio

Misma lógica, archivos paralelos en `desktop/src/`:

| Web | Desktop |
|-----|---------|
| `components/references-explorer.tsx` | `desktop/src/components/ReferencesExplorer.tsx` |
| `components/references-rainbow-map.tsx` | `desktop/src/components/ReferencesRainbowMap.tsx` |
| `lib/rainbow-html.ts` | `desktop/src/lib/rainbow-html.ts` |

El mapa se abre desde la pestaña Referencias del lector (`desktop/src/pages/BiblePage.tsx`).

**Mantener en sincronía:** los tres archivos `rainbow-html.ts` (web, desktop, móvil en su repo) comparten el mismo algoritmo de renderizado.

---

## Cómo probar

1. Abre la app → menú **Referencias** (Estudio bíblico).
2. En la lista, elige versión, libro, capítulo y versículo; comprueba resultados.
3. Pulsa **Mapa de referencias** → pantalla completa con arcos.
4. Cambia tema claro/oscuro: el mapa debe adaptar colores al recargar el iframe.

---

## Errores frecuentes

| Síntoma | Causa probable |
|---------|----------------|
| Lista siempre vacía | Tabla `bible_cross_references` sin datos o `bible` incorrecto |
| Mapa en carga infinita | Misma causa, o error de red en `/api/references?arcs` |
| Arcos sin nombres de libro | Fallo en `/api/books?bible=149` (secundario; usa fallback `Libro N`) |

---

*Última revisión: julio 2026.*
