# Paridad visual mobile en la web

Fecha: julio 2026

## Objetivo

Hacer que la experiencia móvil de la web completa se parezca más a la app mobile, sin quitar funciones existentes ni limitar el diseño solo a Notas.

## Referencias revisadas

- `mobile/app/(tabs)/_layout.tsx`: estructura de tabs nativa, altura de tabbar, safe-area, header limpio y títulos compactos.
- `mobile/constants/Colors.ts`: paleta base mobile (`background`, `card`, `border`, `tint`, `textMuted`).
- `mobile/constants/theme.ts`: radios, espaciado y sombras usadas por la app.

## Cambios aplicados en web

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

- Los tabs segmentados usan margen mobile más consistente (`mx-4`) y radio `rounded-2xl`.
- Cada opción usa `flex-1`, `rounded-xl` y tipografía más cercana al patrón mobile.

## Validación

```bash
npx tsc --noEmit
npm run build
```

