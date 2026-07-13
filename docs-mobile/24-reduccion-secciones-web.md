# Reducción de secciones web

Fecha: julio 2026

## Objetivo

Reducir la cantidad de secciones visibles en la web, siguiendo el patrón de la app mobile: una sección principal contiene varios modos internos mediante tabs segmentados.

## Agrupaciones

### Leer

Archivo: `lib/app-section-registry/sections.client.tsx`

La sección `reading` ahora renderiza `StudyHub` con tabs internos:

- **Biblia**: `BibleReader`
- **Buscar**: `SearchAdvanced`
- **Referencias**: `ReferencesExplorer`
- **Diccionario**: `StrongDictionary`

Al seleccionar un resultado de búsqueda se regresa automáticamente al modo **Biblia**.

### Notas

La sección `notebook` ahora renderiza `NotesHub` con:

- **Notas**: `NotesSection`
- **Devocional**: `Devotionals`
- **Oración**: `PrayerRequests`

Los tabs respetan `allowedSections`, por lo que solo aparecen si el usuario tiene permiso para esa función.

### Perfil

La sección `profile` ahora renderiza `ProfileHub` con:

- **Perfil**: `ProfileSection`
- **Favoritos**: `Favorites`
- **Subrayados**: `HighlightsManager`
- **Planes**: `ReadingPlans`
- **Actividad**: `Activity`
- **Estadísticas**: `Statistics`

También respeta `allowedSections`.

## Navegación visible

Archivo: `lib/app-section-registry/nav.client.tsx`

Se ocultaron del menú principal las secciones hijas:

- `search`
- `references`
- `dictionary`
- `devotionals`
- `prayers`
- `favorites`
- `highlights`
- `plans`
- `activity`
- `statistics`

Las secciones no se eliminaron del catálogo ni de permisos; siguen existiendo como destinos internos y para compatibilidad.

## Navegación móvil

Archivo: `app/page.tsx`

La tabbar móvil prioriza:

- `dashboard`
- `reading`
- `notebook`
- `profile`

El resto queda en **Más**.

Constante: `MOBILE_PRIMARY_NAV_IDS`. Si hay más de cuatro secciones visibles, la tabbar muestra esas cuatro más el botón **Más**.

## Navegación directa (compatibilidad)

Las secciones hijas siguen registradas en el outlet. Código que hace `setActiveTab("search")`, `setActiveTab("prayers")` o abre `/?strong=G25` activa la sección standalone **sin** los tabs del hub.

| Origen | Destino | Vista |
|--------|---------|-------|
| Dashboard → Buscar | `search` | Búsqueda sin tabs de Leer |
| Header móvil → lupa | `search` | Igual |
| `NotificationBell` → oración | `prayers` | Oración sin tabs de Notas |
| Deep link `/?strong=G25` | `dictionary` | Diccionario standalone |

Para mostrar el hub, navega al padre (`reading`, `notebook`, `profile`). Guía para desarrolladores: [`docs/nuevas-secciones.md`](../docs/nuevas-secciones.md).

## Tabs anidados en Notas

`NotesHub` envuelve `NotesSection`. El tab **Notas** del hub contiene las pestañas internas Libretas · Diario · Biblioteca; **Devocional** del hub y **Diario** interno renderizan el mismo componente `Devotionals`. Es intencional para mantener paridad con la estructura móvil previa.

## Validación

```bash
npx tsc --noEmit
npm run build
```

## Documentación relacionada

| Documento | Contenido |
|-----------|-----------|
| [`docs/nuevas-secciones.md`](../docs/nuevas-secciones.md) | Cómo añadir secciones, hubs, `HIDDEN_CHILD_SECTIONS` |
| [`docs/notas-web-paridad-movil.md`](../docs/notas-web-paridad-movil.md) | `NotesHub` y editor de notas |
| [`23-paridad-web-mobile-global.md`](./23-paridad-web-mobile-global.md) | Shell móvil global (tabbar flotante, header) |

