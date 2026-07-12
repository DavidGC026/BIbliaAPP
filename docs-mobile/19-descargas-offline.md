# 19 — Descargas offline

Mejoras móviles (julio 2026) para que descargar Biblias y contenido de estudio sea más visible y no dependa de permanecer dentro de la pantalla.

---

## Visibilidad

Antes, las descargas estaban principalmente en **Perfil → Descargas offline**.

Ahora también aparecen en:

- **Biblia**, justo debajo de las pestañas, con una banda “Descargar Biblia para leer sin conexión”.
- **Lector bíblico**, con un botón de descarga en la cabecera del capítulo.

Ajuste posterior (julio 2026): la banda de Biblia dejó de ser permanente porque estorbaba en el uso diario. Ahora solo aparece cuando **no hay ninguna Biblia descargada** y se oculta sola a los **10 segundos** (o al tocarla). Los accesos del lector y de Perfil siguen siempre disponibles.

---

## Cola de descargas

Archivo: `mobile/lib/offlineDownloadManager.ts`.

El gestor centraliza:

- Biblias completas.
- Diccionario Strong.
- Referencias cruzadas.

La pantalla `mobile/app/downloads.tsx` ya no ejecuta descargas directamente; encola tareas y se suscribe al progreso.

---

## Segundo plano

Alcance implementado:

- La descarga continúa aunque el usuario salga de `Descargas` y navegue por la app.
- La cola se guarda en SQLite (`meta.offline_download_queue_v1`).
- Si la app se abre de nuevo y había tareas pendientes, se reanudan como `queued`.

Limitación actual:

- No es un servicio nativo Android de larga duración con notificación persistente. Si el sistema mata completamente la app, la tarea se reanuda al volver a abrirla.

---

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `mobile/lib/offlineDownloadManager.ts` | Cola singleton, progreso, persistencia y reanudación |
| `mobile/app/_layout.tsx` | Hidratación de la cola al iniciar |
| `mobile/app/downloads.tsx` | UI más visible, progreso y tareas en segundo plano de app |
| `mobile/app/(tabs)/bible.tsx` | Acceso visible a Descargas desde Biblia |
| `mobile/components/BibleReader.tsx` | Botón de Descargas en cabecera del lector |

---

## Cómo probar

```bash
cd mobile
npm run android
```

1. Abre **Biblia** y toca la banda de descarga.
2. Descarga una versión bíblica.
3. Sal de la pantalla durante la descarga y navega por la app.
4. Vuelve a **Descargas** y confirma que el progreso sigue.
5. Cierra y abre la app; una tarea pendiente debe reanudarse.
