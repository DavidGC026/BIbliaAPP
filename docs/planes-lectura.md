# Planes de lectura — web

Guía para desarrolladores sobre planes de lectura bíblica en la web Next.js (julio 2026).

**UI:** `components/reading-plans.tsx` · **API:** `app/api/plans/route.ts` · **BD/helpers:** `lib/bible.ts`

**Relacionado:** hubs en [`nuevas-secciones.md`](./nuevas-secciones.md) § Hubs · reducción de menú en [`docs-mobile/24-reduccion-secciones-web.md`](../docs-mobile/24-reduccion-secciones-web.md)

---

## Resumen

| Ubicación | Comportamiento al abrir un pasaje |
|-----------|----------------------------------|
| **StudyHub** (tab Planes en `reading`) | `handleSelectVerse` + vuelve al tab **Biblia** |
| **ProfileHub** (tab Planes en `profile`) | Solo `handleSelectVerse` (permanece en Perfil) |
| Sección `plans` (standalone / `setActiveTab`) | Solo `handleSelectVerse` |

El tab **Planes** en StudyHub requiere sesión y permiso `plans` en `allowedSections`. Invitados en la sección Leer no lo ven.

---

## API `GET /api/plans`

Requiere cookie de sesión. Respuesta:

```json
{
  "plans": [
    {
      "id": 1,
      "name": "Plan Cronológico de un Año",
      "description": "...",
      "chaptersData": "[{\"day\":1,\"readings\":[...]}]",
      "durationDays": 365
    }
  ],
  "userPlans": [
    {
      "id": 12,
      "planId": 1,
      "progress": "[1,2,5]",
      "startedAt": "2026-07-01T00:00:00.000Z",
      "name": "...",
      "description": "...",
      "chaptersData": "...",
      "durationDays": 365
    }
  ]
}
```

- `chaptersData` y `progress` son JSON en string (el cliente hace `JSON.parse`).
- `progress` es un array de números de día completados, p. ej. `[1, 2, 5]`.

## API `POST /api/plans`

Cuerpo JSON:

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `action` | Sí | `"join"` o `"progress"` |
| `planId` | Sí | ID del plan en `bible_reading_plans` |
| `progress` | Solo si `action === "progress"` | Array de días completados |

Ejemplos:

```bash
# Unirse a un plan
curl -X POST /api/plans -H "Content-Type: application/json" \
  -d '{"action":"join","planId":1}'

# Marcar progreso
curl -X POST /api/plans -H "Content-Type: application/json" \
  -d '{"action":"progress","planId":1,"progress":[1,2,3]}'
```

---

## Componente `ReadingPlans`

Props:

```typescript
interface ReadingPlansProps {
  onSelectReading: (bookId: number, chapter: number) => void
  streakCount: number
}
```

Funcionalidad principal:

- Lista planes disponibles y planes activos del usuario (`useSWR` → `/api/plans`).
- Muestra lectura del día, barra de progreso y racha (`streakCount` del usuario).
- **Leer** / icono de enlace llama `onSelectReading(bookId, chapters[0])` con el primer capítulo del bloque del día.
- Integración con devocionales: crear o ver devocional ligado a `planId` + `planDay` vía `/api/devotionals`.
- Unirse a plan y marcar días completados vía `POST /api/plans`.

---

## Base de datos

Tablas creadas en `ensureDbTables()` (`lib/bible.ts`):

| Tabla | Uso |
|-------|-----|
| `bible_reading_plans` | Catálogo de planes (`chapters_data` JSON por día) |
| `user_reading_plans` | Inscripción y `progress` JSON por usuario |

Si `bible_reading_plans` está vacía al arrancar, se insertan por defecto:

- **Plan Cronológico de un Año** (365 días)
- **Proverbios en 30 días**

---

## Permisos

| Caso | Tab Planes en StudyHub | Tab Planes en ProfileHub |
|------|------------------------|--------------------------|
| Invitado en `reading` | Oculto | N/A (profile requiere login) |
| Lector sin `plans` en BD | Oculto | Oculto |
| Lector con `plans` | Visible | Visible si también tiene permiso |
| Admin | Visible | Visible |

La sección `plans` tiene `defaultForReader: true` en el catálogo; lectores nuevos la reciben salvo restricción explícita en permisos.

---

## Planes de grupo

Los grupos pueden asignar un plan compartido:

- `GET /api/groups/[id]/activity?tab=plan` — plan del grupo y progreso de miembros (`lib/group-features.ts`).
- `POST` con `action: "assign_plan"` y `planId` — solo admins del grupo.

---

## Errores frecuentes

### El tab Planes no aparece en Leer

Comprueba que el usuario esté logueado y tenga `plans` en `allowed_sections`. El tab exige `Boolean(ctx.user)` además del permiso.

### Al pulsar Leer no cambia de pantalla en StudyHub

Debe usarse el `onSelectReading` del StudyHub (con `setMode("reader")`). Si se reutiliza el handler de ProfileHub sin ese paso, el lector actualiza la URL pero el usuario sigue en el tab Planes.

### `401` en `/api/plans`

La API exige sesión; invitados y peticiones sin cookie fallan. El componente solo se monta en contextos con usuario en StudyHub/ProfileHub.

---

## Validación

```bash
npx tsc --noEmit
npm run build
```
