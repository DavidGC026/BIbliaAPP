# Temas visuales web — paridad con mobile

Documentación del selector de **Apariencia** en la web (julio 2026), portado desde las paletas móviles de [`docs-mobile/25-temas-visuales-y-dvg.md`](../docs-mobile/25-temas-visuales-y-dvg.md).

---

## Objetivo

La web deja de limitarse a claro/oscuro. El usuario elige una paleta global (sepia, medianoche, bosque, lavanda, etc.) que aplica a toda la interfaz: shell, hubs, editor de notas y mapa de referencias cruzadas.

Acceso: botón **Apariencia** en la barra superior (`components/theme-toggle.tsx`), visible en escritorio y móvil web (`app/page.tsx`).

---

## Temas disponibles

| Valor (`next-themes`) | Etiqueta | Tipo | Solo admin |
|----------------------|----------|------|------------|
| `system` | Sistema | Sigue `prefers-color-scheme` del dispositivo | No |
| `light` | Claro | Claro | No |
| `dark` | Oscuro | Oscuro | No |
| `sepia` | Sepia | Claro | No |
| `sepia-dark` | Sepia oscuro | Oscuro | No |
| `midnight` | Medianoche | Oscuro | No |
| `forest` | Bosque | Oscuro | No |
| `lavender` | Lavanda | Claro | No |
| `dvg` | DVG | Oscuro | Sí |
| `ubg` | UBG | Oscuro | Sí (solo web) |

**UBG** es una paleta administrativa adicional en web; no existe en el cliente móvil actual.

Las descripciones y miniaturas del selector están en `THEME_OPTIONS` dentro de `components/theme-toggle.tsx`, alineadas con `mobile/components/ThemeSwitch.tsx`.

---

## Arquitectura

```text
components/theme-toggle.tsx     → selector con vista previa + guard de admin
app/layout.tsx                  → ThemeProvider (next-themes) + lista de themes
app/globals.css                 → clases .sepia, .midnight, … con tokens CSS
lib/theme.ts                    → isDarkThemeName(), DARK_THEMES
lib/note-editor-theme.ts        → colores del iframe leyendo variables CSS
components/references-rainbow-map.tsx → colores del mapa según tema activo
components/note-rich-editor.tsx → remonta iframe al cambiar resolvedTheme
```

### Variables CSS y Tailwind

Cada paleta es una **clase en `<html>`** aplicada por `next-themes` (`attribute="class"`). En `app/globals.css` se redefine el mismo conjunto de tokens semánticos que usa shadcn/Tailwind:

`--background`, `--foreground`, `--card`, `--primary`, `--muted-foreground`, `--border`, `--sidebar-*`, etc.

Mapeo desde mobile (`Colors.ts`):

| Token móvil | Token web |
|-------------|-----------|
| `text` | `--foreground` |
| `textMuted` | `--muted-foreground` |
| `card` | `--card` / `--popover` |
| `cardMuted` | `--sidebar` |
| `muted` | `--secondary` / `--muted` |
| `accent` | `--accent` |
| `danger` | `--destructive` |
| `primary` / `tint` | `--primary` / `--ring` |

Los componentes que ya usan clases Tailwind semánticas (`bg-background`, `text-muted-foreground`, `border-border`) heredan la paleta sin cambios adicionales.

### Variante `dark:` de Tailwind

Los temas oscuros no son solo `.dark`. En Tailwind 4, `@custom-variant dark` en `globals.css` activa utilidades `dark:` también para `.sepia-dark`, `.midnight`, `.forest`, `.dvg` y `.ubg`:

```css
@custom-variant dark (&:is(.dark *, .sepia-dark *, .midnight *, .forest *, .dvg *, .ubg *));
```

`lib/theme.ts` expone la misma lista en `DARK_THEMES` para lógica JavaScript (mapa arcoíris, editor de notas).

### Persistencia

`next-themes` guarda la elección en `localStorage` (clave por defecto `theme`). Sobrevive recargas y cierres del navegador en el mismo origen.

En **Sistema**, `resolvedTheme` será `light` u `dark` según el dispositivo; las paletas con nombre propio (`sepia`, `midnight`, …) se aplican como clase directa.

### Restricción DVG / UBG (solo administradores)

Paridad con `AdminThemeGuard` móvil:

1. Las opciones `dvg` y `ubg` solo se muestran si `/api/auth/me` devuelve `user.role === "admin"`.
2. Si un no-admin tenía persistido un tema admin-only, un `useEffect` en `ThemeToggle` lo resetea a **Sistema**.

