# Documentación — BibliaAPP Móvil

Documentación del cliente móvil de **BibliaAPP** (React Native + Expo). La app consume la misma API REST que la aplicación web Next.js.

**Código fuente:** carpeta [`mobile/`](../mobile/) en la raíz del repositorio.

**Producción web / API:** https://biblia2.dvguzman.com

**Documentación específica de iOS:** [`docs-mobile-ios/`](../docs-mobile-ios/)

---

## Índice

| Documento | Contenido |
|-----------|-----------|
| [01-resumen-proyecto.md](./01-resumen-proyecto.md) | Objetivo, stack, relación con la web |
| [02-inicio-rapido.md](./02-inicio-rapido.md) | Instalación y primer arranque en Android |
| [03-arquitectura.md](./03-arquitectura.md) | Capas, flujo de datos y decisiones técnicas |
| [04-estructura-carpetas.md](./04-estructura-carpetas.md) | Mapa de archivos del proyecto `mobile/` |
| [05-api-backend.md](./05-api-backend.md) | Endpoints usados, tipos y cliente HTTP |
| [06-autenticacion.md](./06-autenticacion.md) | Login, token Bearer, sesión persistente |
| [07-pantallas-funcionalidades.md](./07-pantallas-funcionalidades.md) | Tabs, pantallas y estado por sección |
| [08-configuracion-entorno.md](./08-configuracion-entorno.md) | Variables, API local, requisitos |
| [09-build-android.md](./09-build-android.md) | Expo Go, dev build y publicación en Play Store |
| [10-roadmap.md](./10-roadmap.md) | Funcionalidades pendientes respecto a la web |
| [11-android-sdk-servidor.md](./11-android-sdk-servidor.md) | Instalar y usar Android SDK en el servidor |
| [12-paridad-web-movil.md](./12-paridad-web-movil.md) | Qué falta respecto a la web (22 secciones) |
| [13-build-apk-release.md](./13-build-apk-release.md) | Compilar e instalar APK release |
| [14-notas-autoguardado-y-preview.md](./14-notas-autoguardado-y-preview.md) | Auto-guardado al salir del editor y preview de texto en libretas |
| [15-widget-versiculo-del-dia.md](./15-widget-versiculo-del-dia.md) | Arquitectura, funcionamiento y mejoras recientes del widget de Android |
| [16-editor-webview-teclado-seleccion.md](./16-editor-webview-teclado-seleccion.md) | Corrección de «Seleccionar todo» y foco del teclado en el editor de notas; color «Auto» y rueda cromática |
| [17-notas-productividad-general.md](./17-notas-productividad-general.md) | Mejoras de notas como herramienta general: búsqueda, métricas, orden y estado de guardado |
| [18-lector-biblia-e-imagenes.md](./18-lector-biblia-e-imagenes.md) | Mejoras de lectura bíblica y generador de imágenes de versículos |
| [19-descargas-offline.md](./19-descargas-offline.md) | Descargas offline visibles, cola en segundo plano de app y reanudación |
| [20-plan-maestro-mejoras-generales.md](./20-plan-maestro-mejoras-generales.md) | Plan vivo de mejoras generales, estados, fases y avance actual |
| [21-insercion-y-edicion-de-imagenes.md](./21-insercion-y-edicion-de-imagenes.md) | Inserción, redimensionado, posición y alineación de imágenes en notas; las imágenes base64 ya no se guardan en el contenido |
| [22-notas-diseno-profesional.md](./22-notas-diseno-profesional.md) | Rediseño visual profesional de notas, libretas, tarjetas y editor |
| [23-paridad-web-mobile-global.md](./23-paridad-web-mobile-global.md) | Seguimiento global de paridad entre la aplicación web y móvil |
| [24-reduccion-secciones-web.md](./24-reduccion-secciones-web.md) | Simplificación de secciones web durante el trabajo de paridad |
| [25-temas-visuales-y-dvg.md](./25-temas-visuales-y-dvg.md) | Temas móviles, selector visual y ediciones DVG/UBG exclusivas para administradores |
| [26-variantes-y-licencias-biblicas.md](./26-variantes-y-licencias-biblicas.md) | Variantes pública/interna, capacidades bíblicas, pantalla legal y descargas autorizadas |
| [27-oauth-google-android-esquema.md](./27-oauth-google-android-esquema.md) | Diagnóstico y corrección del OAuth de Google congelado en Android por desfase de esquema nativo/JS |
| [28-admin-usuarios-y-aceptacion-legal.md](./28-admin-usuarios-y-aceptacion-legal.md) | Panel de administración de usuarios, documentos legales nativos y aceptación obligatoria de términos en el primer login móvil |
| [29-notas-bloques-de-contenido.md](./29-notas-bloques-de-contenido.md) | Bloques de versículo, diccionario y tabla en el editor: reparación de bloques rotos al borrar, borrado en dos pasos y separación del módulo |
| [30-iconos-compartidos-y-mapa-referencias.md](./30-iconos-compartidos-y-mapa-referencias.md) | Set SVG compartido entre plataformas, integración nativa en Expo y nueva ilustración del mapa de referencias |
| [31-mapa-de-referencias-navegable.md](./31-mapa-de-referencias-navegable.md) | El mapa arcoíris pasa a ser navegable: encuadre completo, selección determinista, atajos a los capítulos más citados y apertura en el lector de los capítulos conectados |
| [32-notas-pestana-contextual.md](./32-notas-pestana-contextual.md) | Los bloques dejan de llevar botones dentro del documento: al seleccionarlos solo se ve el contorno y sus acciones pasan a una pestaña contextual en la barra de herramientas |
| [33-editor-tiptap-y-cinta.md](./33-editor-tiptap-y-cinta.md) | El editor pasa de execCommand a Tiptap, con cinta de opciones estilo Word, pestañas contextuales y pantalla completa |
| [34-notas-cinta-bajo-el-teclado.md](./34-notas-cinta-bajo-el-teclado.md) | La cinta se quedaba a medias bajo el teclado: en vez de afinar el alto que anuncia el teclado, se mide lo que tapa de verdad y la página lo descuenta |
| [35-notas-tutorial-primera-vez.md](./35-notas-tutorial-primera-vez.md) | Tutorial de seis pasos la primera vez que se abre una nota: versículos, diccionario, imágenes, tablas y guardado |
| [36-notas-de-versiculo-seccion.md](./36-notas-de-versiculo-seccion.md) | Sección «Versículos con notas»: endpoint nuevo para listarlas todas, pestaña con buscador y salto al versículo en el lector |
| [37-cinta-inset-ime.md](./37-cinta-inset-ime.md) | La cinta seguía tapada: el alto del teclado pasa a salir del inset IME del sistema y la página mide su propio alto visible |
| [38-lector-parrafos-y-referencia-viva.md](./38-lector-parrafos-y-referencia-viva.md) | Paridad con el lector web: modo párrafos (texto corrido), referencia viva `CAP:VERS` y progreso por versículo |
| [39-teclado-que-se-baja.md](./39-teclado-que-se-baja.md) | Al bajar el teclado la nota se quedaba a media pantalla: el inset IME se quedaba clavado y la página no remedía su alto visible. El lector pasa a la misma fuente y la regla queda cubierta por una prueba |
| [40-firma-de-release.md](./40-firma-de-release.md) | Los APK dejan de firmarse con la keystore de debug: llave propia fuera del repo, plugin de Expo que la cablea tras cada prebuild y guardián que lo comprueba |

---

## Versión documentada

- **App móvil:** `4.1.0`
- **Expo SDK:** ~56
- **React Native:** 0.85.3
- **Fecha de referencia:** septiembre 2026

---

## Comandos habituales

```bash
cd mobile
npm install
npm run start      # Menú Expo (QR, emulador, web)
npm run android    # Abrir en Android
npm run ios        # Abrir en iOS (macOS)
npm run web        # Vista web con Metro
```

Para más detalle, empieza por [02-inicio-rapido.md](./02-inicio-rapido.md).
