# Temas visuales en la web (paridad con móvil)

## Objetivo

La web ofrece las mismas paletas de apariencia que la app móvil (ver
[docs-mobile/25-temas-visuales-y-dvg.md](../docs-mobile/25-temas-visuales-y-dvg.md)).
El antiguo botón claro/oscuro se reemplazó por un **selector de apariencia**
con vista previa de cada paleta, descripción y marca del tema activo.

## Temas disponibles

| Tema | Valor (`next-themes`) | Tipo | Intención visual |
|------|----------------------|------|------------------|
| Sistema | `system` | Dinámico | Sigue el modo claro/oscuro del dispositivo |
| Claro | `light` | Claro | Superficie neutra, limpia y luminosa |
| Oscuro | `dark` | Oscuro | Lectura nocturna con acentos dorados |
| Sepia | `sepia` | Claro | Papel cálido para sesiones largas de lectura |
| Sepia oscuro | `sepia-dark` | Oscuro | Marrones profundos, texto crema y acentos ámbar |
| Medianoche | `midnight` | Oscuro | Azul profundo con acentos azul lavanda |
| Bosque | `forest` | Oscuro | Verde sereno con acentos esmeralda |
| Lavanda | `lavender` | Claro | Fondo suave, elegante y de bajo contraste |
| DVG | `dvg` | Oscuro, solo administradores | Base borgoña, rojo principal y alto contraste |
| UBG | `ubg` | Oscuro, solo administradores | Base verde petróleo, verde principal y acentos azules |

## Arquitectura

### Paletas CSS — [`app/globals.css`](../app/globals.css)

Cada tema es una clase en el elemento `<html>` (`.sepia`, `.midnight`, `.dvg`, …)
que redefine las variables semánticas de Tailwind v4 (`--background`,
`--foreground`, `--card`, `--primary`, `--destructive`, las de sidebar, etc.).
Los valores provienen de [`mobile/constants/Colors.ts`](../mobile/constants/Colors.ts)
con este mapeo de tokens móviles → web:

| Token móvil | Variable web |
|-------------|--------------|
| `background` | `--background` |
| `text` | `--foreground`, `--card-foreground`, … |
| `textMuted` | `--muted-foreground` |
| `card` | `--card`, `--popover` |
| `cardMuted` | `--sidebar` |
| `muted` | `--muted`, `--secondary` |
| `accent` | `--accent` |
| `primary` / `primaryForeground` | `--primary` / `--primary-foreground` |
| `tint` | `--ring`, `--chart-1` |
| `danger` | `--destructive` |
| `border` / `input` | `--border` / `--input` |

Como las pantallas solo consumen variables semánticas, ningún componente
necesita conocer los temas nuevos.

Dos detalles adicionales en `globals.css`:

- La variante `dark:` de Tailwind se amplió para activarse también con las
  clases de los temas oscuros (`.sepia-dark`, `.midnight`, `.forest`, `.dvg`,
  `.ubg`), no solo con `.dark`.
- Los temas personalizados declaran `color-scheme` (light/dark) porque
  `next-themes` solo lo ajusta para `light`/`dark` (afecta scrollbars y
  controles nativos).

### Registro de temas — [`app/layout.tsx`](../app/layout.tsx)

El `ThemeProvider` (next-themes, `attribute="class"`) recibe la lista completa
en la prop `themes`. La selección persiste en `localStorage` bajo la clave
`theme` (equivalente web de `bibliaapp_theme_mode` en móvil) y el script
anti-flash de next-themes aplica la clase antes de la hidratación.

### Selector de apariencia — [`components/theme-toggle.tsx`](../components/theme-toggle.tsx)

`ThemeToggle` (usado en la barra lateral de escritorio y en el header móvil de
[`app/page.tsx`](../app/page.tsx)) abre un menú con:

- miniatura con fondo, tarjeta, línea de texto y color principal;
- nombre y descripción del ambiente;
- indicador de selección y semántica `menuitemradio`;
- distintivo `ADMIN` en DVG y UBG.

Exporta `THEME_OPTIONS` y `ADMIN_ONLY_THEMES` por si otra pantalla necesita
la lista.

### Utilidades de tema oscuro — [`lib/theme.ts`](../lib/theme.ts)

Equivalente web del `isDarkTheme` de
[`mobile/context/ThemeContext.tsx`](../mobile/context/ThemeContext.tsx):
`DARK_THEMES` e `isDarkThemeName()`. Lo consumen:

- [`components/references-rainbow-map.tsx`](../components/references-rainbow-map.tsx)
  para elegir la variante oscura del mapa arcoíris;
- [`lib/note-editor-theme.ts`](../lib/note-editor-theme.ts), que además lee las
  variables CSS vivas del documento y resuelve `primarySoft`/`primaryBorder`
  por tema (esos dos tokens no existen como variables CSS).

