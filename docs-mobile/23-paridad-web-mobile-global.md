# Paridad visual mobile en la web

Fecha: julio 2026

## Objetivo

Hacer que la experiencia móvil de la web completa se parezca más a la app mobile, sin quitar funciones existentes ni limitar el diseño solo a Notas.

## Referencias revisadas

- `mobile/app/(tabs)/_layout.tsx`: estructura de tabs nativa, altura de tabbar, safe-area, header limpio y títulos compactos.
- `mobile/constants/Colors.ts`: paleta base mobile (`background`, `card`, `border`, `tint`, `textMuted`).
- `mobile/constants/theme.ts`: radios, espaciado y sombras usadas por la app.

## Cambios aplicados en web

## Ajuste visible posterior

Después del primer pase se reforzó la diferencia visual para que el cambio sea evidente en dispositivos móviles:

- La tabbar inferior pasó a ser una barra flotante (`bottom: 12px`, laterales `12px`, `rounded-[26px]`, sombra fuerte) en lugar de una barra pegada al borde.
- El estado activo del tabbar usa fondo primario sólido dentro del icono.
- El menú **Más** cambió de grid compacto a lista vertical táctil con icono, etiqueta y flecha; esto se parece más a una hoja de opciones mobile.
- Todas las secciones pasan por `mobile-section-shell` en `lib/app-section-registry/outlet.tsx`, con padding mobile común y alturas `100dvh` para layouts `fullscreen`, `card` y `notebook`.
- Se aumentó el espacio inferior del contenido móvil para que la tabbar flotante no tape controles.

### Shell móvil global

Archivo: `app/page.tsx`

- El `main` ahora usa `min-h-[100dvh]` en móvil para comportarse como app instalada y evitar saltos visuales por la barra del navegador.
- El header móvil se rediseñó con:
  - altura de `58px`, similar a una barra nativa compacta;
  - fondo `background/95` y borde ligero;
  - logo en contenedor `rounded-xl` con borde;
  - título principal de sección y subtítulo con el nombre de la iglesia/app;
  - botones de acción en cuadrados `size-9 rounded-xl`, consistentes con controles móviles.
- El área de contenido móvil elimina el padding genérico de escritorio (`p-0 md:p-6`) para que cada sección respete su propio layout mobile.
- El contenido deja espacio para la tabbar con `pb-[calc(72px+env(safe-area-inset-bottom))]`.

### Tabbar inferior

Archivo: `app/page.tsx`

- La navegación inferior ahora usa altura `72px + safe-area`.
- Se añadió `env(safe-area-inset-bottom)` para iOS/Android webview.
- El estado activo usa un contenedor de icono tipo pill (`size-8 rounded-xl bg-primary/10`) en lugar de escalar todo el botón.
- Las etiquetas se mantienen compactas y con truncado para evitar solapes.

### Hoja "Más"

Archivo: `app/page.tsx`

- El menú de más funciones se convirtió en una hoja inferior con:
  - handle superior;
  - borde superior y radio `22px`;
  - grid de acciones más táctil;
  - padding inferior con safe-area.

### Estilos base mobile

Archivo: `app/globals.css`

- Se añadió una capa `@media (max-width: 767px)` para:
  - usar `100dvh` y fondo uniforme;
  - mejorar scroll táctil con `-webkit-overflow-scrolling: touch`;
  - contener overscroll;
  - respetar safe-area lateral en header/tabbar;
  - usar `font-size: 16px` en inputs móviles para evitar zoom automático en iOS.

### Tabs segmentadas compartidas

Archivo: `components/ui/segment-tabs.tsx`

Componente genérico `<SegmentTabs tabs active onChange />` usado por los hubs de sección (`StudyHub`, `NotesHub`, `ProfileHub` en `lib/app-section-registry/sections.client.tsx`) y por las pestañas internas de `components/notes-section.tsx`.

**Layout**

- Contenedor relativo con margen mobile (`mx-4 mt-3 mb-2`) y radio `rounded-2xl`.
- Fila de botones con `overflow-x-auto`, `scrollbar-none` y `flex-1` por tab (`min-w-fit shrink-0`).
- Tipografía `text-[13px] font-extrabold`; activo con `bg-primary/10 text-primary`.

**Indicador de deslizamiento (julio 2026, commit `cd6d916`)**

Cuando hay más de tres tabs visibles (`tabs.length > 3`), la fila puede desbordarse en pantallas estrechas. En móvil se muestra una pista visual de scroll horizontal:

| Condición | Comportamiento |
|-----------|----------------|
| `tabs.length <= 3` | Sin indicador (ej. `NotesSection`: Notas / Diario / Biblioteca). |
| `tabs.length > 3` | Overlay decorativo en el borde derecho, solo `< md` (`md:hidden`). |
| Escritorio (`md+`) | Sin overlay; padding normal (`md:pr-1`). |

Implementación:

- La fila de tabs usa `pr-9` en móvil para dejar espacio al indicador; en desktop vuelve a `md:pr-1`.
- Overlay `pointer-events-none` con gradiente `from-card via-card/95 to-transparent` y `ChevronRight` con `animate-pulse` dentro de un círculo con borde.
- `aria-hidden="true"` — es decorativo; el scroll sigue siendo gesto nativo sobre la fila de botones.

**Quién activa el indicador**

| Pantalla | Tabs máx. | ¿Indicador? |
|----------|-----------|-------------|
| `ProfileHub` (todos los permisos) | 6 | Sí |
| `StudyHub` (usuario + permisos completos) | 5 | Sí |
| `NotesHub` | 3 | No |
| `NotesSection` (dentro del hub) | 3 | No |

Los tabs visibles en cada hub se filtran con `ctx.allowedSections` (y `ctx.user` para Planes en StudyHub); usuarios con menos permisos pueden ver ≤3 tabs y no verán el indicador aunque el hub lo soporte.

**Añadir tabs a un hub**

1. Pasar el array `{ key, label }[]` a `<SegmentTabs />`; no hace falta lógica extra para el indicador.
2. Si esperas >3 tabs en móvil, prueba en viewport ~360px que el último tab siga siendo alcanzable al deslizar.
3. Para cambiar el umbral, edita `showScrollHint = tabs.length > 3` en `segment-tabs.tsx` (afecta todos los consumidores).

Ver también: [24-reduccion-secciones-web.md](./24-reduccion-secciones-web.md) (agrupación en hubs).

## Validación

```bash
npx tsc --noEmit
npm run build
```
