# Guía: añadir una nueva sección en BibliaAPP

Esta guía explica cómo registrar una pantalla nueva para que aparezca en el menú, en los permisos de usuarios y en el render automático de la app.

## Resumen rápido

| Paso | Archivo | Qué haces |
|------|---------|-----------|
| 1 | `components/tu-seccion.tsx` | Crear el componente React |
| 2 | `lib/app-section-registry/catalog.ts` | Añadir metadatos (permisos, labels, invitados) |
| 3 | `lib/app-section-registry/sections.client.tsx` | Registrar icono + componente |

No hace falta editar `app/page.tsx` ni `components/user-management.tsx`.

---

## Arquitectura

```
lib/app-section-registry/
├── catalog.ts            → Metadatos (server-safe): permisos, grupos, invitados
├── sections.client.tsx   → Icono Lucide + componente React
├── store.ts              → registerAppSectionComplete()
├── outlet.tsx            → Renderiza la sección activa
├── nav.client.tsx        → Construye el menú lateral/móvil
└── index.client.ts       → Export público usado por page.tsx

lib/app-sections.ts       → Lógica de permisos (resolveAllowedSections, etc.)
components/section-permissions-editor.tsx → UI de permisos en gestión de usuarios
```

Flujo al arrancar la app:

1. `catalog.ts` define todas las secciones en el registro global.
2. `sections.client.tsx` asocia cada sección con su icono y su componente.
3. `AppSectionOutlet` (en `page.tsx`) muestra la sección activa según permisos e invitados.
4. Las APIs de admin validan permisos con los mismos IDs del catálogo.

---

## Paso 1: Crear el componente

Crea tu componente en `components/`, por ejemplo `components/bible-maps.tsx`:

```tsx
"use client"

export function BibleMaps() {
  return (
    <div>
      <h1>Mapas bíblicos</h1>
      {/* tu UI */}
    </div>
  )
}
```

---

## Paso 2: Añadir metadatos al catálogo

Abre `lib/app-section-registry/catalog.ts` y agrega una entrada en `APP_SECTION_CATALOG`:

```typescript
{
  id: "mapas",
  label: "Mapas bíblicos",
  navLabel: "Mapas",
  groupId: "ESTUDIO",
  groupLabel: "Estudio bíblico",
  defaultForReader: true,
  loginPrompt: {
    title: "Mapas bíblicos",
    description: "Explora lugares y rutas del texto con una cuenta.",
  },
},
```

### Campos disponibles

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `id` | Sí | Identificador único (minúsculas, sin espacios). Ej: `"mapas"`, `"reading"`. |
| `label` | Sí | Nombre completo (permisos, gestión de usuarios). |
| `navLabel` | No | Texto corto en el menú. Si omites, se usa `label`. |
| `groupId` | Sí | ID del grupo en el menú. Valores actuales: `PRINCIPAL`, `ESTUDIO`, `PERSONAL`, `ESPIRITUAL`, `GENERAL`. |
| `groupLabel` | Sí | Título visible del grupo en el sidebar. |
| `guestAccess` | No | Si es `true`, los visitantes sin cuenta pueden usar la sección. |
| `defaultForReader` | No | Si es `true`, los lectores nuevos la tienen habilitada por defecto. |
| `adminOnly` | No | Solo administradores (ej: `"users"`). No aparece en permisos de lectores. |
| `loginPrompt` | No | Mensaje cuando un invitado intenta entrar a una sección bloqueada. |

### Grupos del menú

| `groupId` | `groupLabel` | Secciones típicas |
|-----------|--------------|-------------------|
| `PRINCIPAL` | Principal | Dashboard, lectura, comunidad |
| `ESTUDIO` | Estudio bíblico | Búsqueda, referencias |
| `PERSONAL` | Personal | Notas, favoritos, planes… |
| `ESPIRITUAL` | Vida espiritual | Oración, diario, grupos |
| `GENERAL` | General | Actividad, estadísticas, usuarios |

---

## Paso 3: Registrar icono y componente

Abre `lib/app-section-registry/sections.client.tsx`:

