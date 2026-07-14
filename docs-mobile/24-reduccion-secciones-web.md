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

Al seleccionar un resultado de búsqueda se regresa automáticamente al modo **Biblia**.
Al seleccionar una lectura desde **Planes** también se vuelve a **Biblia** con el pasaje elegido.

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

## Validación

```bash
npx tsc --noEmit
npm run build
```

## Documentos relacionados

- Shell móvil global (tabbar flotante, `mobile-section-shell`): [`23-paridad-web-mobile-global.md`](./23-paridad-web-mobile-global.md).
- Notas web (tabs únicos, editor enriquecido, imágenes): [`docs/notas-web-paridad-movil.md`](../docs/notas-web-paridad-movil.md).
- Registro de secciones y permisos: [`docs/nuevas-secciones.md`](../docs/nuevas-secciones.md).
