# Planes de lectura

Documentación del subsistema de planes de lectura bíblica: API, UI web, hubs de navegación y paridad con la app móvil.

---

## Resumen

Los planes guían lecturas diarias por capítulos. El usuario se inscribe, marca días completados, abre pasajes en el lector y puede escribir devocionales ligados a cada día del plan.

| Capa | Ubicación |
|------|-----------|
| API REST | `app/api/plans/route.ts` |
| Lógica / tablas | `lib/bible.ts` (`ensureReadingPlanTables`, CRUD) |
| UI web compartida | `components/reading-plans.tsx` |
| Hubs | `lib/app-section-registry/sections.client.tsx` (`StudyHub`, `ProfileHub`) |

---

## API

Requiere sesión autenticada (`getSession`).

### `GET /api/plans`

Devuelve:

```json
{
  "plans": [{ "id", "name", "description", "durationDays", "chaptersData" }],
  "userPlans": [{ "id", "planId", "progress", "name", "description", "durationDays", "chaptersData", "startedAt" }]
}
```

- `chaptersData` es JSON: array de `{ day, readings: [{ bookId, bookName, chapters: number[] }] }`.
- `progress` es JSON: array de números de día completados, p. ej. `[1, 2, 5]`.

### `POST /api/plans`

Body JSON:

| `action` | Campos | Efecto |
|----------|--------|--------|
| `join` | `planId` | Inserta fila en `user_reading_plans` con progreso `[]` |
| `progress` | `planId`, `progress` (array) | Actualiza días completados |

Errores habituales: `401` sin sesión, `400` sin `planId` o `progress` inválido.

---

## Tablas (MariaDB)

Creadas por `ensureReadingPlanTables()` en `lib/bible.ts`:

- `bible_reading_plans` — catálogo de planes (nombre, descripción, `chapters_data`, `duration_days`).
- `user_reading_plans` — inscripción por usuario (`user_id`, `plan_id`, `progress` JSON, `started_at`).

No hay migraciones formales; la primera petición que necesite planes crea o amplía las tablas.

---

## Dónde aparece en la web

### StudyHub (sección **Leer**)

Archivo: `sections.client.tsx` → `StudyHub`.

Pestaña **Planes** visible solo si:

- hay usuario autenticado (`Boolean(ctx.user)`), **y**
- el permiso `plans` está en `allowedSections`.

Al elegir una lectura:

```tsx
onSelectReading={(bookId, chapter) => {
  ctx.handleSelectVerse(bookId, chapter)
  setMode("reader")  // vuelve al tab Biblia dentro del hub
}}
```

### ProfileHub (sección **Perfil**)

Pestaña **Planes** visible si `allowedSections.includes("plans")` (no exige lógica extra de login más allá de `requiresUser` del hub).

Al elegir lectura solo llama `ctx.handleSelectVerse` — cambia la sección activa a **Leer** (`setActiveTab("reading"` en `page.tsx`) pero **no** fuerza el sub-tab **Biblia** dentro de StudyHub. Si el usuario ya estaba en **Leer** con otro sub-tab (p. ej. Diccionario), puede quedar ahí tras abrir un pasaje desde Perfil → Planes.

### Sección standalone `plans`

Sigue registrada en el catálogo para permisos y deep links, pero está **oculta del menú** (ver `docs-mobile/24-reduccion-secciones-web.md`). El outlet renderiza `ReadingPlans` directamente sin hub.

---

## Componente `ReadingPlans`

Archivo: `components/reading-plans.tsx`.

### Sub-pestañas internas

| Tab | Contenido |
|-----|-----------|
| **Mis Planes** | Planes inscritos, progreso, lectura del día, devocional del día, calendario expandible |
| **Mis Devocionales** | Devocionales escritos desde planes (`/api/devotionals`) |
| **Explorar Planes** | Catálogo para unirse (`POST action: join`) |

Si no hay planes activos, cambia automáticamente a **Explorar Planes**.

### Flujos principales

1. **Unirse:** `POST /api/plans` con `{ action: "join", planId }`.
2. **Marcar día:** `POST` con `{ action: "progress", planId, progress: number[] }`.
3. **Abrir pasaje:** `onSelectReading(bookId, chapter)` — primer capítulo del primer libro del día.
4. **Devocional:** modal con emociones, reflexión y aplicación; contenido JSON enlazado a `planId` + `planDay`.

Muestra **racha** (`streakCount`) del usuario en cabecera.

---

## Paridad móvil (julio 2026)

El panel móvil `mobile/components/ReadingPlansPanel.tsx` recibió un refinamiento visual (doc 22 § *Refinamiento de Planes de lectura*):

- Cabecera con contador de planes activos.
- Separación **En curso** vs disponibles.
- Tarjeta activa con progreso `N de M días` y CTA clara para la siguiente lectura.
- Calendario expandible más limpio; estados completados con iconos Expo en lugar de emojis tipográficos.

La web (`components/reading-plans.tsx`) ya usa iconos Lucide (`CheckCircle2`, `Trophy`, etc.) y layout por tarjetas, pero **no** replica aún la misma jerarquía visual del panel móvil post-refinamiento. La lógica (API, progreso, devocionales) es la misma.

En móvil los planes viven bajo **Notas → Planes**; en web bajo **Leer → Planes** o **Perfil → Planes**.

---

## Permisos

ID de sección en catálogo: `plans`.

- `defaultForReader`: según `lib/app-section-registry/catalog.ts`.
- StudyHub exige usuario **y** permiso; ProfileHub solo permiso (el hub ya requiere cuenta).
- Administradores gestionan visibilidad en gestión de usuarios (`allowed_sections`).

---

## Cómo probar

```bash
npm run dev
# o en producción: docker restart biblia2-app
```

1. Inicia sesión con un usuario que tenga permiso `plans`.
2. **Leer → Planes:** inscríbete en un plan, marca el día actual, pulsa abrir pasaje — debe volver a **Biblia** con el capítulo correcto.
3. Escribe un devocional del día y revísalo en **Mis Devocionales**.
4. **Perfil → Planes:** abre una lectura y confirma que la sección cambia a **Leer**.
5. Expande el calendario de días y alterna completado / no completado.

---

## Documentación relacionada

| Doc | Contenido |
|-----|-----------|
| [`docs-mobile/24-reduccion-secciones-web.md`](../docs-mobile/24-reduccion-secciones-web.md) | Hubs, secciones ocultas, tabbar móvil |
| [`docs-mobile/22-notas-diseno-profesional.md`](../docs-mobile/22-notas-diseno-profesional.md) § Refinamiento Planes | UI móvil reciente |
| [`docs/nuevas-secciones.md`](./nuevas-secciones.md) § Hubs | Registro de StudyHub / ProfileHub |

---

*Última revisión: julio 2026.*
