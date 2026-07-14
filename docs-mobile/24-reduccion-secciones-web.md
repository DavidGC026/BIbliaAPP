# Reducción de secciones web

Fecha: julio 2026

## Objetivo

Reducir la cantidad de secciones visibles en la web, siguiendo el patrón de la app mobile: una sección principal contiene varios modos internos mediante tabs segmentados.

## Agrupaciones

### Leer

Archivo: `lib/app-section-registry/sections.client.tsx`

La sección `reading` ahora renderiza `StudyHub` con tabs internos:

- **Lector**: `BibleReader` (misma etiqueta que mobile)
- **Buscar**: `SearchAdvanced`
- **Referencias**: `ReferencesExplorer`
- **Diccionario**: `StrongDictionary`
- **Planes**: `ReadingPlans` (visible para usuarios con permiso)

Al seleccionar un resultado de búsqueda se regresa automáticamente al modo **Lector**.
Al seleccionar una lectura desde **Planes** también se vuelve a **Lector** con el pasaje elegido (`setMode("reader")` dentro de `StudyHub`).

### Notas

La sección `notebook` usa una sola fila de tabs, equivalente a **Notas** en mobile:

- **Notas**: `NotebookSidebar`
- **Diario**: `Devotionals`
- **Biblioteca**: `PersonalLibrary`
- **Planes**: `ReadingPlans`
- **Oración**: `PrayerRequests` (función adicional de la web que se conserva)

Antes había dos navegaciones superpuestas: `NotesHub` mostraba `Notas / Devocional / Oración` y, al entrar en Notas, `NotesSection` volvía a mostrar `Notas / Diario / Biblioteca`. La consolidación deja una sola jerarquía, mantiene todas las funciones y respeta `allowedSections` para ocultar los tabs sin permiso.

Al abrir una lectura desde **Planes**, `handleSelectVerse` cambia a la sección **Leer** y posiciona el lector en el pasaje elegido.

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
- `library`
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

Archivo: `components/ui/segment-tabs.tsx`

- Tabs con scroll horizontal en móvil y gradiente + flecha cuando `tabs.length > 3`.
- **Notas** con cinco tabs muestra el hint en pantallas estrechas; con solo tres permisos activos, no.
- **Perfil** (6 tabs) y **Leer** (5 tabs) siempre superan el umbral en móvil.

## Documentación relacionada

- Hubs web (permisos, `HIDDEN_CHILD_SECTIONS`): [`docs/nuevas-secciones.md`](../docs/nuevas-secciones.md) § Hubs
- Planes de lectura (API, tres entradas, `setMode`): [`docs/planes-lectura.md`](../docs/planes-lectura.md)
- Paridad notas y editor: [`docs/notas-web-paridad-movil.md`](../docs/notas-web-paridad-movil.md)
- Shell visual global: [23-paridad-web-mobile-global.md](./23-paridad-web-mobile-global.md)

## Validación

```bash
npx tsc --noEmit
npm run build
```
