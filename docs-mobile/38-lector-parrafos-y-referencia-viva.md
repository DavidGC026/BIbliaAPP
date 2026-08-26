# 38 — Lector: modo párrafos, referencia viva y progreso por versículo

Incluido en el APK **4.0.9** (`versionCode` 48). Ver
[13-build-apk-release.md](./13-build-apk-release.md).


Paridad con las mejoras del lector web descritas en
[`docs/diseno-lector-biblico.md`](../docs/diseno-lector-biblico.md). De las
siete mejoras web se portan las dos que más aportan en móvil: **modo párrafos**
(texto corrido) y **referencia viva con progreso por versículo**.

---

## Modo párrafos

### Preferencia

- `mobile/lib/readerState.ts`: nuevo tipo `ReaderLayout = 'verses' | 'paragraphs'`,
  campo `layout` en `ReaderPreferences` (por defecto `'verses'`), saneado al
  cargar y persistido en SecureStore junto al resto de ajustes del lector.
- Hoja de ajustes del lector (`Aa`): nuevo grupo **Texto** con el segmentado
  **Versículos / Párrafos**, entre «Tamaño» y «Espaciado».

### Renderizado (`mobile/components/BibleReader.tsx`)

En modo párrafos el capítulo es **un único `<Text>`** con un span anidado por
versículo. Decisiones frente a la web:

| Aspecto | Web (DOM) | Móvil (React Native) |
|---------|-----------|----------------------|
| Superíndice del número | `<sup>` real | Span inline en negrita al 60 % del cuerpo (RN no tiene `vertical-align`) |
| Subrayado tipo marcador | `box-decoration-clone` + fondo con opacidad | Fondo translúcido (`highlightBg`) en el span de texto; RN lo pinta por línea automáticamente |
| Indicador de nota | Icono FileText en superíndice | Glifo `✎` pequeño en color acento (no hay iconos inline en `<Text>`) |
| Selección | Clic subraya + borde lateral | Toque sobre el span: fondo `accentSoft` + subrayado; larga pulsación sigue seleccionando rango |
| Capitular | Sí (`.verse-dropcap`) | **No**: RN no tiene floats y una capitular falsa rompería el flujo; queda como mejora futura |

Un solo `<Text>` también es más barato que 30-176 `Pressable` (Salmo 119).

### Salto a versículo

En modo versículos cada fila mide su `layout.y` (`verseOffsetsRef`) y
`revealPendingVerse` hace scroll exacto al versículo pedido (mapa de
referencias, notas de versículo, etc.). En modo párrafos no hay caja por
versículo, así que se aproxima por proporción:

```
y ≈ topDelBloque + (versículo - 1) / totalVersículos × altoDelBloque
```

La caja se mide en el `onLayout` del `<Text>` (`paragraphsTopRef` /
`paragraphsHeightRef`) y se reinicia al cargar cada capítulo.

## Referencia viva y progreso por versículo

- **Scroll-spy** (`handleReaderScroll`, `scrollEventThrottle={120}`):
  - Versículos: recorre las cajas medidas y toma el último versículo cuyo
    offset quedó por encima del scroll (con el mismo margen
    `VERSE_SCROLL_MARGIN = 80` que el salto a versículo).
  - Párrafos: misma aproximación por proporción sobre la caja del bloque.
- **Pill inferior de navegación**: pasa de `LIBRO CAP` a
  `LIBRO CAP:VERS` (p. ej. `GÉNESIS 1:31`) usando el versículo visible.
- **Barra de progreso** de la cabecera: antes era `capítulo / total del libro`
  (información redundante con el eyebrow «Capítulo X de Y»); ahora es
  `versículo visible / versículos del capítulo`, como en la web. Mínimo 3 %
  para que siempre se vea el trazo.
- `currentVerseNum` se reinicia a 1 al cargar capítulo y solo dispara
  re-render cuando cambia el versículo (actualización funcional con
  comparación).

## Verificación

```bash
cd mobile
npm install   # si node_modules no existe
npx tsc --noEmit
```

> En este entorno `mobile/node_modules` no está instalado; se validó la
> sintaxis de los dos archivos con `typescript.transpileModule` (0 errores) y
> se revisaron los tipos manualmente. Ejecutar el `tsc` completo tras
> `npm install`.

Pruebas manuales:

1. Ajustes (`Aa`) → **Texto → Párrafos**: texto corrido con números inline;
   tocar un versículo lo subraya y abre la barra de acciones; larga pulsación
   selecciona rango; los subrayados de colores pintan solo el texto.
2. Hacer scroll en ambos modos: el pill inferior actualiza `CAP:VERS` y la
   barra de progreso avanza por versículo; cambiar de capítulo reinicia a `:1`.
3. Abrir un versículo desde el mapa de referencias o «Versículos con notas»
   estando en modo párrafos: el lector salta a la posición aproximada y
   selecciona el versículo.
4. Verificar la persistencia: cerrar y abrir la app mantiene el modo elegido.

## Pendiente

- Capitular en el primer versículo del modo párrafos.
- Refinamiento del salto a versículo en párrafos si la aproximación se nota
  imprecisa en capítulos con versículos de longitud muy desigual (p. ej.
  medir la caja en dos pasos y ajustar por iteración).
