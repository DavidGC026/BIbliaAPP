# 21 — Inicio: notas recientes (recientes inteligentes)

Primera entrega de la fase **Recientes inteligentes** en la pantalla **Inicio** (julio 2026). El objetivo es que el usuario retome trabajo reciente sin entrar primero a Notas.

Estado del plan maestro: ver [20-plan-maestro-mejoras-generales.md](./20-plan-maestro-mejoras-generales.md) (iteración en progreso).

> **Repositorio del código:** la app móvil ya no vive en `mobile/` de este monorepo web. Las rutas de archivos siguen la estructura del repo móvil (Expo Router).

---

## Qué hace

| Comportamiento | Detalle |
|----------------|---------|
| Bloque en Inicio | Muestra hasta **3 notas** editadas más recientemente |
| Metadatos | Nombre de libreta, fecha de última edición y preview de texto |
| Navegación | Al tocar una nota, abre directamente el editor (`/note/[noteId]`) |
| Visibilidad | Solo usuarios autenticados (no invitados) |
| Vacío | Si no hay notas, la sección no aparece o muestra estado vacío discreto |

Pendiente en la misma iteración: versículos recientes/favoritos, unificar devocionales recientes y prueba manual en pantallas pequeñas.

---

## Fuente de datos

Las notas viven en SQLite local (`notes` + `notebooks`) con columna `updated_at` actualizada en cada guardado.

Patrón existente en `lib/offline/notesStore.ts`:

- Las notas de una libreta ya se listan con `ORDER BY n.updated_at DESC`.
- Para Inicio se necesita una consulta **entre libretas**: unir `notes` y `notebooks`, filtrar `deleted = 0`, ordenar por `updated_at` descendente y limitar a 3.

La capa `lib/repo.ts` expone la lista al componente de Inicio de forma que funcione **offline** (SQLite) y con **sincronización** cuando hay red (misma cuenta, mismas tablas que la API `/api/notebooks/...`).

---

## Preview del texto

Reutiliza `stripNotePreview()` de `lib/notebookCovers.ts` (documentado en [14-notas-autoguardado-y-preview.md](./14-notas-autoguardado-y-preview.md) y [17-notas-productividad-general.md](./17-notas-productividad-general.md)):

1. Si el contenido es HTML del editor enriquecido, convierte a texto plano.
2. Mantiene compatibilidad con notas antiguas en markdown.
3. Recorta a ~100 caracteres para la tarjeta en Inicio.

El título mostrado usa el de la nota o **"Sin título"** si está vacío (misma convención que el editor).

---

## UI en Inicio

Archivo principal: `app/(tabs)/index.tsx`.

La sección se ubica entre los bloques de continuidad (versículo del día, continuar lectura) y las estadísticas o acciones rápidas, para no alargar demasiado el scroll en pantallas pequeñas.

Cada tarjeta incluye:

- Título de la nota (1 línea, truncado).
- Nombre de la libreta (texto secundario).
- Fecha relativa o corta (`updated_at`).
- Preview (2–3 líneas máximo).

`onPress` → `router.push({ pathname: '/note/[noteId]', params: { noteId } })`.

---

## Relación con otras mejoras de Inicio

| Bloque | Estado | Documento |
|--------|--------|-----------|
| Continuar lectura | Hecho | [20-plan-maestro-mejoras-generales.md](./20-plan-maestro-mejoras-generales.md) |
| Notas recientes | Hecho (esta entrega) | Este documento |
| Devocionales recientes | Parcial (bloque separado) | [07-pantallas-funcionalidades.md](./07-pantallas-funcionalidades.md) |
| Versículos recientes | Pendiente | Plan maestro fase 1 |
| Nota rápida | Hecho | [17-notas-productividad-general.md](./17-notas-productividad-general.md) |

---

## Cómo probar

```bash
cd mobile   # en el repositorio móvil
npm run android
```

1. Inicia sesión con una cuenta que tenga al menos dos libretas con notas.
2. Edita una nota en la libreta A y guarda (o auto-guarda al salir).
3. Edita otra nota en la libreta B.
4. Vuelve a **Inicio** y comprueba que las 3 más recientes aparecen ordenadas por última edición.
5. Toca una tarjeta: debe abrir el editor de esa nota, no la lista de la libreta.
6. Verifica que el preview no muestre etiquetas HTML crudas.
7. En modo invitado, confirma que el bloque no se muestra.

Verificación de tipos:

```bash
npx tsc --noEmit
```

---

## Errores frecuentes

| Síntoma | Causa probable |
|---------|----------------|
| Lista vacía con notas existentes | SQLite sin sincronizar; ejecutar sync o abrir Notas una vez online |
| Preview con HTML visible | `stripNotePreview()` no aplicado en la tarjeta |
| Nota abre libreta equivocada | `noteId` o `notebookId` desalineados tras mover nota entre libretas |
| Inicio muy largo | Más de 3 notas renderizadas o falta `numberOfLines` en textos |

---

*Última revisión: julio 2026.*
