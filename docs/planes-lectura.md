# Planes de lectura (web)

Documentación del componente `ReadingPlans`, su API y los tres puntos de entrada tras la consolidación de hubs (julio 2026).

---

## Resumen

Los planes de lectura permiten inscribirse en recorridos por capítulos, marcar días completados, abrir la lectura del día en el lector y vincular devocionales. La misma UI (`components/reading-plans.tsx`) se reutiliza en tres hubs; solo cambia cómo se navega al lector al pulsar **Leer**.

| Entrada | Ruta en la app | Condición del tab |
|---------|----------------|-------------------|
| **Leer → Planes** | `StudyHub` → tab `plans` | Usuario logueado **y** permiso `plans` |
| **Notas → Planes** | `NotesSection` → tab `planes` | Permiso `plans` en `allowedSections` |
| **Perfil → Planes** | `ProfileHub` → tab `plans` | Permiso `plans` en `allowedSections` |

La sección standalone `plans` sigue registrada en el catálogo para permisos y `setActiveTab("plans")`, pero está en `HIDDEN_CHILD_SECTIONS` y no aparece en el menú principal.

---

## API

**Ruta:** `app/api/plans/route.ts`  
**Lógica:** `lib/bible.ts` (`listReadingPlans`, `getUserReadingPlans`, `joinReadingPlan`, `updateReadingPlanProgress`)

### `GET /api/plans`

Requiere sesión. Devuelve:

```json
{
  "plans": [{ "id", "name", "description", "durationDays", "chaptersData" }],
  "userPlans": [{ "id", "planId", "progress", "name", "description", "durationDays", "chaptersData", "startedAt" }]
}
```

`chaptersData` es JSON con días y lecturas (`bookId`, `bookName`, `chapters[]`). `progress` es un array JSON de días completados (p. ej. `[1, 2, 5]`).

### `POST /api/plans`

Cuerpo JSON:

| Campo | Uso |
|-------|-----|
| `action: "join"` + `planId` | Inscribir al usuario en un plan |
| `action: "progress"` + `planId` + `progress: number[]` | Actualizar días completados |

Respuestas de error habituales: `401` sin sesión, `400` sin `planId` o `progress` inválido.

---

## Navegación al lector

Al elegir una lectura del día, el componente llama a `onSelectReading(bookId, chapter)`:

```typescript
// StudyHub (lib/app-section-registry/sections.client.tsx)
onSelectReading={(bookId, chapter) => {
  ctx.handleSelectVerse(bookId, chapter)
  setMode("reader")   // obligatorio: vuelve al tab Lector dentro de Leer
}}

// NotesSection (components/notes-section.tsx) vía NotesHub
onSelectReading={ctx.handleSelectVerse}   // cambia activeTab a "reading"

// ProfileHub
onSelectReading={ctx.handleSelectVerse}   // igual que Notas; no hay setMode local
```

`handleSelectVerse` en `app/page.tsx` actualiza `navBookId` / `navChapter` / `navVerse` y ejecuta `setActiveTab("reading")`. Al montar `StudyHub` de nuevo, el modo por defecto es **Lector** (`useState<StudyMode>("reader")`).

### Trampas frecuentes

- En **Leer → Planes**, si omites `setMode("reader")`, el usuario permanece en el tab Planes aunque el pasaje se haya actualizado.
- En **Perfil → Planes**, no hace falta `setMode` porque se cambia de sección entera.
- Invitados no ven Planes dentro de **Leer** aunque tengan `plans` en permisos; el filtro exige `Boolean(ctx.user)`.
- **Notas** y **Perfil** solo comprueban `allowedSections.includes("plans")`.

---

## Componente

**Archivo:** `components/reading-plans.tsx`

- Datos: `useSWR("/api/plans")` y `useSWR("/api/devotionals")` para devocionales del día.
- Props: `onSelectReading`, `streakCount` (racha del usuario, mostrada en la cabecera).
- Flujos: unirse a plan, marcar día, abrir lectura, escribir/consultar devocional, calendario expandible.

Refinamiento visual móvil documentado en [`docs-mobile/22-notas-diseno-profesional.md`](../docs-mobile/22-notas-diseno-profesional.md) § Refinamiento de Planes de lectura.

---

## Cómo probar

1. Inicia sesión con permiso `plans`.
2. Abre **Leer → Planes**, inscríbete en un plan y pulsa **Leer** en la lectura del día → debe mostrar el pasaje en el tab **Lector**.
3. Repite desde **Notas → Planes** → debe cambiar a la sección **Leer** con el mismo pasaje.
4. Repite desde **Perfil → Planes** → mismo resultado.
5. Quita el permiso `plans` al usuario → los tres tabs deben desaparecer (en **Leer** también requiere estar logueado).

---

## Documentación relacionada

- Hubs y `HIDDEN_CHILD_SECTIONS`: [`docs/nuevas-secciones.md`](./nuevas-secciones.md) § Hubs
- Paridad notas (tab Planes en Notas): [`docs/notas-web-paridad-movil.md`](./notas-web-paridad-movil.md)
- Reducción de secciones web: [`docs-mobile/24-reduccion-secciones-web.md`](../docs-mobile/24-reduccion-secciones-web.md)

*Última revisión: julio 2026.*