Cualquier código nuevo que necesite saber "¿el tema activo es oscuro?" debe
usar `isDarkThemeName(resolvedTheme)` — nunca `resolvedTheme === "dark"`, que
ignoraría medianoche, bosque, sepia oscuro, DVG y UBG.

## Restricción administrativa de DVG y UBG

Igual que en móvil:

```text
tema DVG/UBG + rol admin        → conservar el tema
tema DVG/UBG + cualquier otro   → volver a Sistema
```

- El selector oculta DVG y UBG salvo que `/api/auth/me` devuelva
  `role === "admin"` (misma clave SWR que `app/page.tsx`, la petición se
  deduplica).
- Un `useEffect` en `ThemeToggle` revierte a `system` un tema solo-admin
  persistido en `localStorage` por una sesión administrativa anterior, en
  cuanto se resuelve la sesión y el usuario no es admin (incluye invitados).

Nota: como la clase se aplica antes de la hidratación, un no-admin con el tema
persistido puede ver la paleta DVG/UBG durante un instante hasta que la sesión
se resuelve y se revierte. Es cosmético; la restricción es de apariencia, no de
acceso a datos.

## Verificación

```bash
npx tsc --noEmit
npx next build
```

Pruebas manuales recomendadas:

1. Cambiar entre todos los temas desde el selector (sidebar escritorio y
   header móvil).
2. Recargar la página y confirmar que la selección persiste sin flash.
3. Con **Sistema** activo, cambiar el tema del sistema operativo.
4. Verificar que DVG y UBG solo aparecen con sesión `admin`.
5. Cerrar la sesión admin con DVG/UBG activo y confirmar el regreso a
   **Sistema**.
6. Revisar el mapa arcoíris de referencias y el editor de notas en un tema
   oscuro no-`dark` (p. ej. Medianoche): ambos deben usar su variante oscura.

## Añadir un tema nuevo

Checklist mínima (sin tocar componentes individuales):

1. [`app/globals.css`](../app/globals.css) — clase en `<html>` con variables
   semánticas, `color-scheme` y, si es oscuro, entrada en `@custom-variant dark`.
2. [`app/layout.tsx`](../app/layout.tsx) — valor en la prop `themes` del
   `ThemeProvider`.
3. [`components/theme-toggle.tsx`](../components/theme-toggle.tsx) — entrada en
   `THEME_OPTIONS` con miniatura y descripción.
4. [`lib/theme.ts`](../lib/theme.ts) — incluir en `DARK_THEMES` si el tema es
   oscuro (para `dark:` de Tailwind y `isDarkThemeName`).
5. [`lib/note-editor-theme.ts`](../lib/note-editor-theme.ts) — par
   `primarySoft` / `primaryBorder` en `PRIMARY_EXTRAS` (no existen como
   variables CSS).

Los componentes que consumen solo variables semánticas (`bg-background`,
`text-foreground`, etc.) no requieren cambios.

## Solución de problemas

### Base UI error #31 al abrir el selector

Base UI exige que `Menu.GroupLabel` (exportado como `DropdownMenuLabel`) viva
**dentro** de `Menu.Group` (`DropdownMenuGroup`). Si el label queda suelto en
`DropdownMenuContent`, al abrir el menú aparece el error #31.

Patrón correcto en [`components/theme-toggle.tsx`](../components/theme-toggle.tsx):

```tsx
<DropdownMenuContent>
  <DropdownMenuGroup>
    <DropdownMenuLabel>Apariencia</DropdownMenuLabel>
  </DropdownMenuGroup>
  …
</DropdownMenuContent>
```

El mismo patrón aplica a `SelectLabel` → `SelectGroup` en otros menús.

### `dark:` no aplica en Medianoche, Bosque, DVG, etc.

Comprobar que el tema esté listado en `@custom-variant dark` de
`globals.css` **y** en `DARK_THEMES` de `lib/theme.ts`. Solo `.dark` no basta.

### Color automático del editor de notas

El marcador `.note-color-auto` se resuelve con las variables del tema activo vía
[`lib/note-editor-theme.ts`](../lib/note-editor-theme.ts). Si un tema nuevo no
tiene entrada en `PRIMARY_EXTRAS`, el editor cae al fallback claro.

## Documentación relacionada

| Documento | Relación |
|-----------|----------|
| [docs-mobile/25-temas-visuales-y-dvg.md](../docs-mobile/25-temas-visuales-y-dvg.md) | Origen móvil: `Colors.ts`, `ThemeSwitch`, `AdminThemeGuard` |
| [estilos-moviles-web.md](./estilos-moviles-web.md) | Viewport global (`interactiveWidget`) que afecta a toda la app |
| [mejoras-uso-diario-web.md](./mejoras-uso-diario-web.md) | Temas globales vs. tema de superficie del lector (pendiente) |
| [desktop/docs/12-paridad-mobile-2026-07.md](../desktop/docs/12-paridad-mobile-2026-07.md) | Paridad de los diez temas en el cliente Tauri |
