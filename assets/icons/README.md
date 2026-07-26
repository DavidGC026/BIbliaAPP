# BibliaAPP Icons

Colección SVG neutral para **mobile**, **web** y **desktop**. Los archivos son propios de este proyecto; no dependen de una fuente de iconos ni de una plataforma.

## Reglas visuales

- Lienzo: `24 × 24`.
- Trazo: `1.8`, extremo y unión redondos.
- Color: `currentColor`; el consumidor define el color.
- Estilo: contorno. Para estados seleccionados, aplicar el color de acento o usar el icono dentro de un contenedor con fondo; no mezclar variantes rellenas sin una razón de estado.

## Tamaños recomendados

| Contexto | Tamaño |
| --- | ---: |
| Barra de pestañas y acciones principales | 24 px |
| Botón estándar y encabezado | 20 px |
| Acción secundaria | 16 px |
| Metadato o estado auxiliar | 14 px |

## Convenciones

- Los nombres son semánticos y en `kebab-case`.
- Usa `bible.svg` para la Biblia, en vez de alternar entre `book`, `menu_book` y variantes por plataforma.
- Usa `community.svg` para el feed/comunidad y `groups.svg` para grupos: representan conceptos distintos.
- `offline.svg`, `sync.svg`, `error.svg` e `info.svg` son estados, no acciones.

Todos los SVG usan `viewBox="0 0 24 24"`, por lo que se pueden convertir a componente en React Native, importar como imagen o insertar directamente en web/desktop.
