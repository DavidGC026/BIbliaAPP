# Paridad visual mobile en la web

Fecha: julio 2026

## Objetivo

Hacer que la experiencia móvil de la web completa se parezca más a la app mobile, sin quitar funciones existentes ni limitar el diseño solo a Notas.

**Documentación web (desarrolladores):** [`../docs/web-mobile-paridad-global.md`](../docs/web-mobile-paridad-global.md)

## Referencias revisadas

- `mobile/app/(tabs)/_layout.tsx`: estructura de tabs nativa, altura de tabbar, safe-area, header limpio y títulos compactos.
- `mobile/constants/Colors.ts`: paleta base mobile (`background`, `card`, `border`, `tint`, `textMuted`).
- `mobile/constants/theme.ts`: radios, espaciado y sombras usadas por la app.

## Cambios aplicados en web

### Ajuste visible posterior (`76e6add`)

Después del primer pase se reforzó la diferencia visual para que el cambio sea evidente en dispositivos móviles:

- La tabbar inferior pasó a ser una barra flotante (`bottom: 12px`, laterales `12px`, `rounded-[26px]`, sombra fuerte) en lugar de una barra pegada al borde.
- El estado activo del tabbar usa fondo primario sólido dentro del icono (`bg-primary text-primary-foreground`).
- El menú **Más** cambió de grid compacto a lista vertical táctil con icono, etiqueta y flecha `ArrowRight`.
- Todas las secciones pasan por `mobile-section-shell` en `lib/app-section-registry/outlet.tsx`, con padding mobile común (`14px`) y alturas `100dvh` para layouts `fullscreen`, `card` y `notebook`.
- Se aumentó el espacio inferior del contenido móvil (`pb: 96px + safe-area`) para que la tabbar flotante no tape controles.

### Shell móvil global

Archivo: `app/page.tsx`

- El `main` usa `min-h-[100dvh]` en móvil para comportarse como app instalada y evitar saltos visuales por la barra del navegador.
- El header móvil (`mobile-app-header`):
  - altura `64px`;
  - fondo `background/98` y borde ligero;
  - logo en contenedor `rounded-xl` con borde;
  - título principal de sección y subtítulo con el nombre de la iglesia/app;
  - botones de acción en cuadrados `size-9 rounded-xl`.
- El área de contenido móvil elimina el padding genérico de escritorio (`p-0 md:p-6`) para que cada sección respete su propio layout mobile.
- El contenido deja espacio para la tabbar flotante con `pb-[calc(96px+env(safe-area-inset-bottom))]`.

### Tabbar inferior

Archivo: `app/page.tsx`

- Barra flotante: `fixed`, `left-3 right-3`, `bottom-[calc(12px+env(safe-area-inset-bottom))]`.
- Altura fija `72px`, `rounded-[26px]`, borde y sombra pronunciada.
- Estado activo: contenedor de icono `size-9 rounded-2xl bg-primary text-primary-foreground shadow-sm`.
- Las etiquetas se mantienen compactas y con truncado para evitar solapes.
- Safe-area lateral vía clase `mobile-tabbar` en `globals.css`.

### Hoja "Más"

Archivo: `app/page.tsx`

- Bottom sheet con handle, `rounded-t-[28px]`, `max-h-[84vh]`.
- Lista vertical de una columna: icono en caja `size-10`, etiqueta `text-sm font-extrabold`, flecha `ArrowRight`.
- Fila activa con fondo primario completo; padding inferior con safe-area.

### Envoltorio de secciones

Archivo: `lib/app-section-registry/outlet.tsx`

- Cada pestaña activa se renderiza dentro de `<section class="mobile-section-shell">`.
- Layouts `fullscreen`, `card` y `notebook` usan `h-[calc(100dvh-160px)]` en móvil (offset header + chrome inferior).
- En desktop (`md:`) se conservan bordes, radios y sombras originales.

### Estilos base mobile

Archivo: `app/globals.css`

- Capa `@media (max-width: 767px)` para:
  - usar `100dvh` y fondo uniforme;
  - mejorar scroll táctil con `-webkit-overflow-scrolling: touch`;
  - contener overscroll;
  - respetar safe-area lateral en header/tabbar;
  - definir `.mobile-section-shell` (padding `14px 14px 0`, `min-height: 100%`);
  - sombra sutil en `.mobile-app-header`;
  - usar `font-size: 16px` en inputs móviles para evitar zoom automático en iOS.

### Tabs segmentadas compartidas

Archivo: `components/ui/segment-tabs.tsx`

- Los tabs segmentados usan margen mobile más consistente (`mx-4`) y radio `rounded-2xl`.
- Cada opción usa `flex-1`, `rounded-xl` y tipografía más cercana al patrón mobile.

### Notas (paridad específica)

La sección Notas tiene documentación aparte con editor, fuentes e imágenes:

- Web: [`../docs/notas-web-paridad-movil.md`](../docs/notas-web-paridad-movil.md)
- Mobile: [`22-notas-diseno-profesional.md`](./22-notas-diseno-profesional.md)

El shell global anterior aplica también a Notas; el padding de `mobile-section-shell` convive con el layout `notebook` del registro de secciones.

## Validación

```bash
npx tsc --noEmit
npm run build
```

Prueba en viewport &lt; 768px: tabbar flotante, hoja **Más** en lista, scroll sin solapar controles, cambio de título en header al navegar.
