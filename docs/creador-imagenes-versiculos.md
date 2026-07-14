# Creador de imágenes de versículos (web)

Documentación del modal **Crear Imagen** en la web Next.js (julio 2026), alineado con el generador móvil descrito en [`docs-mobile/18-lector-biblia-e-imagenes.md`](../docs-mobile/18-lector-biblia-e-imagenes.md).

---

## Resumen

Permite exportar un versículo como PNG con tipografía, fondo (gradiente o foto), formato de relación de aspecto y estilo visual. El usuario puede descargar, compartir externamente o publicar en la Comunidad.

| Área | Implementación web |
|------|-------------------|
| Componente UI | `components/verse-image-creator.tsx` |
| Formatos y geometría | `lib/verse-image-formats.ts` |
| Estilo guardado ("mi estilo") | `lib/verse-image-template.ts` |
| Fotos Unsplash | `GET /api/unsplash` |
| Proxy CORS para export | `GET /api/image-proxy` |
| Export PNG | `html-to-image` (`toPng`) |

---

## Dónde se abre

| Entrada | Archivo | Cómo |
|---------|---------|------|
| Lector bíblico | `components/bible-reader/index.tsx` | Acción **Imagen** en la barra contextual al seleccionar versículo(s) |
| Versículo del día | `components/verse-of-the-day.tsx` | Botón **Crear imagen** en la tarjeta de inicio |

Props del componente:

```tsx
<VerseImageCreator
  open={boolean}
  onOpenChange={(open) => void}
  text={string}        // texto del versículo
  reference={string}   // p. ej. "Juan 3:16"
  abbr={string}        // versión bíblica, default "RVR1960"
  theme={string}       // reservado; aún no usado en web (ver § Paridad)
/>
```

---

## Arquitectura del editor

```text
┌─────────────────────────────────────────────────────────────┐
│  VerseImageCreator (React, portal fullscreen z-[100])       │
├─────────────────────────────────────────────────────────────┤
│  Preview visible     → VerseImageCard (escala preview)      │
│  Lienzo oculto       → VerseImageCard (tamaño export real)  │
│  Panel inferior      → tabs Formato · Fondos · Ajustes      │
└─────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
  html-to-image/toPng            localStorage
  (descarga / share)             BIBLIA_VERSE_IMAGE_TEMPLATE
```

Al abrir el modal:

1. Se resetea estado de búsqueda Unsplash y posición de foto.
2. Se restaura **mi estilo** desde `getVerseImageTemplate()` si existe.
3. Se calcula **tamaño de letra Auto** con `textSizeForLength(text.length)`.
4. Se precargan fotos Unsplash según orientación del formato activo.

---

## Formatos de imagen

Definidos en `lib/verse-image-formats.ts` (`IMAGE_FORMATS`):

| ID | Etiqueta | Export | Orientación Unsplash |
|----|----------|--------|----------------------|
| `9:16` | Historia | 1080×1920 | portrait |
| `16:9` | Paisaje | 1920×1080 | landscape |
| `1:1` | Cuadrado | 1080×1080 | squarish |
| `3:4` | Retrato | 1080×1440 | portrait |
| `4:5` | Feed | 1080×1350 | portrait |

Cambiar formato vuelve a pedir fotos con la orientación correspondiente.

---

## Diseños (presets)

Constante `IMAGE_STYLES` en `verse-image-creator.tsx` — espejo de `IMAGE_STYLES` en `mobile/components/VerseImageCreator.tsx`:

| ID | Nombre | Alineación | Overlay base | Acento | Serif |
|----|--------|------------|--------------|--------|-------|
| `editorial` | Editorial | centro | 35% | `#fbbf24` | sí |
| `minimal` | Minimal | izquierda | 46% | `#FFFFFF` | no |
| `bold` | Impacto | centro | 58% | `#FDE68A` | no |
| `quiet` | Sereno | izquierda | 28% | `#BAE6FD` | sí |

`VerseImageCard` renderiza comillas decorativas, divisor, brillo superior con color de acento, texto, referencia y abreviatura de versión — misma composición que la tarjeta móvil.

Al elegir un diseño, el slider **Oscurecer fondo** salta al overlay base del preset pero sigue siendo ajustable manualmente (extra web: en móvil el overlay es fijo por preset).

---

## Fondos

### Gradientes (8 presets web)

Oro, Atardecer, Océano, Bosque, Púrpura, Rosa, Noche, Tierra — superset de los 6 del móvil.

### Fotos

- **Unsplash:** búsqueda por texto, chips de sugerencia (`SEARCH_HINTS`), paginación con "Cargar más". Parámetros: `query`, `orientation`, `page`.
- **Subida local:** `<input type="file">` → Data URL en memoria.
- **Posicionamiento:** sliders horizontal/vertical (0–100), zoom (100–200%), difuminado (0–20 px) — solo en modo foto.
- Las URLs remotas se convierten a Data URL vía `/api/image-proxy` antes de exportar (evita CORS en `html-to-image`).

