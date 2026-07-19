# Builds de iOS

## 1. Simulador sin cuenta Apple

El perfil `ios-simulator` hereda la configuración interna de `preview` y agrega:

```json
{
  "ios": {
    "simulator": true
  }
}
```

Generar el build:

```bash
cd /home/david/proyectos/BibliaAPP/mobile
npx eas-cli@latest build --platform ios --profile ios-simulator
```

El artefacto será una aplicación para iOS Simulator. No puede instalarse en un iPhone real y necesita una Mac con Simulator u otra infraestructura capaz de ejecutar el simulador de Apple.

Este build no necesita Apple Developer Program.

## 2. iPhone físico para el equipo

Requisitos:

- membresía Apple Developer Program;
- acceso del usuario a la cuenta/equipo Apple;
- registrar el UDID del dispositivo;
- certificado y perfil de aprovisionamiento administrados por EAS.

Registrar el dispositivo:

```bash
npx eas-cli@latest device:create
```

Generar la variante interna:

```bash
npx eas-cli@latest build --platform ios --profile ios-device
```

El perfil `ios-device` hereda `internal`, por lo que utiliza:

```text
BibliaAPP Interna
com.bibliaapp.mobile.internal
bibliaapp-internal
```

## 3. TestFlight

TestFlight utiliza el build público de tienda:

```bash
npx eas-cli@latest build --platform ios --profile production
```

Antes deben estar configuradas en EAS las variables públicas obligatorias:

```text
EXPO_PUBLIC_API_URL
EXPO_PUBLIC_PRIVACY_URL
EXPO_PUBLIC_SUPPORT_URL
EXPO_PUBLIC_ACCOUNT_DELETION_URL
```

Subir el build terminado:

```bash
npx eas-cli@latest submit --platform ios --profile production
```

La aplicación debe existir previamente en App Store Connect con el bundle ID `com.bibliaapp.mobile`.

## 4. App Store

Después de las pruebas de TestFlight se selecciona el build desde App Store Connect y se completa:

- descripción, categoría y clasificación de edad;
- política de privacidad y URL de soporte;
- App Privacy;
- cumplimiento de exportación;
- derechos sobre contenido bíblico;
- capturas reales de iPhone;
- cuenta e instrucciones para revisión;
- información de eliminación de cuenta.

No se debe enviar a revisión mientras falten los bloqueos registrados en `mobile/docs-faltantes/README.md`.
