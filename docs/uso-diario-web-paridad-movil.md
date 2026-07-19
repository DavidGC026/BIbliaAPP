# Uso diario web — paridad con el plan maestro móvil

Documentación de las mejoras (julio 2026) que portan a la web tres bloques del [plan maestro móvil](../docs-mobile/20-plan-maestro-mejoras-generales.md): **continuar lectura**, **recientes inteligentes** en Inicio y **historial de búsqueda** en el buscador avanzado.

Referencia de implementación: commit `c1288cd` (paridad con `docs-mobile/20`).

---

## Resumen

| Mejora | Mobile (referencia) | Web (este cambio) |
|--------|---------------------|-------------------|
| Continuar lectura | Tarjeta en Inicio + `readerState` (SecureStore) | Tarjeta en Dashboard + `lib/reader-state.ts` (`localStorage`) |
| Restaurar lector | `loadInitial` sin params explícitos | `BibleReader` restaura si no hay props ni query `?bible=`/`?book=`/`?chapter=`/`?verse=` |
| Recientes inteligentes | Hasta 3 favoritos y 3 subrayados en Inicio | Mismos límites en `components/dashboard.tsx` vía API |
| Historial de búsqueda | `lib/searchHistory.ts` (SecureStore, 10 entradas) | `lib/search-history.ts` (`localStorage`, 10 entradas) en **Buscador avanzado** |
| Biblia por defecto | Catálogo / preferencia local | `/api/bibles` → `defaultBibleId`, ya no id fijo `149` |

---

## Continuar lectura

### Almacenamiento

Archivo: `lib/reader-state.ts`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `bibleId` | `number` | Versión bíblica activa |
| `bookId` | `number` | Libro (≥ 1) |
| `chapter` | `number` | Capítulo (≥ 1) |
| `bookName` | `string?` | Nombre legible para la tarjeta del Dashboard |
| `updatedAt` | `number` | Marca de tiempo al guardar |

- Clave: `biblia_last_reading`
- Persistencia: **solo `localStorage`**, por dispositivo y navegador (igual que mobile en un solo dispositivo).
- Errores de almacenamiento se ignoran: la continuidad es opcional.

### Lector (`components/bible-reader/index.tsx`)

1. **Guardar:** cuando `bibleId`, `bookId`, `chapter` y `currentBook` están resueltos, se llama a `saveLastReading()`.
2. **Restaurar:** en el primer montaje, si **no** hay navegación explícita, se lee `loadLastReading()` y se aplican versión, libro y capítulo.

La navegación explícita tiene prioridad y **no** se sobrescribe con el último pasaje:

- Props `initialBookId` / `initialChapter` / `initialVerse` / `initialBibleId` (desde `handleSelectVerse` en `app/page.tsx`).
- Query params `bible`, `book`, `chapter`, `verse` en la URL (deep links).

### Dashboard (`components/dashboard.tsx`)

- Tras montar en cliente, `loadLastReading()` alimenta la tarjeta **Continuar lectura** (visible también para invitados).
- Al pulsar, llama a `onSelectVerse(bookId, chapter, undefined, bibleId)` → `handleSelectVerse` en `app/page.tsx` → pestaña **Leer** con el pasaje.

### Registro de sección

`lib/app-section-registry/sections.client.tsx` pasa `onSelectVerse={ctx.handleSelectVerse}` al `Dashboard`. Sin esto, la tarjeta solo cambiaba de pestaña sin abrir el capítulo guardado.

---

## Recientes inteligentes (Dashboard)

Solo usuarios autenticados (`!isGuest`).

| Bloque | API | Límite | Acción al pulsar |
|--------|-----|--------|------------------|
| Favoritos recientes | `GET /api/favorites` | 3 primeros | `onSelectVerse` con `bible_id`, libro, capítulo y versículo |
| Subrayados recientes | `GET /api/highlights/all` | 3 primeros | Igual |

Enlaces **Ver todos →** abren las secciones `favorites` y `highlights` del registro de app.

Los datos vienen del servidor (cuenta del usuario), no de almacenamiento local. Mobile muestra el mismo patrón desde SQLite/API sincronizada; en web no hay capa offline equivalente.

---

## Historial de búsqueda (buscador avanzado)

Archivo: `lib/search-history.ts`

| Constante | Valor |
|-----------|-------|
| Clave `localStorage` | `biblia_search_history` |
| Máximo de entradas | 10 |
| Dedupe | Insensible a mayúsculas; la búsqueda más reciente queda primera |

