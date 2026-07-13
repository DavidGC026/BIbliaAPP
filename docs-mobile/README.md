# Documentación — BibliaAPP Móvil

Documentación del cliente móvil de **BibliaAPP** (React Native + Expo). La app consume la misma API REST que la aplicación web Next.js.

**Código fuente:** carpeta [`mobile/`](../mobile/) en la raíz del repositorio.

**Producción web / API:** https://biblia2.dvguzman.com

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
| [16-editor-webview-teclado-seleccion.md](./16-editor-webview-teclado-seleccion.md) | Corrección de «Seleccionar todo» y foco del teclado en el editor de notas |
| [17-notas-productividad-general.md](./17-notas-productividad-general.md) | Mejoras de notas como herramienta general: búsqueda, métricas, orden y estado de guardado |
| [18-lector-biblia-e-imagenes.md](./18-lector-biblia-e-imagenes.md) | Mejoras de lectura bíblica y generador de imágenes de versículos |
| [19-descargas-offline.md](./19-descargas-offline.md) | Descargas offline visibles, cola en segundo plano de app y reanudación |
| [20-plan-maestro-mejoras-generales.md](./20-plan-maestro-mejoras-generales.md) | Plan vivo de mejoras generales, estados, fases y avance actual |
| [21-insercion-y-edicion-de-imagenes.md](./21-insercion-y-edicion-de-imagenes.md) | Inserción, redimensionado, posición y alineación de imágenes en notas |
| [22-notas-diseno-profesional.md](./22-notas-diseno-profesional.md) | Rediseño visual profesional de notas, libretas, tarjetas y editor |

**Paridad web (Next.js):** [`docs/notas-web-paridad-movil.md`](../docs/notas-web-paridad-movil.md) — editor enriquecido, imágenes, referencias, diccionario y productividad de libretas alineados con esta documentación móvil.

---

## Versión documentada

- **App móvil:** `1.0.0` (inicial)
- **Expo SDK:** ~56
- **React Native:** 0.85.3
- **Fecha de referencia:** julio 2026

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
