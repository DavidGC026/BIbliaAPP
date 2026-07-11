# Documentación — BibliaAPP Móvil

Documentación de referencia del cliente móvil de **BibliaAPP** (React Native + Expo). La app consume la misma API REST que la aplicación web Next.js.

> **Nota (julio 2026):** La app móvil ya **no vive en este repositorio**. Fue extraída a un repo propio; los archivos aquí son documentación histórica conservada en `docs-mobile/`. Para código actual, usa el repositorio móvil dedicado.

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

---

## Versión documentada

- **App móvil:** `1.0.0` (inicial)
- **Expo SDK:** ~56
- **React Native:** 0.85.3
- **Fecha de referencia:** junio 2026

---

## Comandos habituales

En el repositorio móvil actual (no en este repo web):

```bash
cd mobile   # raíz del repo móvil
npm install
npm run start      # Menú Expo (QR, emulador, web)
npm run android    # Abrir en Android
npm run ios        # Abrir en iOS (macOS)
npm run web        # Vista web con Metro
```

Para más detalle, empieza por [02-inicio-rapido.md](./02-inicio-rapido.md) (rutas relativas a la estructura móvil original).
