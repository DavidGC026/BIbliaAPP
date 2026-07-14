# 18 — Lector bíblico e imágenes de versículos

Mejoras móviles (julio 2026) orientadas a que la lectura bíblica sea más cómoda y que la creación de imágenes de versículos tenga un acabado más profesional.

---

## Lector bíblico

Archivo principal: `mobile/components/BibleReader.tsx`.

### Cambios visuales

| Área | Mejora |
|------|--------|
| Cabecera | Muestra libro/capítulo, capítulo actual vs total, versión y acceso a ajustes |
| Progreso | Barra horizontal indica avance dentro del libro |
| Texto bíblico | Número de versículo separado en badge para mejorar escaneo |
| Metadatos | Nota y favorito aparecen como badges debajo del versículo |
| Ajustes | Tamaño de letra, espaciado y alineación configurable |
| Selección | Mantiene acciones contextuales: compartir, copiar, imagen, resaltado, favorito, nota y referencias |

### Continuar donde te quedaste (julio 2026)

Al abrir el lector sin un destino explícito (sin params de libro/capítulo), se restaura el último pasaje leído — versión, libro y capítulo — guardado en `mobile/lib/readerState.ts` (`getLastPassage`/`saveLastPassage`, SecureStore). El guardado ya existía tras cargar cada capítulo; ahora `loadInitial` en `BibleReader.tsx` lo lee al arrancar, validando que la Biblia y el libro existan y acotando el capítulo al total del libro. La navegación externa (versículo del día, referencias, búsqueda) sigue teniendo prioridad.

### Sub-navegación de Biblia y Planes de lectura (julio 2026)

`mobile/app/(tabs)/bible.tsx` agrupa cinco modos en un `SegmentTabs` horizontal: **Lector**, **Buscar**, **Referencias**, **Diccionario** y **Planes**. Al ser una tira desplazable, "Planes" queda al final; el indicador de deslizamiento en las tabs ayuda a descubrirlo.

El panel `mobile/components/ReadingPlansPanel.tsx` consume `/api/plans` (`api.getReadingPlans` / `joinReadingPlan` / `updatePlanProgress`) y muestra:

- **Mis planes** con progreso por día (toca los días para marcarlos completados).
- **Planes disponibles** con botón "Unirme".
- **Estado de error** con botón "Reintentar" (antes los errores se silenciaban y el panel quedaba en blanco).
- **Estado vacío** cuando no hay planes ni inscripciones, en lugar de una lista vacía.
- Invitado (`isGuest`) ve `GuestPrompt` para iniciar sesión.

### Colores en tema claro — Versículo del día (julio 2026)

En `mobile/components/VerseOfDayCard.tsx`, los botones "Leer capítulo" y "Crear imagen" son `variant="outline"`. Sobre la foto de fondo oscurecida su texto usaba `colors.text` (oscuro en tema claro) y quedaba invisible. Ahora el `Button` acepta la prop opcional `textColor`; la tarjeta pasa blanco cuando hay foto de fondo y `colors.text` cuando no la hay. El texto del versículo en el fallback sin foto también usa `colors.text` (antes un `#1C1917` fijo que fallaba en tema oscuro).

### Ajustes de lectura

El modal **Lectura** permite:

- Tamaño de letra entre 16 y 24.
- Espaciado **Amplio** o **Compacto**.
- Alineación **Izquierda** o **Justificada**.

Los ajustes son estado local de la sesión; no se persisten todavía.

---

## Generador de imagen

Archivo principal: `mobile/components/VerseImageCreator.tsx`.

### Cambios principales

| Área | Mejora |
|------|--------|
| Diseños | Presets: Editorial, Minimal, Impacto y Sereno |
| Tipografía | Cada preset decide serif/sans, peso, alineación y contraste |
| Contraste | Overlay configurable por preset para mejorar legibilidad |
| Fondo | Además de mover horizontalmente, ahora se puede mover verticalmente |
| Formatos | Se mantienen Historia, Paisaje, Cuadrado, Retrato y Feed |
| Exportación | Se conserva descarga a galería y compartir imagen |

### Entrada al generador

El mismo generador se usa desde:

- Selección de versículos en el lector.
- Tarjeta del versículo del día en Inicio.

Desde el versículo del día, el generador recibe la foto de fondo de la tarjeta vía la prop opcional `initialPhotoUri` y abre en modo foto con ese fondo, de modo que la imagen descargada/compartida coincide con el preview. El usuario puede cambiarlo por gradiente u otra foto como siempre.

### Posicionamiento del Fondo (Ejes X/Y)

Para los fondos de tipo foto, el usuario puede ajustar la posición y el zoom de la imagen dentro del encuadre. El posicionamiento se controla mediante dos variables de estado (`bgPosX` y `bgPosY` de `0` a `100`), las cuales se mapean en la transformación del contenedor en `mobile/lib/verseImageFormats.ts` con la función `bgImageTransform`.

* **Eje X (Horizontal)**: 
  * Botón `←`: reduce `bgPosX` para desplazar el encuadre (mueve la imagen hacia la derecha).
  * Botón `→`: aumenta `bgPosX` para desplazar el encuadre (mueve la imagen hacia la izquierda).
* **Eje Y (Vertical)**:
  * Botón `↑`: aumenta `bgPosY` para desplazar el encuadre hacia arriba (mueve la imagen hacia arriba en el visor).
  * Botón `↓`: reduce `bgPosY` para desplazar el encuadre hacia abajo (mueve la imagen hacia abajo en el visor).

### Paridad web (julio 2026)

Documentación web detallada: [`docs/creador-imagenes-versiculos.md`](../docs/creador-imagenes-versiculos.md).

El generador web (`components/verse-image-creator.tsx`) se alineó con el móvil:

- **Diseños**: mismos 4 presets (Editorial, Minimal, Impacto, Sereno) con idénticos valores de alineación, serif/sans, peso, acento y overlay base. La tarjeta (`VerseImageCard` web) ahora pinta comillas, divisor, brillo superior y referencia con el color de acento del preset, y alinea a la izquierda en Minimal/Sereno — misma composición que la tarjeta del móvil.
- **"Guardar como mi estilo"**: `lib/verse-image-template.ts` (espejo de `mobile/lib/verseImageTemplate.ts`, con `localStorage` y la misma clave `BIBLIA_VERSE_IMAGE_TEMPLATE`); guarda formato + diseño + color y se restaura al abrir. El indicador `✓ Estilo guardado` se resetea al cambiar cualquiera de los tres.
- **Tamaño de letra Auto**: helper `textSizeForLength` (mismos umbrales que el móvil) y botón `Auto` junto al slider en Ajustes.
- Al elegir un diseño, el slider "Oscurecer fondo" salta al overlay base del preset, pero sigue siendo ajustable (en el móvil el overlay es fijo por preset; la web conserva su slider como extra).
- La web mantiene sus extras propios: difuminado de foto, compartir en Comunidad y los 8 gradientes (superset de los 6 del móvil).

---

## Cómo probar

```bash
cd mobile
npm run android
```

1. Abre **Biblia → Lector**.
2. Cambia tamaño, espaciado y alineación desde el botón de ajustes.
3. Selecciona un versículo con tap y un rango con long press.
4. Verifica que notas/favoritos aparezcan como badges bajo el texto.
5. Toca **Imagen**, cambia formato y diseño.
6. Selecciona una foto y prueba mover el fondo horizontal y verticalmente.
7. Descarga o comparte la imagen generada.
