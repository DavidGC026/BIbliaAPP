# Checklist de iOS

## Configuración y build

- [x] Bundle ID público separado del interno.
- [x] Esquema OAuth público separado del interno.
- [x] Perfil EAS para simulador.
- [x] Perfil EAS para iPhone físico.
- [x] Widget Android aislado del arranque iOS.
- [x] Icono fuente de 1024 × 1024 sin canal alfa.
- [x] Mensajes de privacidad para Fotos.
- [x] Cámara y micrófono excluidos de la configuración nativa.
- [x] Declaración inicial de cifrado no exento.
- [x] Ejecutar el primer build `ios-simulator` en EAS.
- [ ] Abrir e instalar el artefacto en una Mac con iOS Simulator.
- [ ] Registrar un iPhone físico.
- [ ] Generar credenciales y probar el build `ios-device`.

## Pruebas funcionales

- [ ] Registro, login, recuperación y cierre de sesión.
- [ ] OAuth Google en variante interna.
- [ ] Confirmar que Google no aparece en iOS público.
- [ ] Deep links después de instalar ambos binarios.
- [ ] Lector, búsqueda, referencias y versículo del día.
- [ ] Descargas permitidas y modo avión.
- [ ] Copiar/compartir según capacidades de la traducción.
- [ ] Crear, guardar y compartir imágenes.
- [ ] Crear y exportar notas/PDF.
- [ ] Editor WebView con teclado, selección y pegado.
- [ ] Notificaciones locales en dispositivo.
- [ ] Push notifications/APNs en dispositivo físico.
- [ ] Tema claro, oscuro y cambio automático.
- [ ] VoiceOver, tamaños de texto y contraste.
- [ ] iPhone pequeño, estándar y Max.

## Requisitos de tienda

- [ ] Cuenta Apple Developer Program activa.
- [ ] App creada en App Store Connect.
- [ ] URLs legales públicas.
- [ ] Eliminación de cuenta iniciable desde la app.
- [ ] App Privacy completado.
- [ ] Evidencia de derechos de las Biblias activas.
- [ ] Cuenta demo para revisión.
- [ ] Capturas de iPhone sin contenido interno/licenciado indebidamente.
- [ ] TestFlight aprobado para pruebas internas.
- [ ] Revisión final de contenido, permisos y metadata.

## Pendientes posteriores

- [ ] Evaluar Sign in with Apple.
- [ ] Evaluar Universal Links.
- [ ] Evaluar soporte iPad.
- [ ] Evaluar un widget con WidgetKit sin reutilizar el módulo Android.
