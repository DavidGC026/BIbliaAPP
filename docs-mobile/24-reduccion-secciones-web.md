# Reducción de secciones web

Fecha: julio 2026

## Objetivo

Reducir la cantidad de secciones visibles en la web, siguiendo el patrón de la app mobile: una sección principal contiene varios modos internos mediante tabs segmentados.

## Componente `SegmentTabs`

Archivo: `components/ui/segment-tabs.tsx`

Los tres hubs (`StudyHub`, `NotesHub`, `ProfileHub`) renderizan sus modos con `<SegmentTabs tabs active onChange />`. El mismo componente también usa `components/notes-section.tsx` para las pestañas internas Notas / Diario / Biblioteca.

| Prop | Tipo | Uso |
|------|------|-----|
| `tabs` | `{ key: T; label: string }[]` | Opciones visibles (ya filtradas por permisos en cada hub). |
| `active` | `T` | Clave del modo actual. |
| `onChange` | `(key: T) => void` | Cambia el modo (estado local en cada hub). |
| `className` | opcional | Clases extra en el contenedor externo. |

**Scroll en móvil:** la fila es horizontalmente desplazable (`overflow-x-auto`). Si hay **más de tres** tabs, aparece un indicador visual en el borde derecho (chevron pulsante + gradiente) solo en viewports `< md`. Detalle de layout, umbrales y consumidores: [23-paridad-web-mobile-global.md § Tabs segmentadas](./23-paridad-web-mobile-global.md#tabs-segmentadas-compartidas).

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

## Validación

```bash
npx tsc --noEmit
npm run build
```
