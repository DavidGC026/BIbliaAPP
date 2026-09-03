# Mejoras de uso diario en la web (portadas del plan maestro móvil)

Fecha: julio 2026

## Origen

[docs-mobile/20-plan-maestro-mejoras-generales.md](../docs-mobile/20-plan-maestro-mejoras-generales.md)
documenta mejoras ya hechas en la app móvil. Este documento registra cuáles se
portaron a la web y cuáles quedan pendientes.

## Portado a la web

### 1. Continuar lectura (móvil: "Continuidad de lectura")

- [`lib/reader-state.ts`](../lib/reader-state.ts) — `saveLastReading()` /
  `loadLastReading()` guardan en `localStorage` (`biblia_last_reading`) la
  Biblia, libro, capítulo y nombre del libro de la última lectura. Igual que en
  móvil, la preferencia es local al dispositivo, no viaja con la cuenta.
- [`components/bible-reader/index.tsx`](../components/bible-reader/index.tsx):
  - guarda la posición cada vez que se resuelve un capítulo;
  - al abrir **Leer** sin navegación explícita (sin props de navegación ni
    query params `?book=&chapter=`), restaura la última posición en lugar de
    empezar siempre en Génesis 1. Los deep links y la navegación interna
    (búsqueda, favoritos, referencias) siguen teniendo prioridad.
- [`components/dashboard.tsx`](../components/dashboard.tsx) — tarjeta
  **Continuar lectura** bajo el versículo del día con la referencia
  (`Juan 3`, por ejemplo); al tocarla abre el lector en ese capítulo vía
  `handleSelectVerse`.

### 2. Recientes inteligentes en Inicio (móvil: "Recientes inteligentes")

En [`components/dashboard.tsx`](../components/dashboard.tsx), para usuarios con
sesión:

- **Favoritos recientes** — hasta 3 desde `/api/favorites` (ya ordenados por
  fecha en el API), con texto del versículo y navegación directa al pasaje.
- **Subrayados recientes** — hasta 3 desde `/api/highlights/all`, igual.
- Ambos bloques enlazan a las secciones completas (`favorites`, `highlights`).
- El Dashboard recibió la prop `onSelectVerse` (conectada a
  `ctx.handleSelectVerse` en
  [`lib/app-section-registry/sections.client.tsx`](../lib/app-section-registry/sections.client.tsx))
  para abrir el lector en un versículo puntual.

Los devocionales recientes ya existían en la web.

### 3. Historial de búsqueda (móvil: "Búsqueda universal — historial local")

- [`lib/search-history.ts`](../lib/search-history.ts) — últimas 10 búsquedas en
  `localStorage` (`biblia_search_history`), sin duplicados
  (case-insensitive).
- [`components/search-advanced.tsx`](../components/search-advanced.tsx) —
  chips de **Búsquedas recientes** entre el formulario y los resultados:
  tocar un chip repite la búsqueda, la `×` quita una entrada y **Borrar todo**
  vacía el historial. Cada búsqueda exitosa se registra.
- Nota: el buscador interno del lector
  ([`components/bible-reader/reader-search.tsx`](../components/bible-reader/reader-search.tsx))
  ya tenía su propio historial (`recent_searches`); se dejó como está.

### 4. Acciones rápidas configurables

- [`lib/home-actions.ts`](../lib/home-actions.ts) centraliza el catálogo web,
  la validación y la persistencia local.
- [`components/home-quick-actions.tsx`](../components/home-quick-actions.tsx)
  permite activar o desactivar accesos desde Inicio, conservando al menos uno.
- La web ofrece solo destinos reales: lectura, búsqueda, notas, estadísticas,
  actividad, diccionario y comunidad. Las descargas nativas y la creación de
  imagen desde una selección no se presentan como rutas independientes.

### 5. Preferencias completas del lector

- [`lib/reader-preferences.ts`](../lib/reader-preferences.ts) guarda tamaño,
  densidad, alineación y tema, y migra la clave anterior `bible_font_size`.
- [`components/bible-reader/reader-settings.tsx`](../components/bible-reader/reader-settings.tsx)
  presenta controles equivalentes a mobile.
- El lector ofrece Auto, Claro, Sepia, Noche y Contraste, además de lectura
  amplia/compacta y alineación izquierda/justificada.

La auditoría y sus decisiones completas están en
[`docs/auditoria-paridad-mobile-web-julio-2026.md`](auditoria-paridad-mobile-web-julio-2026.md).

## Pendiente de portar (candidatos siguientes)

| Mejora móvil | Estado en web | Notas |
|--------------|---------------|-------|
| Compartir unificado (`mobile/lib/share.ts`) | Parcial | El lector y el versículo del día comparten con formatos propios; falta un módulo común con formato/créditos consistentes. |
| Onboarding ligero descartable | No | Siguiente candidato corto; debe enlazar a destinos web reales. |
| Búsqueda universal multifuente | No | La búsqueda web actual es bíblica; falta agregar notas, devocionales y diccionario. |
| Exportar notas a PDF | No | En móvil usa `expo-print`; en web podría hacerse con la impresión del navegador. |
| Descargas offline | No aplica | Es una capacidad nativa; la web es siempre online. |

## Verificación

```bash
npx tsc --noEmit
```

Pruebas manuales:

1. Abrir **Leer**, navegar a un libro/capítulo, recargar la página y volver a
   **Leer**: debe restaurar la última posición.
2. En el Dashboard debe aparecer **Continuar lectura** con esa referencia y
   abrir el lector al tocarla.
3. Un deep link (`/?book=43&chapter=3&verse=16`) debe seguir teniendo
   prioridad sobre la restauración.
4. Con sesión: marcar un favorito y un subrayado, volver al Dashboard y ver
   los bloques de recientes; tocar uno abre el lector en el pasaje.
5. En **Buscador Avanzado**: buscar algo, vaciar el campo y ver el chip;
   tocarlo repite la búsqueda; probar quitar uno y "Borrar todo".