No hay bloqueo en CSS: la protección es de UI y sesión. Un admin que cierra sesión vuelve a ver solo temas públicos.

---

## Consumidores del tema activo

### Editor de notas

- `lib/note-editor-theme.ts` lee `--foreground`, `--card`, etc. del `<html>` y añade `primarySoft` / `primaryBorder` por paleta (no existen como variables CSS).
- `NoteRichEditor` y `NoteContent` incluyen `resolvedTheme` en las dependencias del `srcDoc`; al cambiar apariencia se regenera el HTML del iframe con los colores nuevos.
- El swatch **A (Auto)** de color de texto sigue resolviéndose con `colors.text` del tema vigente. Ver [`notas-web-paridad-movil.md`](./notas-web-paridad-movil.md) § Color automático.

### Mapa arcoíris de referencias

`components/references-rainbow-map.tsx`:

- Usa `isDarkThemeName(resolvedTheme)` para elegir contraste del HTML embebido (`lib/rainbow-html.ts`).
- Lee colores desde variables CSS del documento (`readRainbowTheme`).
- Resuelve la biblia del catálogo con `GET /api/bibles` → `defaultBibleId ?? bibles[0].bibleId` (ya no asume id fijo `149`).

### Shell y resto de la app

Cualquier componente con tokens semánticos de Tailwind se adapta solo. No hace falta `useTheme()` salvo para contenido embebido (iframe, `srcDoc`, canvas) que no hereda CSS del documento padre.

---

## Cómo añadir un tema nuevo

Checklist mínimo (evita paletas a medias):

1. **`app/globals.css`** — bloque `.{nombre}` con todos los tokens; si es oscuro, añadir la clase al `@custom-variant dark` y a `color-scheme: dark`.
2. **`app/layout.tsx`** — incluir el id en el array `themes` del `ThemeProvider`.
3. **`components/theme-toggle.tsx`** — entrada en `THEME_OPTIONS` (label, description, preview, `adminOnly` si aplica).
4. **`lib/theme.ts`** — añadir a `DARK_THEMES` si la paleta es oscura.
5. **`lib/note-editor-theme.ts`** — fila en `PRIMARY_EXTRAS` para el editor iframe.
6. **Mobile (si aplica)** — `Colors.ts`, `ThemeSwitch`, `ThemeContext.isDarkTheme`; ver doc 25.

---

## Cómo probar

```bash
npm run build
npm run start   # o npm run dev
```

1. Abrir la web → botón **Apariencia** (icono sol/luna/paleta según tema activo).
2. Recorrer todas las paletas; comprobar contraste en Inicio, Notas y Leer.
3. Con **Sepia oscuro** o **Medianoche**, verificar que componentes con `dark:` (bordes, overlays) se comportan como en tema Oscuro.
4. Abrir **Referencias → mapa arcoíris**; cambiar apariencia y confirmar que el iframe sigue legible.
5. En Notas, aplicar color **A**, cambiar a otra paleta y comprobar que el texto auto se adapta.
6. Como invitado o usuario normal: DVG/UBG no deben listarse; si `localStorage.theme` era `dvg`, debe volver a Sistema al cargar.
7. Como admin: elegir DVG o UBG, recargar, cerrar sesión → debe resetearse a Sistema.

---

## Despliegue

Tras cambios en `globals.css`, `theme-toggle.tsx` o `layout.tsx`:

```bash
docker restart biblia2-app
docker logs -f biblia2-app   # esperar "Ready"
```

Recarga forzada en el navegador (**Ctrl+Shift+R**).

---

## Documentos relacionados

| Documento | Relación |
|-----------|----------|
| [`docs-mobile/25-temas-visuales-y-dvg.md`](../docs-mobile/25-temas-visuales-y-dvg.md) | Origen móvil, SecureStore, AdminThemeGuard |
| [`notas-web-paridad-movil.md`](./notas-web-paridad-movil.md) | Color automático del editor y tokens del iframe |
| [`docs-mobile/16-editor-webview-teclado-seleccion.md`](../docs-mobile/16-editor-webview-teclado-seleccion.md) | Swatch **A** y marcador `.note-color-auto` |
| [`docs-mobile/23-paridad-web-mobile-global.md`](../docs-mobile/23-paridad-web-mobile-global.md) | Shell móvil web y paridad visual global |

---

*Última revisión: julio 2026 (commit 77869ca — portar temas visuales móviles a la web).*
