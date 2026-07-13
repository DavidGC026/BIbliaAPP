# 23 — Inicio: recientes inteligentes

Mejoras en la pantalla **Inicio** móvil (julio 2026) para mostrar actividad reciente accionable en lugar de solo estadísticas.

---

## Objetivo

Que el usuario retome rápido lo que estaba haciendo: notas editadas, versículos guardados o subrayados, y devocionales recientes. Cada bloque es opcional (solo se renderiza si hay datos) y navega directo al destino.

**Pantalla:** `mobile/app/(tabs)/index.tsx`

---

## Bloques en Inicio

| Bloque | Límite | Origen de datos | Al tocar |
|--------|--------|-----------------|----------|
| Continuar lectura | 1 | `getLastPassage()` en `lib/readerState.ts` | Lector en libro/capítulo/Biblia guardados |
| Notas recientes | 3 | `repoListRecentNotebookNotes(3)` | Editor `/note/{id}` |
| Versículos guardados | 3 | `repoListFavorites()` ordenados por `created_at` | Lector en el pasaje |
| Subrayados recientes | 3 | `repoListRecentHighlights(3)` | Lector en el pasaje |
| Devocionales recientes | 3 | `listDevotionals()` menos el destacado | Lectura `/devotional/read/{id}` |

Los bloques de notas, favoritos y subrayados **no se muestran en modo invitado** (`isGuest`).

---

## Notas recientes

`repoListRecentNotebookNotes` (`lib/repo.ts`):

1. Carga todas las libretas (`loadNotebooksView`).
2. Obtiene notas de cada libreta y añade `notebookName`.
3. Ordena por `updatedAt` descendente.
4. Devuelve las primeras `limit` (por defecto 3).

Cada tarjeta muestra título, libreta, fecha relativa y preview de texto (`notePreview` sobre HTML limpio).

---

## Versículos guardados y subrayados

- **Favoritos:** lista completa desde `repoListFavorites()`, orden local por `created_at`, slice(0, 3). Scroll horizontal de tarjetas con referencia, estrella y texto del versículo.
- **Subrayados:** `repoListRecentHighlights(3)` prioriza API online; offline cae a SQLite local. Tarjeta con punto de color del subrayado.

Ambos abren el lector con `bookId`, `chapter` y `bibleId` en los params de la ruta.

---

## Devocionales recientes

- El devocional **destacado** (`pickFeaturedDevotional`) tiene tarjeta propia arriba.
- La sección «Devocionales recientes» excluye ese id para no repetirlo.
- Si no quedan otros, muestra estado vacío con mensaje claro.

---

## Recarga de datos

`useFocusEffect` vuelve a cargar pasaje, notas, favoritos y subrayados cada vez que Inicio gana foco (p. ej. al volver del editor o del lector). Los devocionales y contadores se cargan en `useEffect` al montar.

---

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `mobile/app/(tabs)/index.tsx` | UI de bloques recientes y navegación |
| `mobile/lib/repo.ts` | `repoListRecentNotebookNotes`, `repoListRecentHighlights` |
| `mobile/lib/readerState.ts` | `getLastPassage` para «Continuar lectura» |

---

## Cómo probar

```bash
cd mobile
npm run android
```

1. Edita una nota y vuelve a Inicio: debe aparecer en **Notas recientes** con libreta y preview.
2. Guarda un favorito y un subrayado en el lector; comprueba las filas horizontales correspondientes.
3. Toca cada tarjeta y verifica que abre el editor o lector correcto.
4. Con sesión invitado, confirma que los bloques de notas/favoritos/subrayados no aparecen.
5. En pantalla pequeña, revisa que la lista vertical no quede excesivamente larga (pendiente de QA manual).

---

## Relacionado

- [20 — Plan maestro](./20-plan-maestro-mejoras-generales.md) — iteración «Recientes inteligentes».
- [17 — Notas como herramienta de productividad](./17-notas-productividad-general.md) — acción **Nota rápida** en Inicio.
