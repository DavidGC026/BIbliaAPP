# Web móvil — paridad visual con la app

Guía para desarrolladores sobre el shell móvil de la web Next.js (julio 2026). Alinea la experiencia en viewport `< 768px` con la app React Native, sin quitar secciones ni limitar el rediseño a Notas.

**Referencia móvil:** [`docs-mobile/23-paridad-web-mobile-global.md`](../docs-mobile/23-paridad-web-mobile-global.md)

---

## Resumen

| Área | Archivo | Cambio |
|------|---------|--------|
| Shell y layout | `app/page.tsx` | `100dvh`, header 58px, tabbar 72px + safe-area, hoja «Más» |
| Estilos base | `app/globals.css` | Clases `.mobile-app-*` bajo `@media (max-width: 767px)` |
| Tabs segmentadas | `components/ui/segment-tabs.tsx` | Márgenes y radios alineados al patrón mobile |

La sección **Notas** tiene paridad adicional de editor y listas en [`notas-web-paridad-movil.md`](./notas-web-paridad-movil.md) y [`docs-mobile/22-notas-diseno-profesional.md`](../docs-mobile/22-notas-diseno-profesional.md).

---

## Shell móvil (`app/page.tsx`)

### Contenedor principal

- `<main>` usa `mobile-app-shell` y `min-h-[100dvh]` en móvil (`md:min-h-screen` en escritorio).
- El área de contenido quita padding horizontal en móvil (`p-0 md:p-6`) para que cada sección controle su propio layout.
- Reserva espacio inferior para la tabbar: `pb-[calc(72px+env(safe-area-inset-bottom))]`.

### Header móvil (`.mobile-app-header`)

- Altura fija `58px`, fondo `background/95`, borde inferior suave.
- Logo en contenedor `size-9 rounded-xl` con borde.
- Título de sección activa (`17px`, extrabold) + subtítulo con nombre de iglesia (`11px`).
- Acciones (buscar, usuarios, login/logout) en botones `size-9 rounded-xl` con borde, no iconos sueltos.

### Tabbar inferior (`.mobile-tabbar`)

- Altura `calc(72px + env(safe-area-inset-bottom))`, fija al fondo.
- Icono activo dentro de pill `size-8 rounded-xl bg-primary/10` (no escala todo el botón).
- Etiquetas `10px`, truncadas para evitar solapes.

### Hoja «Más»

- Bottom sheet con handle superior, radio `22px`, grid táctil `min-h-[82px]` por celda.
- Padding inferior incluye `env(safe-area-inset-bottom)`.

---

## Estilos base (`app/globals.css`)

Bajo `@media (max-width: 767px)`:

| Clase / regla | Propósito |
|---------------|-----------|
| `.mobile-app-shell` | `min-height: 100dvh`, fondo uniforme |
| `.mobile-app-header`, `.mobile-tabbar` | `padding-left/right: max(1rem, env(safe-area-inset-*))` |
| `.mobile-web-content` | Scroll táctil (`-webkit-overflow-scrolling: touch`), `overscroll-behavior: contain` |
| `input/textarea/select` en `.mobile-web-content` | `font-size: 16px` — evita zoom automático en iOS al enfocar |
| `body` | `overscroll-behavior-y: none`, sin tap highlight |

---

## Tabs segmentadas compartidas

`SegmentTabs` (`components/ui/segment-tabs.tsx`) se usa en Notas y otras secciones:

- Móvil: `mx-4`, contenedor `rounded-2xl`.
- Cada opción: `flex-1`, `rounded-xl`, `font-extrabold`.

---

## Cómo probar

1. Abre DevTools → modo responsive, ancho &lt; 768px (o dispositivo real).
2. Navega por Inicio, Biblia, Comunidad, Grupos y **Más**: header, tabbar y safe-area deben verse estables al scroll.
3. En iOS Safari, enfoca un input en cualquier sección: no debe hacer zoom si el campo está dentro de `.mobile-web-content`.
4. Abre **Más** y comprueba handle, cierre y que el grid no quede tapado por el home indicator.

```bash
npx tsc --noEmit
npm run build
```

---

## Problemas frecuentes

| Síntoma | Causa habitual | Qué revisar |
|---------|----------------|-------------|
| Contenido tapado por la tabbar | Falta `pb-[calc(72px+env(...))]` en el contenedor scroll | `app/page.tsx` |
| Salto de altura al mostrar/ocultar barra del navegador | Uso de `100vh` en lugar de `100dvh` | `main`, `.mobile-app-shell` |
| Zoom al escribir en iOS | `font-size` &lt; 16px en inputs | `.mobile-web-content input` en `globals.css` |
| Header/tabbar pegados al notch | Sin safe-area lateral | clases `.mobile-app-header` / `.mobile-tabbar` |
| Sección con doble padding en móvil | Padding global + padding de la sección | outlet de la sección (`lib/app-section-registry/outlet.tsx`) |

---

## Despliegue

Tras cambios en `app/page.tsx` o `app/globals.css`:

```bash
docker restart biblia2-app
docker logs -f biblia2-app   # esperar "Ready"
curl -s http://127.0.0.1:3003/api/health
```

Recarga con **Ctrl+Shift+R** en el navegador móvil o PWA.

---

*Última revisión: julio 2026 (commit «Alinea experiencia mobile web con app»).*
