# Widget del Versículo del Día (VerseOfDayWidget)

Este documento describe la arquitectura, el funcionamiento técnico y las mejoras recientes implementadas en el widget nativo de Android de **BibliaAPP Móvil**.

---

## 🏗️ Arquitectura y Componentes

El widget de la aplicación utiliza la librería `react-native-android-widget` para renderizar componentes de interfaz de usuario de Android nativos mediante JSX. Se compone de los siguientes archivos clave:

1. **[`app.json`](file:///home/david/proyectos/BibliaAPP/mobile/app.json)**: Registra el widget nativo ante el sistema operativo Android y define sus límites de tamaño, redimensionamiento y periodo de actualización.
2. **[`widget-task-handler.tsx`](file:///home/david/proyectos/BibliaAPP/mobile/widgets/widget-task-handler.tsx)**: Maneja los eventos del ciclo de vida del widget (creación, actualización y redimensionamiento) disparados por el sistema operativo en segundo plano.
3. **[`VerseOfDayWidget.tsx`](file:///home/david/proyectos/BibliaAPP/mobile/widgets/VerseOfDayWidget.tsx)**: Define la estructura visual y de UI del widget (textos, iconos SVG nativos, imágenes y gradientes).
4. **[`verseWidgetCache.ts`](file:///home/david/proyectos/BibliaAPP/mobile/lib/verseWidgetCache.ts)**: Gestiona la caché local de los metadatos del versículo y la descarga de imágenes en base64 para el funcionamiento sin conexión.
5. **[`verseWidgetUpdate.ts`](file:///home/david/proyectos/BibliaAPP/mobile/lib/verseWidgetUpdate.ts)**: Expone la función auxiliar `updateVerseWidget` para forzar la actualización del widget desde la aplicación React Native.

---

## ⚙️ Flujo de Funcionamiento

### 1. Inicialización y Eventos (`widget-task-handler.tsx`)
Cuando el usuario añade el widget, el sistema de Android le envía eventos que el `widgetTaskHandler` intercepta.
* **`WIDGET_ADDED` / `WIDGET_UPDATE` / `WIDGET_RESIZED`**:
  1. Carga los datos del versículo. Intenta obtenerlo de la caché local para rapidez y uso sin conexión. Si no hay caché del día actual, hace un `fetch` a la API (`/api/verse-of-the-day`).
  2. Calcula el ancho disponible en la pantalla mediante `props.widgetInfo.width`.
  3. Trunca el texto dinámicamente según el tamaño para evitar que se desborde.
  4. Envía a renderizar el componente JSX de React Native que compila a vistas nativas de Android (`RemoteViews`).

### 2. Caché y Manejo de Imágenes (`verseWidgetCache.ts`)
Los widgets nativos de Android tienen restricciones estrictas sobre cómo consumen recursos locales. La librería `react-native-android-widget` no soporta la carga de imágenes usando rutas directas de archivo local (`file://`) en su componente `ImageWidget`.
* **Solución**: 
  1. El fondo de pantalla se descarga a la caché del dispositivo (`cacheDirectory`).
  2. Posteriormente, el archivo se lee como binario en Base64.
  3. Se genera un Data URI (`data:image/jpeg;base64,...`) compatible con el widget. Esto permite almacenar la imagen una sola vez al día y mostrarla de inmediato, incluso si el celular no tiene internet.

---

## 🚀 Cambios y Mejoras Recientes

Con el fin de ofrecer una experiencia sumamente premium, moderna y fluida, se realizaron las siguientes optimizaciones en el diseño y rendimiento del widget:

### 🔧 Configuración al agregar el widget (julio 2026)

El widget tenía `widgetFeatures: reconfigurable`, lo que obliga a una pantalla de configuración que llame a `setResult('ok')`. Faltaba `registerWidgetConfigurationScreen` en `index.ts`, así que Android mostraba *«Completa la configuración del widget para agregarlo»*.

**Solución:**
- `widgets/WidgetConfigurationScreen.tsx`: carga el versículo, renderiza el widget y confirma con `setResult('ok')`.
- `index.ts`: registra la pantalla con `registerWidgetConfigurationScreen`.
- `widgetFeatures`: `reconfigurable|configuration_optional` — al arrastrar el widget no abre configuración obligatoria; si se reconfigura después, la pantalla auto-completa.

### 📱 Adaptabilidad Dinámica al Redimensionar (Responsive Widget)
Anteriormente, el texto podía desbordarse o quedar demasiado corto según el tamaño en el que el usuario configuraba el widget en su launcher.
* **Cambio**: El gestor del widget ahora lee `props.widgetInfo.width` y ajusta proactivamente la cantidad de caracteres antes de truncar:
  * **Ancho $\ge$ 400dp**: Muestra hasta **200 caracteres**.
  * **Ancho $\ge$ 300dp**: Muestra hasta **160 caracteres**.
  * **Ancho < 300dp**: Muestra hasta **120 caracteres**.
* Esto asegura que el versículo siempre sea legible y se aproveche al máximo el espacio disponible en layouts anchos sin sobrecargar los pequeños.

### 🎨 Legibilidad Premium de Texto (Gradient Overlay)
Para garantizar que el versículo de la Biblia sea legible con cualquier imagen de fondo (incluso imágenes muy brillantes):
* **Cambio**: Se sustituyó el color oscuro semitransparente plano (`rgba(0,0,0,0.45)`) por un **gradiente horizontal** de izquierda a derecha (`rgba(0,0,0,0.65)` $\to$ `rgba(0,0,0,0.30)`).
* **Resultado**: El texto (alineado a la izquierda) tiene un contraste excelente, mientras que la parte derecha de la imagen de fondo se ve mucho más clara y definida, mejorando notablemente el aspecto visual.

### ✨ Fallback Visual Sofisticado (Sin Imagen)
Si el versículo de hoy no posee imagen de fondo o el dispositivo no cuenta con internet en la primera carga:
* **Cambio**: Se implementó un gradiente diagonal sutil en el fondo (`#1c1917` $\to$ `#292524`) en lugar de un color sólido.
* Se agregó una **barra de acento vertical** en el lateral izquierdo con un gradiente dorado/ámbar brillante (`#FBBF24` $\to$ `#F59E0B`), dándole un aspecto editorial elegante y alineado a la paleta de BibliaAPP.

### ⚙️ Configuración y Redimensionado Flexible (`app.json`)
* Se habilitó el soporte completo para que el usuario redimensione el widget en su pantalla de inicio tanto horizontal como verticalmente (`resizeMode: "horizontal|vertical"`).
* Se establecieron los rangos óptimos: tamaño mínimo de `250×110dp` (2x1 celdas aproximadamente) y máximo de `530×220dp` (4x2 celdas).
* Se añadió la propiedad `widgetFeatures: "reconfigurable"`, lo cual permite configurar el widget en caliente sin necesidad de eliminarlo y volverlo a arrastrar en versiones recientes de Android (12+).

---

## 🛠️ Notas de Desarrollo y Compilación

> [!IMPORTANT]
> Cualquier cambio que modifique la estructura del archivo [`app.json`](file:///home/david/proyectos/BibliaAPP/mobile/app.json) en la sección de `react-native-android-widget` requiere obligatoriamente **regenerar el código nativo** y volver a compilar la aplicación.
>
> Ejecuta los siguientes comandos si realizas modificaciones en la configuración del widget:
> ```bash
> cd mobile
> npx expo prebuild --clean
> # Compila de nuevo en tu dispositivo/emulador
> npm run android
> ```
