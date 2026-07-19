# 12 — Paridad con móvil (julio de 2026)

Este documento registra el port de las novedades de `mobile/` posteriores al punto de paridad de junio. La versión resultante del cliente de escritorio es **0.3.0**.

## Alcance implementado

| Área móvil                     | Implementación desktop                                                                                        | Archivos principales                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Inicio inteligente             | Continuar lectura, notas/favoritos/subrayados recientes, anuncios, eventos, métricas y onboarding descartable | `HomePage.tsx`, `lib/preferences.ts`                 |
| Acciones rápidas configurables | Catálogo de diez acciones, selección persistente y panel de personalización                                   | `HomePage.tsx`, `lib/preferences.ts`                 |
| Búsqueda universal             | Biblia, notas, devocionales y Strong; filtros, debounce e historial persistente                               | `UniversalSearchPage.tsx`                            |
| Preferencias de lectura        | Tamaño 16–24 px, densidad, alineación y temas Auto/Claro/Sepia/Noche/Contraste                                | `BibleReader.tsx`, `lib/preferences.ts`              |
| Temas de aplicación            | Sistema, Claro, Oscuro, Sepia, Sepia oscuro, Medianoche, Bosque, Lavanda, DVG y UBG                           | `ThemeContext.tsx`, `ThemeSwitch.tsx`, `globals.css` |
| Planes de lectura              | Descubrir/unirse, siguiente lectura, marcar días, progreso y calendario completo                              | `ReadingPlansPage.tsx`, `lib/readingPlans.ts`        |
| Actividad personal             | Estadísticas por libro, actividad reciente, mapa de días y listado de subrayados                              | `InsightsPage.tsx`                                   |
| Compartir y exportar           | Formato uniforme, Web Share, portapapeles y exportación de notas mediante diálogo PDF                         | lector, versículo diario y editor de notas           |
| Estado offline/sync            | Aviso del lector por 10 s solo si la Biblia no está descargada; contador de cambios pendientes                | `OfflineBanner.tsx`, `SyncStatusBadge.tsx`           |
| Recordatorios                  | Preferencias equivalentes a móvil y avisos mientras la app permanece abierta                                  | `ReminderSettings.tsx`, `DesktopReminders.tsx`       |
| Permisos por sección           | Barra lateral y subpestañas de Biblia/Notas respetan `allowedSections`                                        | navegación y páginas contenedoras                    |
| Administración                 | Lista/búsqueda, alta, edición, roles, permisos y eliminación segura                                           | `AdminUsersPage.tsx`                                 |
| Legal                          | Enlaces, catálogo de licencias y aceptación bloqueante para cuentas pendientes                                | `LegalPage.tsx`, `LegalAcceptanceGate.tsx`           |
| Licencias de Biblias           | Aplica `canDownload`, `canCopy`, `canShare` y `canCreateImages`                                               | lector, descargas, versículo diario y SQLite         |

Los temas DVG y UBG solo aparecen para administradores. Si una sesión no administradora conserva uno de esos valores, vuelve automáticamente a Sistema.

## Adaptaciones propias de escritorio

- Las preferencias no sensibles se guardan en el almacenamiento persistente del WebView. El token continúa en `tauri-plugin-store`.
- “Exportar PDF” abre el diálogo de impresión nativo; el usuario elige **Guardar como PDF**.
- Los recordatorios usan la API de notificaciones del WebView mientras BibliaAPP está abierta. No se añadió un servicio residente en segundo plano.
- La búsqueda universal también está disponible como elemento de la barra lateral.
- Las políticas se abren desde las rutas públicas del backend para mantener una fuente jurídica única.

## Licencias y SQLite

La tabla `bibles` incorpora `capabilities_json`. Al actualizar desde una base anterior, `getDb()` ejecuta una migración idempotente.

1. Solo `canDownload === true` permite iniciar una descarga.
2. Los capítulos online solo se cachean cuando la versión permite descarga.
3. Si el servidor retira el permiso, el refresco del catálogo elimina el texto descargado.
4. Un `403` en descarga masiva no cae al método capítulo por capítulo.
5. Copiar, compartir y crear imágenes se deshabilitan por separado.

## Nuevos endpoints consumidos

- `GET/POST /api/plans`
- `GET /api/highlights/all`
- `GET/POST /api/activity`
- `GET /api/statistics`
- `GET /api/events`
- `GET /api/feed/announcements`
- `POST /api/legal/accept`
- `GET/POST /api/admin/users`
- `PUT/DELETE /api/admin/users/:id`
- `GET /api/admin/sections`

`GET /api/bibles` ahora devuelve `defaultBibleId` y capacidades/licencia por traducción.

## Persistencia local nueva

| Clave                            | Contenido                                          |
| -------------------------------- | -------------------------------------------------- |
| `bibliaapp_theme_mode`           | Tema global                                        |
| `bibliaapp_reader_preferences`   | Tipografía, densidad, alineación y tema del lector |
| `bibliaapp_last_passage`         | Último capítulo abierto                            |
| `bibliaapp_home_actions`         | Acciones rápidas visibles                          |
| `bibliaapp_search_history`       | Últimas diez búsquedas                             |
| `bibliaapp_onboarding_dismissed` | Onboarding ocultado                                |
| `bibliaapp_verse_image_template` | Formato/gradiente favorito                         |
| `bibliaapp_reminder_preferences` | Recordatorios activados                            |

## Validación

```bash
cd desktop
npm run build
npm run check
cargo check --manifest-path src-tauri/Cargo.toml
```

La respuesta pública de `/api/bibles` se comprobó contra producción y contiene `defaultBibleId` y las capacidades esperadas.
