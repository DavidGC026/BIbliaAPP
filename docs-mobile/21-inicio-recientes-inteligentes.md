# 21 — Inicio: recientes inteligentes

Mejoras en la pantalla **Inicio** de la app móvil (julio 2026) para mostrar actividad reciente y accionable: notas editadas, versículos guardados, subrayados y devocionales, sin depender solo de estadísticas.

Estado del plan maestro: [20-plan-maestro-mejoras-generales.md](./20-plan-maestro-mejoras-generales.md) (iteración casi completa; pendiente QA manual en pantallas pequeñas).

> **Repositorio del código:** [DavidGC026/BibliaAppMobile](https://github.com/DavidGC026/BibliaAppMobile) (Expo Router). Este monorepo web solo documenta el comportamiento; las rutas de archivos siguen la estructura del repo móvil.

---

## Objetivo

Que el usuario retome trabajo reciente desde Inicio:

- Abrir una nota editada hace poco.
- Volver a un versículo guardado o subrayado.
- Leer devocionales sin duplicar el bloque destacado.

Los bloques solo aparecen para usuarios autenticados (`!isGuest`). En modo invitado se muestra el banner de login y no se cargan datos personales.

---

## Orden de bloques en Inicio

Archivo principal: `app/(tabs)/index.tsx`.

| Orden | Bloque | Condición de visibilidad |
|-------|--------|--------------------------|
| 1 | Versículo del día | Siempre |
| 2 | Continuar lectura | `lastPassage` en almacenamiento local |
| 3 | Notas recientes | ≥ 1 nota reciente |
| 4 | Versículos guardados | ≥ 1 favorito reciente |
| 5 | Subrayados recientes | ≥ 1 subrayado reciente |
| 6 | Devocional destacado | Hay devocionales |
| 7 | Anuncios / eventos | Datos de API |
| 8 | Estadísticas, actividad, devocionales recientes | Usuario autenticado |
| 9 | Acciones rápidas | Siempre |

Los recientes personales van **antes** de estadísticas para priorizar continuidad sobre métricas.

---

## Notas recientes

| Comportamiento | Detalle |
|----------------|---------|
| Límite | Hasta **3** notas |
| Orden | `updatedAt` descendente (entre todas las libretas) |
| Metadatos | Título, nombre de libreta, fecha corta, preview de texto |
| Navegación | `router.push('/note/[noteId]')` — abre el editor directamente |
| Enlace secundario | «Ver libretas →» → pestaña Notas |

### Fuente de datos

`lib/repo.ts` → `repoListRecentNotebookNotes(limit = 3)`:

1. Carga libretas con `loadNotebooksView()`.
2. Obtiene notas de cada libreta con `loadNotebookNotesView()`.
3. Añade `notebookName` a cada nota.
4. Ordena por `updatedAt` y recorta al límite.

Funciona **offline** (SQLite) y con sync cuando hay red.

### Preview

La tarjeta usa `notePreview()` local en `index.tsx`: elimina HTML/scripts, normaliza entidades y recorta espacios. Si queda vacío, muestra «Sin contenido todavia».

---

## Versículos guardados (favoritos recientes)

| Comportamiento | Detalle |
|----------------|---------|
| Límite | **3** favoritos más recientes |
| Orden | `created_at` descendente |
| UI | Carrusel horizontal; tarjeta con referencia, icono ★ y texto del versículo |
| Navegación | Pestaña Biblia en modo lector con `bookId`, `chapter`, `bibleId` |
| Enlace secundario | «Ver todos →» → `/favorites` |

### Fuente de datos

En `useFocusEffect`:

```ts
repo.repoListFavorites()
  → ordenar por created_at DESC
  → slice(0, 3)
```

`repoListFavorites()` lee SQLite (`favorites WHERE deleted = 0`) o sincroniza desde `GET /api/favorites` cuando hay conexión.

---

## Subrayados recientes

| Comportamiento | Detalle |
|----------------|---------|
| Límite | **3** subrayados |
| Orden | `created_at` descendente |
| UI | Carrusel horizontal; borde y punto de color según el subrayado |
| Navegación | Igual que favoritos: lector con `bookId`, `chapter`, `bibleId` |
| Enlace secundario | «Ver todos →» → `/highlights` |

### Fuente de datos

`lib/repo.ts` → `repoListRecentHighlights(limit = 3)`:

- **Online:** `api.getAllHighlights()` (`GET /api/highlights/all`), ordena y limita.
- **Offline:** consulta SQLite uniendo `highlights`, `books` y `verses` para obtener nombre del libro y texto.

---

## Devocionales recientes (mejor conectados)

Dos bloques relacionados pero sin repetir contenido:

| Bloque | Función | Lógica |
|--------|---------|--------|
| **Tu devocional** (destacado) | Tarjeta grande arriba | `pickFeaturedDevotional()` — el más reciente por `createdAt` |
| **Devocionales recientes** (lista) | Hasta 3 entradas debajo de estadísticas | Excluye el ID del destacado (`shownRecentDevotionals`) |

Estados vacíos en la lista:

- Si hay destacado y no quedan otros: «El devocional destacado es tu entrada mas reciente.»
- Si no hay ninguno: «Aún no has escrito devocionales…» + enlace «Escribir el primero».

Utilidad compartida: `lib/devotional.ts` (`pickFeaturedDevotional`, `parseDevotionalContent`).

---

## Recarga al volver a Inicio

`useFocusEffect` recarga en cada foco de la pestaña:

- `getLastPassage()` — continuar lectura.
- `repoListRecentNotebookNotes(3)`.
- `repoListFavorites()` + orden/límite.
- `repoListRecentHighlights(3)`.

Así, editar una nota o marcar un favorito y volver a Inicio refleja los cambios sin reiniciar la app.

---

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `app/(tabs)/index.tsx` | Secciones de recientes, carruseles, navegación y devocionales deduplicados |
| `lib/repo.ts` | `repoListRecentNotebookNotes()`, `repoListRecentHighlights()` |
| `lib/devotional.ts` | `pickFeaturedDevotional()` (ya existía; usado en Inicio) |

Commits de referencia en BibliaAppMobile:

- `b3b3c88` — notas recientes.
- `18616a9` — favoritos, subrayados y devocionales conectados.

---

## Cómo probar

```bash
git clone https://github.com/DavidGC026/BibliaAppMobile.git
cd BibliaAppMobile
npm install
npm run android
```

1. Inicia sesión con una cuenta que tenga libretas, favoritos y subrayados.
2. Edita una nota; vuelve a Inicio → debe aparecer en «Notas recientes».
3. Guarda un versículo como favorito → «Versículos guardados» (máx. 3, más reciente primero).
4. Subraya un versículo → «Subrayados recientes» con color visible.
5. Toca cada tarjeta: nota abre editor; favorito/subrayado abre lector en el pasaje.
6. Con un solo devocional, la lista inferior muestra el mensaje de «entrada mas reciente» sin duplicar la tarjeta destacada.
7. Modo invitado: no deben verse bloques personales.
8. Scroll en pantalla pequeña: comprobar que Inicio no resulte excesivamente largo (QA pendiente en plan maestro).

Verificación de tipos:

```bash
npx tsc --noEmit
```

---

## Errores frecuentes

| Síntoma | Causa probable |
|---------|----------------|
| Notas recientes vacías con datos | SQLite sin sync; abrir Notas online una vez o esperar sync |
| Favoritos desactualizados | `repoListFavorites` solo en foco; volver a Inicio tras marcar |
| Subrayados sin texto | Biblia del versículo no descargada offline; online usa API con texto |
| HTML en preview de nota | `notePreview()` no aplicado o contenido atípico |
| Devocional duplicado | `featuredDevotional.id` no filtrado en `shownRecentDevotionals` |
| Inicio muy largo | Muchos bloques visibles a la vez; pendiente revisión UX en pantallas pequeñas |

---

## Pendiente

- **Prueba manual mobile** en pantallas pequeñas (plan maestro).
- **Centro de inicio configurable** (reordenar/ocultar módulos) — fase posterior.

---

*Última revisión: julio 2026 — verificado contra BibliaAppMobile `18616a9`.*
