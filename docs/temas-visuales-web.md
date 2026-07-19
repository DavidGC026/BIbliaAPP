# Temas visuales web — paridad con móvil

Documentación del selector de **Apariencia** en la web (julio 2026), alineado con [`mobile/constants/Colors.ts`](../mobile/constants/Colors.ts) y [`docs-mobile/25-temas-visuales-y-dvg.md`](../docs-mobile/25-temas-visuales-y-dvg.md).

---

## Resumen

La web dejó de usar un botón binario claro/oscuro. Ahora expone las mismas paletas de lectura que la app móvil mediante un menú desplegable con miniatura, descripción e indicador de selección. La preferencia persiste en el navegador con `next-themes`; los tokens semánticos viven como clases CSS en `app/globals.css`.

---

## Temas disponibles

| ID (`value`) | Etiqueta | Tipo | Solo admin | Notas |
|--------------|----------|------|------------|-------|
| `system` | Sistema | Dinámico | No | Sigue `prefers-color-scheme` del SO |
| `light` | Claro | Claro | No | Base neutra luminosa |
| `dark` | Oscuro | Oscuro | No | Lectura nocturna con acentos dorados |
| `sepia` | Sepia | Claro | No | Papel cálido |
| `sepia-dark` | Sepia oscuro | Oscuro | No | Marrones profundos |
| `midnight` | Medianoche | Oscuro | No | Azul profundo |
| `forest` | Bosque | Oscuro | No | Verde sereno |
| `lavender` | Lavanda | Claro | No | Bajo contraste suave |
| `dvg` | DVG | Oscuro | **Sí** | Borgoña / rojo principal |
| `ubg` | UBG | Oscuro | **Sí** | Verde petróleo — **solo web** (no existe en mobile) |

Paridad móvil: los nueve primeros temas (sin UBG) coinciden con `THEME_OPTIONS` de [`components/theme-toggle.tsx`](../components/theme-toggle.tsx) y con el doc móvil 25.

---

## Archivos principales

| Archivo | Rol |
|---------|-----|
| [`app/globals.css`](../app/globals.css) | Clases `.sepia`, `.sepia-dark`, `.midnight`, `.forest`, `.lavender`, `.dvg`, `.ubg`; `@custom-variant dark`; `color-scheme` por paleta |
| [`app/layout.tsx`](../app/layout.tsx) | Registra los temas en `ThemeProvider` (`themes={[...]}`) |
| [`components/theme-provider.tsx`](../components/theme-provider.tsx) | Wrapper de `next-themes` |
| [`components/theme-toggle.tsx`](../components/theme-toggle.tsx) | Selector **Apariencia** (header y menú móvil en `app/page.tsx`) |
| [`components/ui/dropdown-menu.tsx`](../components/ui/dropdown-menu.tsx) | Primitivas Base UI (`Menu.Group`, `Menu.GroupLabel`, …) |
| [`lib/theme.ts`](../lib/theme.ts) | `DARK_THEMES` e `isDarkThemeName()` — fuente única para “¿es oscuro?” |
| [`lib/note-editor-theme.ts`](../lib/note-editor-theme.ts) | Colores del iframe de notas leídos de variables CSS + `PRIMARY_EXTRAS` por tema |
| [`components/references-rainbow-map.tsx`](../components/references-rainbow-map.tsx) | Mapa arcoíris del lector; usa `isDarkThemeName()` para contraste |

Mapeo de tokens móviles → web (comentado en `globals.css`): `text→foreground`, `textMuted→muted-foreground`, `card→card/popover`, `primary/tint→primary/ring`, etc.

---

## Selector de apariencia (`ThemeToggle`)

Ubicación: icono en la barra superior (`app/page.tsx`, varias instancias según layout desktop/móvil).

Comportamiento:

1. Carga la sesión con SWR (`GET /api/auth/me`) — misma clave que la página principal; deduplica la petición.
2. Filtra `THEME_OPTIONS`: oculta `dvg` y `ubg` si `role !== "admin"`.
3. Muestra miniatura (`ThemeSwatch`), nombre, descripción y marca **Admin** en paletas restringidas.
4. Cada opción actúa como `menuitemradio` con `aria-checked`.
5. El icono del botón cambia según el tema activo (Sistema / Sol / Luna / Paleta).

Persistencia: `next-themes` guarda la clase en `localStorage` (atributo `class` en `<html>`).

---

## Restricción administrativa (DVG / UBG)

Equivalente a `AdminThemeGuard` en [`mobile/app/_layout.tsx`](../mobile/app/_layout.tsx):

```text
tema dvg|ubg + rol admin  → conservar
tema dvg|ubg + otro rol   → volver a system
```

Implementación en `ThemeToggle`: `useEffect` que llama `setTheme('system')` cuando la sesión ya se resolvió y el usuario no es admin. Cubre una selección persistida de una sesión administrativa anterior.

---

## Temas oscuros y Tailwind `dark:`

