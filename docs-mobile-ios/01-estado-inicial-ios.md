# Estado inicial de la versión iOS

Fecha: 15 de julio de 2026.

## Cambios implementados

### Entrada nativa segura

`mobile/index.ts` ya no importa ni registra incondicionalmente `react-native-android-widget`. El widget y su pantalla de configuración se cargan únicamente cuando `Platform.OS === 'android'`.

Esto evita que el bundle iOS intente inicializar un módulo nativo exclusivo de Android. En iOS, `expo-router/entry` continúa siendo el punto de entrada de la aplicación.

### Identificadores

La configuración dinámica conserva binarios separados:

```text
Interno: com.bibliaapp.mobile.internal
Público: com.bibliaapp.mobile
```

Los callbacks OAuth también están separados:

```text
bibliaapp-internal://auth/google
bibliaapp://auth/google
```

Google permanece visible en la variante interna. En iOS público se oculta para conservar únicamente correo y contraseña mientras no exista Sign in with Apple.

### Alcance inicial: iPhone

`supportsTablet` está desactivado. La primera versión se probará y publicará únicamente para iPhone, evitando declarar compatibilidad con iPad antes de revisar diseños, teclado, paneles y capturas específicas.

La compatibilidad con iPad se puede habilitar posteriormente como una fase independiente.

### Fotos y privacidad

Se definieron mensajes de uso para:

- elegir imágenes destinadas a portadas, notas y diseños de versículos;
- guardar en Fotos las imágenes creadas por el usuario.

El selector de imágenes está configurado explícitamente sin permisos de cámara ni micrófono. No se solicitan permisos de video, audio o contactos.

### Cifrado

`ios.config.usesNonExemptEncryption` está configurado en `false`. BibliaAPP utiliza mecanismos estándar del sistema y HTTPS; no incorpora algoritmos propios de cifrado no exento. Este valor deberá confirmarse nuevamente al completar el cuestionario de cumplimiento de exportación en App Store Connect.

## Funciones Android neutralizadas

- El widget de pantalla de inicio permanece exclusivo de Android.
- La actualización de widget es un `no-op` en iOS.
- Los canales de notificaciones se crean solamente en Android.
- La sugerencia de instalación del widget no aparece en Perfil para iOS.

## Funciones que deben probarse en iOS

- Login por correo y OAuth interno.
- SecureStore y restauración de sesión.
- SQLite y lectura offline de Biblias autorizadas.
- Selector de fotos y guardado de imágenes.
- Editor WebView, selección de texto y teclado.
- Compartir texto, imágenes y PDF.
- Notificaciones locales.
- Push notifications en dispositivo físico.
- Deep links de lector y OAuth.
- Safe areas, modales, tabs y teclado en diferentes tamaños de iPhone.

## Lo que todavía no está implementado

- Sign in with Apple.
- Widget nativo de iOS/WidgetKit.
- Soporte declarado para iPad.
- Universal Links.
- Credenciales APNs verificadas.
- Eliminación efectiva de cuenta.
- Metadata, capturas y ficha de App Store Connect.