1. Importa el icono de [Lucide](https://lucide.dev/icons/).
2. Importa tu componente.
3. Añade un bloque `registerAppSectionComplete`.

### Ejemplo mínimo

```tsx
import { Map } from "lucide-react"
import { BibleMaps } from "@/components/bible-maps"

registerAppSectionComplete({
  ...meta("mapas"),
  icon: Map,
  render: () => <BibleMaps />,
})
```

### Opciones de UI

| Opción | Descripción |
|--------|-------------|
| `icon` | Icono del menú (Lucide). **Obligatorio.** |
| `render` | Función que devuelve el JSX. Recibe `ctx` con datos de la app. **Obligatorio.** |
| `requiresUser` | Si es `true`, solo renderiza con usuario logueado (`ctx.user`). |
| `layout` | Wrapper visual: `"plain"` (default), `"card"`, `"fullscreen"`, `"notebook"`. |
| `suspenseFallback` | Texto de carga; envuelve el contenido en `<Suspense>`. |

### Contexto disponible en `render(ctx)`

```typescript
ctx.isGuest              // visitante sin cuenta
ctx.user                 // { id, name, username, role, streakCount } | null
ctx.allowedSections      // IDs permitidos para el usuario actual
ctx.openLogin            // abrir modal de login
ctx.setActiveTab         // cambiar de sección
ctx.handleSelectVerse    // navegar al lector (bookId, chapter, verse?, bibleId?)
ctx.handleClearNavValues // limpiar deep link del lector
ctx.navBookId            // estado de navegación del lector
ctx.navChapter
ctx.navVerse
ctx.navBibleId
ctx.notebookEditingNote  // estado de la libreta
ctx.setNotebookEditingNote
```

### Ejemplos según tipo de sección

**Sección simple (solo login requerido):**

```tsx
registerAppSectionComplete({
  ...meta("mapas"),
  icon: Map,
  render: () => <BibleMaps />,
})
```

**Sección que necesita el ID del usuario:**

```tsx
registerAppSectionComplete({
  ...meta("mapas"),
  icon: Map,
  requiresUser: true,
  render: (ctx) => <BibleMaps userId={ctx.user!.id} />,
})
```

**Sección con layout de tarjeta y carga lazy:**

```tsx
registerAppSectionComplete({
  ...meta("mapas"),
  icon: Map,
  requiresUser: true,
  layout: "card",
  suspenseFallback: "Cargando mapas...",
  render: (ctx) => <BibleMaps userId={ctx.user!.id} />,
})
```

**Sección accesible para invitados** (pon `guestAccess: true` en el catálogo):

```tsx
registerAppSectionComplete({
  ...meta("mapas"),
  icon: Map,
  render: (ctx) => (
    <BibleMaps isGuest={ctx.isGuest} onLoginRequest={ctx.openLogin} />
  ),
})
```

**Sección que navega al lector al seleccionar un versículo:**

```tsx
registerAppSectionComplete({
  ...meta("mapas"),
  icon: Map,
  render: (ctx) => (
    <BibleMaps onSelectVerse={ctx.handleSelectVerse} />
  ),
})
```

---

## Qué se activa automáticamente

Tras completar los 3 pasos, la sección queda disponible en:

- Menú lateral (desktop) y barra inferior / hoja “Más” (móvil)
- Editor de **Permisos: Secciones permitidas** al crear/editar usuarios
- Panel de **Permisos globales** (aplicar a todos los lectores)
- Validación en APIs: `/api/admin/users`, `/api/admin/users/[id]`, `/api/admin/users/bulk-permissions`
- Resolución de permisos en runtime (`resolveAllowedSections`)
- Pantalla de “requiere cuenta” para invitados (si no tiene `guestAccess`)

---

## Permisos: comportamiento

| Rol / caso | Comportamiento |
|------------|----------------|
| **Admin** | Ve todas las secciones, incluidas `adminOnly`. |
| **Lector** | Solo ve las secciones en su `allowedSections` (BD). |
| **Invitado** | Solo ve secciones con `guestAccess: true`. El resto muestra `loginPrompt`. |
| **Sin permisos en BD** | Se aplican las secciones con `defaultForReader: true`. |

Para restringir una sección solo a admins, usa `adminOnly: true` en el catálogo (como `"users"`).

---

## Checklist antes de subir cambios

- [ ] El `id` en `catalog.ts` coincide con el usado en `meta("...")` en `sections.client.tsx`.
- [ ] Hay un `registerAppSectionComplete` por cada entrada del catálogo.
- [ ] El icono está importado de `lucide-react`.
- [ ] Si la sección usa `ctx.user`, añadiste `requiresUser: true`.
- [ ] Si los invitados no deben entrar, **no** pongas `guestAccess` y define `loginPrompt`.
- [ ] Ejecutaste `npm run build` sin errores.
- [ ] Probaste como admin, lector con/sin permiso e invitado.

---

## Errores frecuentes

### `Sección "xxx" no está en APP_SECTION_CATALOG`

Añadiste `meta("xxx")` en `sections.client.tsx` pero falta la entrada en `catalog.ts`.

### `Falta registerAppSectionComplete para "xxx"`

Hay una entrada en el catálogo sin su registro UI en `sections.client.tsx`.

### `Falta icono/UI para la sección "xxx"`

El catálogo y el outlet están bien, pero falta el bloque `registerAppSectionComplete`.

### La sección no aparece en permisos de usuarios

Comprueba que no tenga `adminOnly: true`. Esas secciones solo las ven administradores.

### El lector no ve la sección aunque la habilitaste

Verifica que el usuario tenga el ID en `allowed_sections` (BD) o aplica permisos globales desde gestión de usuarios.

---

## Referencia: secciones existentes

Consulta `lib/app-section-registry/catalog.ts` y `sections.client.tsx` para ver patrones reales:

| Sección | Invitados | Default lector | Notas |
|---------|-----------|----------------|-------|
| `dashboard` | Sí | Sí | Pasa `isGuest` al componente |
| `reading` | Sí | Sí | Usa `suspenseFallback` y props de navegación |
| `search` | Sí | Sí | Usa `handleSelectVerse` |
| `feed` | No | Sí | `requiresUser`, `layout: "card"` |
| `users` | No | — | `adminOnly: true` |

---

## Hubs de secciones (agrupación interna)

Desde julio 2026, varias secciones principales agrupan pantallas hijas con tabs segmentados (`SegmentTabs`) en lugar de entradas separadas en el menú.

**Detalle operativo:** [`docs-mobile/24-reduccion-secciones-web.md`](../docs-mobile/24-reduccion-secciones-web.md) · **Planes de lectura:** [`planes-lectura.md`](./planes-lectura.md)

### Patrón común

1. La sección padre (`reading`, `notebook`, `profile`) registra un hub en `sections.client.tsx` (`StudyHub`, `NotesHub`, `ProfileHub`).
2. Las secciones hijas siguen en `APP_SECTION_CATALOG` (permisos, `setActiveTab("search")`, validación en APIs).
3. `HIDDEN_CHILD_SECTIONS` en `nav.client.tsx` oculta hijas del sidebar y tabbar; el acceso es por tabs del hub o por **Más** en móvil.
4. Cada tab se filtra con `ctx.allowedSections.includes("<id>")`, salvo el tab por defecto de cada hub.

### StudyHub — sección `reading`

| Tab | Componente | Visible si |
|-----|------------|------------|
| Biblia | `BibleReader` | Siempre (incluye invitados con `guestAccess`) |
| Buscar | `SearchAdvanced` | `allowedSections` incluye `search` |
| Referencias | `ReferencesExplorer` | `references` |
| Diccionario | `StrongDictionary` | `dictionary` |
| Planes | `ReadingPlans` | Usuario logueado **y** `allowedSections` incluye `plans` |

Al elegir un pasaje desde **Buscar** o **Planes**, el hub vuelve al tab **Biblia** y navega con `ctx.handleSelectVerse(bookId, chapter)`. Invitados no ven el tab Planes aunque tengan acceso a Biblia.

```tsx
// StudyHub — filtro del tab Planes (sections.client.tsx)
tab.key === "plans" && Boolean(ctx.user) && ctx.allowedSections.includes("plans")
```

### NotesHub — sección `notebook`

| Tab | Componente | Visible si |
|-----|------------|------------|
| Notas | `NotesSection` | Siempre |
| Devocional | `Devotionals` | `devotionals` |
| Oración | `PrayerRequests` | `prayers` |

### ProfileHub — sección `profile`

| Tab | Componente | Visible si |
|-----|------------|------------|
| Perfil | `ProfileSection` | Siempre (`requiresUser` en la sección padre) |
| Favoritos | `Favorites` | `favorites` |
| Subrayados | `HighlightsManager` | `highlights` |
| Planes | `ReadingPlans` | `plans` |
| Actividad | `Activity` | `activity` |
| Estadísticas | `Statistics` | `statistics` |

`ReadingPlans` también aparece en **ProfileHub** y como sección standalone `plans` (compatibilidad y `setActiveTab("plans")`). En ProfileHub, `onSelectReading` solo llama `handleSelectVerse` sin cambiar de tab; en StudyHub además regresa a **Biblia**.

### Navegación móvil prioritaria

En `app/page.tsx`, `MOBILE_PRIMARY_NAV_IDS` fija la tabbar a `dashboard`, `reading`, `notebook`, `profile`. El resto va a **Más**.

### Añadir un tab a un hub existente

1. Añade la clave al tipo union (`StudyMode`, etc.) y a `*_TABS`.
2. Filtra visibilidad en el `.filter()` del hub (permisos + login si aplica).
3. Renderiza el componente en la rama correspondiente del hub.
4. Si la sección hija ya existe en el catálogo, inclúyela en `HIDDEN_CHILD_SECTIONS` si no debe aparecer en el menú principal.

No hace falta tocar `app/page.tsx` ni el editor de permisos.

---

## Archivos que no debes modificar para una sección normal

- `app/page.tsx` — ya usa `<AppSectionOutlet />`
- `components/user-management.tsx` — usa el catálogo automáticamente
- `components/section-permissions-editor.tsx` — lee `APP_SECTION_GROUPS` del registro

Solo modifica esos archivos si cambias el comportamiento global del sistema de permisos o del layout principal.