Dos lugares deben coincidir al añadir una paleta oscura:

1. **`lib/theme.ts`** — incluir el id en `DARK_THEMES`.
2. **`app/globals.css`** — añadir la clase al selector de `@custom-variant dark`:

```css
@custom-variant dark (&:is(.dark *, .sepia-dark *, .midnight *, .forest *, .dvg *, .ubg *));
```

Sin el segundo paso, utilidades `dark:*` no aplican en sepia oscuro, medianoche, bosque, DVG ni UBG aunque la paleta sea visualmente oscura.

`color-scheme: dark` para scrollbars/controles nativos está declarado en bloques `.sepia-dark`, `.midnight`, `.forest`, `.dvg`, `.ubg`.

---

## Integración con editor de notas y mapa arcoíris

- **Color automático** (`.note-color-auto` en notas): resuelve `colors.text` del tema vigente vía [`lib/note-editor-theme.ts`](../lib/note-editor-theme.ts). Ver [`docs/notas-web-paridad-movil.md`](./notas-web-paridad-movil.md) § Color automático.
- **Mapa arcoíris**: `references-rainbow-map.tsx` elige colores de contraste con `isDarkThemeName(resolvedTheme)`; la biblia por defecto sale del catálogo (`defaultBibleId`), no de un id fijo.

---

## Solución de problemas

### Base UI error #31 al abrir Apariencia

**Síntoma:** al pulsar el icono de apariencia, la consola muestra `Base UI error #31` y el menú no se renderiza.

**Causa:** [`DropdownMenuLabel`](../components/ui/dropdown-menu.tsx) envuelve `MenuPrimitive.GroupLabel`. Base UI exige que `GroupLabel` viva **dentro** de un `Menu.Group`.

**Corrección** (commit `5fdf53c`):

```tsx
<DropdownMenuGroup>
  <DropdownMenuLabel>Apariencia</DropdownMenuLabel>
</DropdownMenuGroup>
```

**Regla para nuevos menús:** cualquier `DropdownMenuLabel` debe ir dentro de `DropdownMenuGroup`. Lo mismo aplica a `SelectLabel` → `SelectGroup` en [`components/ui/select.tsx`](../components/ui/select.tsx).

### Tema admin visible tras cerrar sesión de administrador

Esperado: al resolver `/api/auth/me` sin rol admin, `ThemeToggle` fuerza `system`. Si persiste, revisar caché SWR o recargar con sesión ya actualizada.

### Utilidades `dark:` no aplican en sepia oscuro / medianoche / …

Revisar que el id del tema esté en `@custom-variant dark` y en `DARK_THEMES`.

---

## Checklist: añadir un tema nuevo

1. Definir la clase y variables en `app/globals.css` (y `color-scheme` si aplica).
2. Registrar el id en `themes={[...]}` de `app/layout.tsx`.
3. Añadir entrada en `THEME_OPTIONS` de `theme-toggle.tsx` (con `preview` y `adminOnly` si corresponde).
4. Si es oscuro: actualizar `DARK_THEMES` y `@custom-variant dark`.
5. Añadir fila en `PRIMARY_EXTRAS` de `lib/note-editor-theme.ts`.
6. Probar selector, editor de notas (color Auto) y mapa arcoíris.
7. Actualizar este doc y, si hay paridad móvil, [`docs-mobile/25-temas-visuales-y-dvg.md`](../docs-mobile/25-temas-visuales-y-dvg.md).

---

## Verificación

```bash
npm run build
```

Pruebas manuales:

1. Abrir el menú **Apariencia** (desktop y móvil) — debe listar temas sin error en consola.
2. Cambiar entre todas las paletas visibles; recargar y confirmar persistencia.
3. Con **Sistema**, alternar modo claro/oscuro del SO.
4. Como admin: seleccionar DVG y UBG; cerrar sesión o entrar como usuario normal → debe volver a **Sistema**.
5. En notas, aplicar color **A** y alternar temas — el texto debe adaptarse.
6. En el lector, abrir mapa arcoíris en tema claro y oscuro — contraste legible.

---

## Documentos relacionados

| Documento | Contenido |
|-----------|-----------|
| [`docs-mobile/25-temas-visuales-y-dvg.md`](../docs-mobile/25-temas-visuales-y-dvg.md) | Selector móvil, SecureStore, AdminThemeGuard |
| [`docs/notas-web-paridad-movil.md`](./notas-web-paridad-movil.md) | Color automático del editor y paridad visual |
| [`docs-mobile/16-editor-webview-teclado-seleccion.md`](../docs-mobile/16-editor-webview-teclado-seleccion.md) | Editor móvil y tokens de color |
| [`docs-mobile/23-paridad-web-mobile-global.md`](../docs-mobile/23-paridad-web-mobile-global.md) | Shell global web ↔ mobile |

---

*Última revisión: julio 2026 (paridad temas `77869ca`; fix menú Base UI `5fdf53c`).*
