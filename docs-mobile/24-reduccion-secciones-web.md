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
- **Planes**: `ReadingPlans` (visible para usuarios con permiso)

Al seleccionar un resultado de búsqueda se regresa automáticamente al modo **Biblia**.
Al seleccionar una lectura desde **Planes** también se vuelve a **Biblia** con el pasaje elegido.

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

## Componente SegmentTabs

Archivo: `components/ui/segment-tabs.tsx`.

- Umbral del indicador de scroll: `tabs.length > 3` (estricto).
- StudyHub (5 tabs) y ProfileHub (6 tabs) muestran hint en viewports móviles; NotesHub (3 tabs) no.

## Documentación relacionada

- [`../docs/nuevas-secciones.md`](../docs/nuevas-secciones.md) § Hubs — registro en `sections.client.tsx`
- [`../docs/planes-lectura.md`](../docs/planes-lectura.md) — API, StudyHub vs ProfileHub, paridad móvil
- [`23-paridad-web-mobile-global.md`](./23-paridad-web-mobile-global.md) — shell móvil global y SegmentTabs
- [`22-notas-diseno-profesional.md`](./22-notas-diseno-profesional.md) § Refinamiento Planes — UI móvil reciente

## Validación

```bash
npx tsc --noEmit
npm run build
```
