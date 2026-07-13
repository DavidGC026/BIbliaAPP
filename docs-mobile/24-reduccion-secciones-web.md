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
- **Planes**: `ReadingPlans` (solo usuarios logueados con permiso `plans`)

Al seleccionar un resultado de búsqueda se regresa automáticamente al modo **Biblia**.
Al seleccionar una lectura desde **Planes** también se vuelve a **Biblia** con el pasaje elegido (`handleSelectVerse` + `setMode("reader")`).

**Visibilidad del tab Planes en StudyHub** (julio 2026, commit «Hace planes visibles en lector web»):

```tsx
tab.key === "plans" && Boolean(ctx.user) && ctx.allowedSections.includes("plans")
```

Invitados con acceso a Biblia no ven Planes. El mismo componente en **ProfileHub** no cambia de tab al abrir un pasaje; en StudyHub sí regresa a Biblia.

**Documentación ampliada:** [`docs/planes-lectura.md`](../docs/planes-lectura.md) (API, permisos, planes de grupo).

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

## Validación

```bash
npx tsc --noEmit
npm run build
```
