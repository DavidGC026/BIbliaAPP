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

- Los tabs segmentados usan margen mobile más consistente (`mx-4`) y radio `rounded-2xl`.
- Cada opción usa `flex-1`, `rounded-xl` y tipografía más cercana al patrón mobile.

## Validación

```bash
npx tsc --noEmit
npm run build
```

## Primera fase funcional: navegación interna de estudio y notas

Además de la paridad visual del shell, se inició la consolidación funcional de los hubs web para que sigan la misma arquitectura que mobile:

- **Leer** usa `Lector / Buscar / Referencias / Diccionario / Planes`, igual que `mobile/app/(tabs)/bible.tsx`.
- **Notas** elimina el doble nivel de tabs y presenta una única fila: `Notas / Diario / Biblioteca / Planes / Oración`.
- Los cuatro primeros destinos reflejan `mobile/app/(tabs)/notes.tsx`; **Oración** se conserva como capacidad adicional de web.
- `Biblioteca` deja de aparecer como destino principal duplicado en la navegación web, aunque permanece registrada para permisos y enlaces existentes.
- Todos los tabs internos se filtran mediante `allowedSections` y las lecturas elegidas desde Planes abren el lector principal.

Archivos principales: `components/notes-section.tsx`, `lib/app-section-registry/sections.client.tsx` y `lib/app-section-registry/nav.client.tsx`.

### Temas visuales globales

Las paletas de lectura móviles (sepia, medianoche, bosque, lavanda, DVG, …) están portadas a la web con paridad de tokens y selector visual. La web añade **UBG** como paleta solo-admin exclusiva de escritorio.

| Área | Referencia |
|------|------------|
| Web | [`docs/temas-visuales-web.md`](../docs/temas-visuales-web.md) — `ThemeToggle`, `globals.css`, guard admin |
| Móvil | [`25-temas-visuales-y-dvg.md`](./25-temas-visuales-y-dvg.md) — `ThemeSwitch`, SecureStore, AdminThemeGuard |
| Notas (color Auto) | [`docs/notas-web-paridad-movil.md`](../docs/notas-web-paridad-movil.md) § Color automático |
