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
| DVG | `dvg` | Oscuro, solo administradores | Base borgoña, acciones rojas, bordes dorados y alto contraste |
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

En DVG, las acciones y el foco se mantienen rojos; los bordes, inputs y
contornos de énfasis usan dorado cálido. `lib/note-editor-theme.ts` refleja el
mismo `primarySoft` borgoña y `primaryBorder` dorado del móvil para el editor
de notas.

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

## Iconos compartidos

Web y móvil consumen el set canónico de SVG en
[`assets/icons`](../assets/icons). Cada icono usa un lienzo de 24 px, trazo
redondeado de 1.8 y `currentColor`; desktop parte de la misma fuente.

[`components/ui/app-icon.tsx`](../components/ui/app-icon.tsx) lo renderiza
como máscara CSS. Por ello, las clases de color existentes (`text-primary`,
`text-muted-foreground`, etc.) conservan el comportamiento con todos los
temas, sin duplicar los activos en `public`.

- La ruta `/api/assets/icons/:name` sirve solo los identificadores permitidos
  en [`lib/app-icons.ts`](../lib/app-icons.ts); no permite solicitar rutas
  arbitrarias del servidor.
- Se migraron navegación lateral e inferior, hoja «Más», acciones globales
  del encabezado y el registro de secciones (Biblia, comunidad, grupos,
  notas, planes, calendario y herramientas de estudio).
- Los paneles internos que aún usan Lucide se mantienen por compatibilidad y
  deben pasar progresivamente a `<AppIcon name="…" />` usando nombres
  semánticos como `bible`, `community`, `groups` o `reading-plan`.

En móvil, [`mobile/components/ui/AppIcon.tsx`](../mobile/components/ui/AppIcon.tsx)
importa los mismos SVG con `react-native-svg`. Las pestañas, Inicio, accesos
rápidos, estadísticas, onboarding, Perfil y Notas ya usan esa capa. El detalle
de Metro y del mapa de referencias está documentado en
[`docs-mobile/30-iconos-compartidos-y-mapa-referencias.md`](../docs-mobile/30-iconos-compartidos-y-mapa-referencias.md).

La ilustración compartida del mapa vive en
[`assets/images/references-map-hero.png`](../assets/images/references-map-hero.png).
Web la muestra en la tarjeta y mientras genera el mapa; móvil la usa como
miniatura y portada de descarga. La ruta web
`/api/assets/images/references-map-hero` solo expone esa imagen permitida.

La carga web usa además
[`assets/images/references-map-loading.png`](../assets/images/references-map-loading.png):
una red nocturna de nodos y arcos bajo un degradado, con el indicador y estado
legibles encima. Está disponible solo como
`/api/assets/images/references-map-loading` y se muestra durante la descarga
de datos y mientras se construye el HTML interactivo.

Para añadir un icono: crear `assets/icons/<nombre>.svg`, añadir el nombre a
`APP_ICON_NAMES` y consumirlo con `<AppIcon name="<nombre>" />`.

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
