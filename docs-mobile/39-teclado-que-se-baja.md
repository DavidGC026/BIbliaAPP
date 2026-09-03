# 39 — Al bajar el teclado, la vista se quedaba a media pantalla

Tercera vuelta sobre la misma zona que el [34](./34-notas-cinta-bajo-el-teclado.md)
y el [37](./37-cinta-inset-ime.md), pero con el fallo del revés.
Septiembre 2026.

---

## El síntoma

En una nota, con el teclado abierto, al bajarlo: la cinta se queda flotando por
la mitad de la pantalla y por debajo no hay más que fondo. El hueco mide justo
lo que medía el teclado. Solo se recupera saliendo de la nota.

Es decir: algo se quedó reservando el sitio del teclado después de que el teclado
se fuera. Y ese «algo» puede ser una de dos capas, porque las dos apartan el
contenido y las dos tienen su propia idea de cuánto tapa el teclado:

1. **`app/note/[noteId].tsx`**, que le pone a la pantalla un `paddingBottom` del
   alto del teclado (el inset IME, ver el [37](./37-cinta-inset-ime.md)).
2. **La propia página del editor**, que fija `--app-height` con
   `visualViewport.height` porque `height: 100%` mide contra el viewport de
   maqueta.

Desde fuera se ven iguales —el fondo de las dos es el mismo color y la cinta
acaba en el mismo sitio—, así que el arreglo cierra las dos.

## 1. El inset se quedaba clavado en el alto del teclado

`hooks/useKeyboardInset.ts` solo publicaba los estados asentados (`OPEN` y
`CLOSED`) y descartaba lo repetido comparando con **la pasada anterior**, que es
lo que `useAnimatedReaction` da como `previous`. El problema es que ahí entran
también las pasadas de la animación, que se descartan por estado pero igualmente
quedan como «anterior».

Mirando el lado nativo de Reanimated (`Keyboard.java`,
`KeyboardAnimationCallback.java`): al cerrarse, `onProgress` va bajando el alto
con el estado en `CLOSING` hasta llegar a cero, y `onEnd` **no toca el alto**,
solo pone `CLOSED`. La última pasada buena llega, pues, con el mismo cero que la
anterior: `current.height === previous.height`, se descarta, y el inset se queda
con el alto del teclado abierto para siempre.

Ahora la comparación es contra **el último alto publicado a React**, guardado en
un shared value, que es lo único que de verdad hay que evitar repetir. Y `CLOSED`
vale cero por definición, sin fiarse del alto que dejara el último fotograma.

Además, una red de seguridad: `keyboardDidHide` de React Native baja el inset a
cero. Si el teclado se va sin animación de insets —volviendo de segundo plano, o
según qué capa del fabricante— no llega ningún `CLOSED` y nada más volvería a
moverlo. Solo baja a cero, que es el estado seguro: si el teclado siguiera ahí,
el siguiente inset lo vuelve a subir. El alto que anuncia ese evento se sigue
sin usar, que es de lo que iba el [37](./37-cinta-inset-ime.md).

## 2. La página no siempre se entera de que el viewport creció

`lib/tiptap/editor/entry.ts` remedía en `resize` del viewport visual. Al bajar el
teclado el WebView pierde el foco y el motor no siempre emite ese `resize`: la
página se queda con el alto de cuando el teclado estaba puesto.

Se remide también al perder el foco (`focusout`) y cuando React Native avisa de
que el teclado ya no tapa nada (`setKeyboardInset` con `value: 0`). En los dos
casos hay un segundo repaso a 300 ms, porque el teclado se va animado.

## 3. Una sola fuente para el alto del teclado

El lector seguía con `useKeyboardHeight`, el de `keyboardDidShow`, que el
[37](./37-cinta-inset-ime.md) ya había desterrado del editor por poco fiable y
dejó apuntado para más adelante. De él colgaban la barra de acciones, la
navegación inferior, el relleno de las listas y un modal: el mismo fallo
esperando en otra pantalla. Ese hook desaparece y todo pasa por
`useKeyboardInset`.

El cambio no es solo de nombre. El inset IME se mide **desde el borde inferior
de la ventana**, así que con el teclado abierto ya incluye la banda de la barra
de navegación. Sumarlo a `insets.bottom` —que es lo que hacía el lector— la
contaría dos veces:

```diff
- bottom: 16 + insets.bottom + keyboardHeight
+ bottom: 16 + Math.max(insets.bottom, keyboardInset)
```

## Una prueba, para que no haya cuarta vuelta

La regla que decide qué alto publicar sale del hook a
`hooks/keyboardInsetState.ts` como función pura, y `scripts/test_keyboard_inset.cjs`
—enganchado a `npm run check`— reproduce en node la secuencia que emite
Reanimated, leída de su código nativo:

| Aviso | Qué hace |
|---|---|
| `onStart` | cambia el estado (`OPENING` / `CLOSING`), **no** toca el alto |
| `onProgress` | mueve el alto, un aviso por fotograma, con ese mismo estado |
| `onEnd` | cambia el estado (`OPEN` / `CLOSED`), **tampoco** toca el alto |

Que los dos últimos avisos lleguen en la misma pasada o en dos depende de cómo
caiga el fotograma —las reacciones de Reanimated se agrupan por fotograma—, y
de eso dependía que el fallo apareciera al abrir, al cerrar o en ningún sitio.
Por eso la prueba corre las dos formas: con la regla vieja, la de «una pasada
por aviso» falla; con la nueva, las dos acaban donde deben.

## Archivos

| Archivo | Cambio |
|---|---|
| `hooks/keyboardInsetState.ts` | **Nuevo.** La regla, pura y comprobable en node |
| `hooks/useKeyboardInset.ts` | Compara contra el último alto publicado, `CLOSED` es cero, y `keyboardDidHide` de red de seguridad |
| `hooks/useKeyboardHeight.ts` | **Eliminado.** Su alto era el de `keyboardDidShow` |
| `hooks/useContentPadding.ts` | Pasa al inset IME, con `Math.max` en vez de suma |
| `components/BibleReader.tsx` | Íd. en la barra de acciones, la navegación y el modal |
| `lib/tiptap/editor/entry.ts` | Remide el alto visible al perder el foco y al irse el teclado |
| `scripts/test_keyboard_inset.cjs` | **Nuevo.** La secuencia de Reanimated, de principio a fin |
| `scripts/test_editor_page.cjs` | Dos comprobaciones nuevas del remedido de la página |

## Verificación

```bash
cd mobile
npm run build:editor
npm run check      # 11 comprobaciones nuevas
npx tsc --noEmit   # limpio
```

En un teléfono, que es donde vive este fallo: abrir una nota, tocar el texto,
bajar el teclado con el botón/gesto de atrás y ver la cinta pegada al fondo de la
pantalla, sin hueco. Repetirlo varias veces seguidas, y también saliendo de la
app con el teclado abierto y volviendo.

Y en el lector, que cambia de fuente: buscar dentro de un capítulo y comprobar
que la barra de acciones y la navegación inferior quedan justo encima del
teclado —ni tapadas ni flotando—, y que al cerrarlo vuelven a su sitio.
