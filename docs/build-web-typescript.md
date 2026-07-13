# Build web y convenciones TypeScript

Guía para compilar la app Next.js, arrancar en producción con `next start` y mantener el estilo que exige `strict: true` en `tsconfig.json`.

---

## Cuándo ejecutar el build

| Momento | Comando |
|---------|---------|
| Antes de subir cambios en `app/`, `lib/`, `components/` | `npm run build` |
| Servir el build compilado | `npm run start` (puerto 3000 por defecto) |
| En producción (Docker `biblia2-app`) | Automático en cada `docker restart` → `npm ci && npm run build && next start -p 3003` |
| Desarrollo local | `npm run dev` no valida todos los tipos; el build sí |

El proyecto usa **TypeScript 5.7** con `strict: true`. Aunque `next.config.mjs` tiene `typescript.ignoreBuildErrors: true`, la convención del repo es corregir los errores de tipado antes de desplegar.

---

## `next.config.mjs` y modo de arranque

Configuración relevante en `next.config.mjs`:

| Opción | Valor actual | Motivo |
|--------|--------------|--------|
| `output` | *(omitido — sin `standalone`)* | Producción usa `next start`, no el servidor empaquetado de standalone |
| `typescript.ignoreBuildErrors` | `true` | No bloquea el build por TS; conviene igual corregir tipos (ver secciones siguientes) |
| `images.unoptimized` | `true` | Imágenes servidas sin el optimizador de Next en este despliegue |

### `next start` vs `output: 'standalone'`

Antes existía `output: 'standalone'`, que genera `.next/standalone/server.js` para ejecutar con `node` y un subconjunto de `node_modules`. Eso **no coincide** con el flujo real del contenedor Docker, que monta el proyecto completo y arranca:

```bash
npm ci && npm run build && next start -p 3003
```

Desde julio 2026 (`Alinea build web con next start`) se eliminó `output: 'standalone'` para alinear la configuración con ese arranque.

| Modo | Comando de producción | Cuándo usarlo |
|------|----------------------|---------------|
| **`next start`** (actual) | `next start -p 3003` tras `npm run build` | Docker `biblia2-app`, desarrollo local de build |
| ~~`standalone`~~ (retirado) | `node .next/standalone/server.js` | No aplica en este proyecto |

**No buscar** `.next/standalone/` tras el build: esa carpeta solo se genera con `output: 'standalone'`.

---

## Alcance del compilador

```text
tsconfig.json
├── include: app/, components/, lib/, scripts/*.ts
└── exclude: mobile/, desktop/, node_modules
```

- Cambios en **`desktop/`** o **`mobile/`** no pasan por `npm run build` de la raíz.
- Scripts en `scripts/` **sí** se typecheckean si están incluidos (p. ej. `check_feed_schema.ts`).

---

## Consultas MySQL (`mysql2`)

### Patrón recomendado

En `lib/` la mayoría de módulos importan `RowDataPacket` y tipan el resultado:

```typescript
import type { RowDataPacket } from "mysql2"

const [rows] = await getPool().query<RowDataPacket[]>(sql, params)
```

Para columnas concretas, define una interfaz que extienda `RowDataPacket` (como en `app/api/references/route.ts`):

```typescript
import type { RowDataPacket } from "mysql2/promise"

interface CrossReferenceRow extends RowDataPacket {
  book_name: string
  book_id: number
  chapter: number
  verse: number
  text: string
  votos: number
}

const [rows] = await getPool().query<CrossReferenceRow[]>(query, [bibleId, vidOrigen])
```

### Errores frecuentes

| Error de build | Causa | Solución |
|----------------|-------|----------|
| `Type 'X[]' does not satisfy the constraint 'QueryResult'` | Genérico de `pool.query<T>()` sin `RowDataPacket` | Interfaz `extends RowDataPacket` |
| `Property 'total' does not exist on type 'OkPacket'` | Mezclar filas con metadatos de escritura | Usar `ResultSetHeader` para `INSERT`/`UPDATE`; `RowDataPacket` para `SELECT` |
| `SHOW CREATE TABLE` sin tipar | Columna con espacio (`Create Table`) | Interfaz con clave entre comillas (ver `scripts/check_feed_schema.ts`) |

**Evitar** `query<any[]>(...)`: compila en dev pero oculta errores y ya no pasa el build estricto en rutas como `/api/references`.

---

## Tipos en rutas API

