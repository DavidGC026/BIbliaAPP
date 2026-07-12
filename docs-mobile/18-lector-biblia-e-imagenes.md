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
