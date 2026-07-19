# Documentación — BibliaAPP iOS

Documentación específica de la aplicación iOS construida con Expo SDK 56 y EAS Build.

La documentación general del cliente permanece en [`docs-mobile/`](../docs-mobile/). Esta carpeta registra únicamente configuración, builds, pruebas y pendientes propios de Apple.

## Índice

| Documento | Contenido |
|---|---|
| [01-estado-inicial-ios.md](./01-estado-inicial-ios.md) | Estado implementado, diferencias frente a Android y decisiones iniciales |
| [02-builds-ios.md](./02-builds-ios.md) | Simulador, iPhone físico, TestFlight y App Store |
| [03-checklist-ios.md](./03-checklist-ios.md) | Pruebas y requisitos pendientes antes de distribuir |

## Estado actual

- Expo SDK 56.
- Versión de app `3.3`.
- Bundle público: `com.bibliaapp.mobile`.
- Bundle interno: `com.bibliaapp.mobile.internal`.
- Primera etapa enfocada en iPhone; soporte iPad desactivado.
- Primer build de simulador generado correctamente el 15 de julio de 2026.
- Perfil para dispositivo físico preparado; requiere Apple Developer Program y registro del dispositivo.
- Build EAS de simulador: `c0a594c8-61c8-4b95-a7fe-bbf5a2cc646c` (versión `3.3`, build `1`).
- No se ha enviado todavía ningún build a TestFlight o App Store.