### Fusión de eventos (`app/api/events/route.ts`)

Church events y group events devuelven filas dinámicas de MySQL. Para ordenar por `start_time` sin casts sueltos:

```typescript
type CalendarEventRow = Record<string, unknown> & { start_time: string | Date }

function mergeCalendarEvents(churchEvents: CalendarEventRow[], groupEvents: CalendarEventRow[]) {
  // ...
  merged.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
}
```

Al llamar desde funciones que devuelven `RowDataPacket[]`, haz cast explícito al tipo de fila esperado:

```typescript
mergeCalendarEvents(churchEvents as CalendarEventRow[], groupEvents as CalendarEventRow[])
```

Detalle de la API: [`calendario-eventos-api.md`](./calendario-eventos-api.md).

---

## Páginas de auth fuera del shell (`app/verify-email`, `app/reset-password`)

Flujos de correo que viven fuera del shell principal de la app.

| Página | API | Flujo |
|--------|-----|-------|
| `/verify-email?token=…` | `GET /api/auth/verify-email?token=…` | Carga automática al montar; redirige con `router.push("/")` |
| `/reset-password?token=…` | `POST /api/auth/reset-password` | Formulario de nueva contraseña (mín. 6 caracteres) |

Convenciones de implementación:

1. **`useSearchParams()`** obliga a envolver el contenido en `<Suspense>` (Next.js 16).
2. Botones de navegación usan **`onClick={() => router.push("/")}`** en lugar de `<Button asChild><Link>…</Link></Button>` para evitar conflictos de tipos con el variant de shadcn.
3. Los enlaces del correo se generan en `lib/email.ts` con `APP_URL` / `getAppUrl(origin)`.

Variables de entorno para envío (Resend):

```env
RESEND_API_KEY=re_…
RESEND_FROM_EMAIL=BibliaAPP <correo@tudominio.com>
```

Sin `RESEND_API_KEY`, el registro puede crear el usuario pero fallará al enviar el correo de verificación.

---

## Scripts de mantenimiento

| Script | Uso |
|--------|-----|
| `npx tsx scripts/check_feed_schema.ts` | Inspecciona `SHOW CREATE TABLE feed_posts` (requiere `.env.local` con MySQL) |
| `npx tsx scripts/check_feed.ts` | Diagnóstico del feed social |

Ejecutar con la misma `.env.local` que usa `npm run dev`.

---

## Checklist antes de desplegar

- [ ] `npm run build` termina sin errores.
- [ ] `npm run lint` sin regresiones graves (opcional en local).
- [ ] Rutas nuevas con `pool.query` usan interfaces `extends RowDataPacket`.
- [ ] Páginas con `useSearchParams` tienen `Suspense` en el default export.
- [ ] `docker restart biblia2-app` y `curl -s http://127.0.0.1:3003/api/health` OK.
- [ ] Logs del contenedor muestran `Ready` tras `next start`, no errores de `.next/standalone`.

---

## Problemas frecuentes

| Síntoma | Qué revisar |
|---------|-------------|
| Build falla solo en Docker, no en local | Versiones de `node_modules`; en Docker corre `npm ci` limpio |
| `next: not found` | Falta `npm install` / `npm ci` |
| Contenedor arranca pero no responde en 3003 | Verificar que el comando sea `next start -p 3003`, no `node .next/standalone/server.js` |
| Error en import `type NextRequest` vs valor | Usar `import { NextRequest }` cuando el valor se instancia (`new NextRequest(...)`) |
| Cambios en `desktop/` no se reflejan en build web | Es esperado: compilar desktop con `cd desktop && npm run build` |

---

## Archivos de referencia (julio 2026)

| Archivo | Qué documenta |
|---------|---------------|
| `next.config.mjs` | Sin `output: 'standalone'`; alineado con `next start` |
| `app/api/references/route.ts` | Interfaces `ReferenceArcRow`, `CrossReferenceRow`, etc. |
| `app/api/events/route.ts` | `CalendarEventRow` y fusión church + group |
| `app/api/auth/verify-email/route.ts` | Import de valor `NextRequest` para delegación interna |
| `app/verify-email/page.tsx`, `app/reset-password/page.tsx` | Suspense + `router.push` |
| `scripts/check_feed_schema.ts` | Tipado de `SHOW CREATE TABLE` |

API de referencias cruzadas: [`referencias-cruzadas-api.md`](./referencias-cruzadas-api.md).