Requisito de entorno: `UNSPLASH_ACCESS_KEY` en el servidor para `/api/unsplash`.

---

## Guardar como mi estilo

`lib/verse-image-template.ts` persiste en `localStorage` con clave `BIBLIA_VERSE_IMAGE_TEMPLATE` (misma clave que `mobile/lib/verseImageTemplate.ts` en SecureStore):

```ts
{ formatId: string; styleId: string; gradientId: string }
```

- **No** guarda tamaño de letra (depende de la longitud del versículo).
- El botón muestra `✓ Estilo guardado` hasta que cambie formato, diseño o gradiente.
- Al reabrir el modal se restauran los tres campos; el overlay se inicializa desde el preset del diseño guardado.

---

## Tamaño de letra Auto

Helper `textSizeForLength(len)` (umbrales idénticos al móvil):

| Caracteres | Tamaño (px) |
|------------|-------------|
| ≤ 80 | 22 |
| ≤ 140 | 19 |
| ≤ 220 | 17 |
| > 220 | 15 |

Botón **Auto** en la pestaña Ajustes recalcula según el texto actual.

---

## Exportación y compartir

1. **Descargar** — `captureExportImage()` espera imágenes cargadas, fuerza fondo foto a Data URL si hace falta, genera PNG con dimensiones del formato activo y dispara descarga `versiculo-<referencia>.png`.
2. **Compartir externo** — `navigator.share` con archivo si está disponible; si no, comparte texto o copia al portapapeles.
3. **Compartir en Comunidad** — sube PNG a `POST /api/upload`, crea post en `POST /api/feed/posts` con markdown de la imagen.

El lienzo de export vive fuera de pantalla (`position: fixed; left: -99999`) para evitar interferencia del preview escalado.

---

## Paridad web ↔ móvil

| Capacidad | Web | Móvil |
|-----------|-----|-------|
| 4 diseños + composición de tarjeta | ✓ | ✓ |
| 5 formatos de aspecto | ✓ | ✓ |
| Mi estilo (formato + diseño + color) | ✓ (`localStorage`) | ✓ (`SecureStore`) |
| Tamaño letra Auto | ✓ | ✓ |
| Overlay ajustable post-preset | ✓ (slider extra) | fijo por preset |
| Difuminado de foto | ✓ | — |
| Compartir en Comunidad | ✓ | — |
| 8 gradientes | ✓ | 6 |
| Foto inicial desde versículo del día | **pendiente** (`theme` / `backgroundImage` no cableados) | ✓ (`initialPhotoUri`) |

Detalle del generador móvil: [`docs-mobile/18-lector-biblia-e-imagenes.md`](../docs-mobile/18-lector-biblia-e-imagenes.md) § Generador de imagen.

> **Nota:** Las imágenes **dentro de notas** (editor enriquecido) son un subsistema distinto — ver [`notas-web-paridad-movil.md`](./notas-web-paridad-movil.md) y [`docs-mobile/21-insercion-y-edicion-de-imagenes.md`](../docs-mobile/21-insercion-y-edicion-de-imagenes.md).

---

## Cómo probar (web)

1. Inicia sesión en https://biblia2.dvguzman.com (o `npm run dev` local).
2. **Lector:** selecciona un versículo → **Imagen** → cambia formato, diseño y fondo.
3. Pulsa **Guardar como mi estilo**, cierra y vuelve a abrir: debe restaurarse.
4. Prueba **Auto** en tamaño de letra con versículos cortos y largos.
5. Elige foto Unsplash o sube una local; ajusta posición/zoom/difuminado.
6. **Descargar** y abrir el PNG; verifica resolución del formato elegido.
7. **Compartir en Comunidad** (requiere sesión) y comprueba el post en el feed.

### Problemas frecuentes

| Síntoma | Causa probable | Qué revisar |
|---------|----------------|-------------|
| Sin fotos Unsplash | Falta `UNSPLASH_ACCESS_KEY` | `.env.local` / variables del contenedor |
| "No se pudo cargar esa imagen de fondo" | CORS o proxy | `/api/image-proxy`, red del servidor |
| Export vacío o recortado | Imagen externa no convertida | `urlToDataUrl` antes de `toPng` |
| Estilo no persiste | Storage bloqueado | modo incógnito, cuota `localStorage` |

---

## Despliegue

Tras cambios en estos archivos:

```bash
docker restart biblia2-app
docker logs -f biblia2-app   # esperar "Ready"
curl -s http://127.0.0.1:3003/api/health
```

Recarga con **Ctrl+Shift+R** en producción.
