# API de calendario y eventos

Documentación de `/api/events`: eventos de iglesia, eventos de grupos y RSVP unificados en una sola vista.

**Implementación:** `app/api/events/route.ts`  
**Lógica:** `lib/church-events.ts`, `lib/group-events.ts`  
**UI:** `components/church-calendar.tsx`, `components/dashboard.tsx`

---

## Modelo de datos

| Tabla | Alcance |
|-------|---------|
| `bible_church_events` | Eventos públicos de la congregación |
| `bible_event_rsvps` | RSVP usuario ↔ evento iglesia (`going`, `maybe`, `declined`) |
| `bible_group_events` | Eventos por grupo (miembros del grupo) |
| `bible_group_event_rsvps` | RSVP en eventos de grupo |

Las tablas se crean con `ensureChurchEventTables()` / `ensureGroupEventTables()` al primer uso.

---

## GET — listar eventos

```http
GET /api/events
```

### Sin sesión (invitado)

Devuelve eventos de iglesia próximos (`listUpcomingEvents`), cada uno con `source: "church"`.

### Con sesión (cookie)

Fusiona en una sola lista:

1. Eventos de iglesia con RSVP del usuario (`listEventsWithUserRsvp`).
2. Eventos de todos los grupos del usuario (`listUserGroupEventsAcrossGroups`).

Cada fila incluye:

| Campo extra | Valor |
|-------------|-------|
| `source` | `"church"` o `"group"` |
| `category` | En eventos de grupo se fuerza `"grupo"` además de la categoría original |

Orden: por `start_time` ascendente (tipo `string | Date` desde MySQL).

**Tipado (julio 2026):** `mergeCalendarEvents` usa `CalendarEventRow = Record<string, unknown> & { start_time: string | Date }` para ordenar sin casts en el comparador. Ver [`build-web-typescript.md`](./build-web-typescript.md).

---

## POST — crear evento o RSVP

```http
POST /api/events
Content-Type: application/json
```

Requiere sesión. Dos acciones según el cuerpo:

### RSVP

```json
{ "action": "rsvp", "eventId": 12, "status": "going" }
```

`status`: `going` | `maybe` | `declined`.

### Crear evento de iglesia

```json
{
  "title": "Culto dominical",
  "description": "…",
  "startTime": "2026-07-20T10:00:00",
  "endTime": "2026-07-20T12:00:00",
  "location": "Templo principal",
  "category": "culto"
}
```

- Solo **administradores** pueden crear eventos de iglesia (`createEvent` valida rol).
- Categorías: `culto`, `oracion`, `jovenes`, `ministerio`, `otro`.

Eventos de **grupo** se gestionan por APIs de grupo (`/api/groups/...`), no por esta ruta.

---

## DELETE — eliminar evento

```http
DELETE /api/events?id=12
```

Requiere sesión. El creador o un admin puede borrar eventos de iglesia.

---

## Integración en la UI

| Pantalla | Uso |
|----------|-----|
| Calendario (`church-calendar`) | Lista, crear (admin), RSVP, borrar |
| Dashboard | Próximos eventos vía SWR `/api/events` |

Fechas del formulario pasan por `localDatetimeToISO()` (`lib/datetime.ts`) antes del POST.

---

## Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---------|----------------|-----------|
| `403` al crear evento | Usuario no admin | Solo admins crean eventos de iglesia |
| Eventos de grupo sin categoría esperada | Fusión añade `category: "grupo"` | Filtrar por `source === "group"` en la UI |
| Lista desordenada tras el build | `start_time` tipado como `unknown` | Usar `CalendarEventRow` en `mergeCalendarEvents` |
| RSVP no persiste | Sin cookie de sesión | Verificar login antes de POST |