API pública: `loadSearchHistory`, `addSearchHistory`, `removeSearchHistory`, `clearSearchHistory`.

UI: `components/search-advanced.tsx`

- Los chips aparecen cuando el campo está vacío, no hay carga en curso y hay historial.
- Tocar un chip rellena el término y ejecuta la búsqueda.
- Botón **×** en cada chip → `removeSearchHistory`.
- **Borrar todo** → `clearSearchHistory`.

Solo se registra historial tras una búsqueda **exitosa** (`runSearch` tras respuesta OK de `/api/search`).

### Pitfall: dos historiales distintos en web

| Ubicación | Clave | Máx. | Módulo |
|-----------|-------|------|--------|
| **Estudio → Buscar** (sección `search`) | `biblia_search_history` | 10 | `lib/search-history.ts` |
| **Leer → Buscar** (pestaña del lector) | `recent_searches` | 5 | inline en `components/bible-reader/reader-search.tsx` |

No comparten datos. Al documentar o depurar búsquedas, identificar cuál buscador usa el usuario.

Mobile unifica historial en la búsqueda universal (`mobile/lib/searchHistory.ts`); la web aún no tiene pantalla equivalente multi-tipo.

---

## Biblia por defecto del catálogo

En `components/bible-reader/index.tsx`, al resolver la versión inicial:

```typescript
setBibleId(biblesData?.defaultBibleId ?? Number(bibles[0].bibleId))
```

Antes se asumía el id `149`. Ahora respeta `defaultBibleId` de `GET /api/bibles` y cae al primer elemento del catálogo.

La restauración de **Continuar lectura** también fija `bibleId` desde el objeto guardado; el default del catálogo aplica cuando no hay última lectura válida.

---

## Cómo probar

```bash
npm run dev
```

1. **Continuar lectura:** abre **Leer**, cambia de capítulo, vuelve a **Inicio** → debe aparecer la tarjeta con libro y capítulo. Pulsa la tarjeta → debe abrir el mismo capítulo (misma versión si cambiaste de Biblia antes de salir).
2. **Prioridad de navegación:** desde **Continuar lectura** o un favorito, confirma que el lector abre el pasaje indicado y no el genérico Génesis 1.
3. **Invitado:** continuar lectura funciona sin login; favoritos/subrayados recientes no se muestran.
4. **Recientes:** con sesión, marca favoritos y subrayados; en Inicio deben listarse hasta 3 de cada uno con navegación al versículo.
5. **Historial:** en **Estudio → Buscar** (o sección Buscar del menú), ejecuta varias búsquedas → chips reutilizables; quita una y borra todo.
6. **Biblia default:** en un perfil sin última lectura, abre **Leer** y verifica que la versión coincide con la predeterminada del servidor, no un id fijo.

---

## Solución de problemas

| Síntoma | Causa probable | Qué revisar |
|---------|----------------|-------------|
| La tarjeta Continuar lectura no aparece | Sin lectura previa o `localStorage` bloqueado | DevTools → Application → `biblia_last_reading` |
| La tarjeta abre Leer pero capítulo incorrecto | Falta `onSelectVerse` en el registro del Dashboard | `sections.client.tsx` |
| Siempre Génesis 1 al entrar a Leer | Restauración desactivada por query params en URL | Limpiar `?book=` etc. o usar navegación interna |
| Historial vacío en buscador avanzado | Búsquedas fallidas no se guardan | Respuesta de `/api/search`; clave `biblia_search_history` |
| Historial distinto en Leer vs Buscar | Dos implementaciones separadas | Ver tabla «dos historiales» arriba |
| Versión bíblica inesperada sin última lectura | Catálogo sin `defaultBibleId` | Respuesta de `/api/bibles` |

---

## Documentos relacionados

| Documento | Relación |
|-----------|----------|
| [docs-mobile/20-plan-maestro-mejoras-generales.md](../docs-mobile/20-plan-maestro-mejoras-generales.md) | Plan origen (Fase 1 — continuidad y uso diario) |
| [docs-mobile/18-lector-biblia-e-imagenes.md](../docs-mobile/18-lector-biblia-e-imagenes.md) | Continuar lectura en mobile + paridad del lector web |
| [docs-mobile/23-paridad-web-mobile-global.md](../docs-mobile/23-paridad-web-mobile-global.md) | Shell y hubs; enlace a este doc para uso diario |
| [docs/nuevas-secciones.md](./nuevas-secciones.md) | Registro del Dashboard y `handleSelectVerse` |
