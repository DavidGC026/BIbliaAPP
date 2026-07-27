# 13 — Build APK release (local)

## APK generado

| Campo | Valor |
|-------|-------|
| Archivo | `mobile/releases/BibliaAPP-4.0.4-release.apk` |
| Package | `com.bibliaapp.mobile` |
| Versión | 4.0.4 (versionCode 43) |
| Tamaño | 121 681 943 bytes (116 MiB), multi-ABI |
| SHA-256 | `86eca449859b1a810677e0dbe1ccd85c40511f7062c977a0e081fa4b57ab887f` |
| API | `https://biblia2.dvguzman.com` (embebida en build) |
| Firma | Debug keystore (`CN=Android Debug`), verificada con `apksigner` |

La 4.0.4 incorpora el refinamiento visual de la cinta y la colocación directa
de imágenes detrás del texto en el **editor de notas sobre Tiptap**
([33](./33-editor-tiptap-y-cinta.md)): el modo de fondos las eleva mientras se
editan, **Finalizar fondo** las devuelve a su capa y el arrastre desplaza la
nota automáticamente al acercarse a sus bordes. Se genera como APK universal
para `armeabi-v7a`, `arm64-v8a`, `x86` y `x86_64` y se copia también a
`/home/david/Biblia-release/BibliaAPP-4.0.4-release.apk`.

> Para Play Store genera un keystore de producción y configura `signingConfigs.release` en `android/app/build.gradle`. Ojo: al cambiar de firma, el APK **no se instala encima** del que ya esté en el teléfono; hay que desinstalar primero.

---

## Requisitos del servidor

```bash
source /etc/profile.d/android-sdk.sh
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
node -v    # ≥ 20.19.4 recomendado
java -version
```

SDK en `/opt/android-sdk` (platform 36, build-tools 36, NDK 27).

---

## Compilar de nuevo

```bash
cd /home/david/proyectos/BibliaAPP/mobile

# Regenerar proyecto nativo (si cambias plugins Expo)
npx expo prebuild --platform android

# Fix Gradle: wrapper 8.14.3 (incompatibilidad foojay con 9.3.1)
# Ya aplicado en android/gradle/wrapper/gradle-wrapper.properties

# Build
cd android
./gradlew assembleRelease
```

APK resultante:

```text
android/app/build/outputs/apk/release/app-release.apk
```

Copia a releases:

```bash
cp android/app/build/outputs/apk/release/app-release.apk \
   releases/BibliaAPP-1.0.0-release.apk
```

---

## Instalar en dispositivo

```bash
adb install -r releases/BibliaAPP-1.0.0-release.apk
```

O transfiere el APK al teléfono e instálalo manualmente (orígenes desconocidos).

---

## Desfase entre app.json y android/ (guardián)

`android/` **no está en el repo** (`.gitignore`) y **no se regenera** en cada
build: `expo prebuild` es manual. Así que puede quedarse atrás respecto a
`app.json` / `app.config.ts` sin que nada avise, y salir un APK que dice una
cosa mientras el bundle cree otra. Ha pasado dos veces: el `versionCode`
(app.json en 37, gradle en 38 subido a mano) y el esquema/paquete de la
variante, que congelaba el OAuth de Google tras elegir cuenta.

```bash
npm run check:native
```

Va enganchado a `build:android:release`, así que el build **se para** si no
cuadran:

| Comprobación | Nivel | Por qué |
|--------------|-------|---------|
| `expo.version` ↔ `versionName` | error | es el nombre de versión que ve el usuario |
| `expo.android.versionCode` ↔ `versionCode` | error | Play rechaza un versionCode que no crece |
| paquete de la variante ↔ `applicationId` | aviso | cuál es el correcto depende de con qué variante quieras compilar |
| esquema de la variante ↔ `AndroidManifest` | aviso | sin él, los redirects de OAuth no tienen quién los recoja |

El paquete y el esquema se resuelven evaluando `app.config.ts` con las mismas
variables de entorno del build (`APP_VARIANT` / `EXPO_PUBLIC_APP_VARIANT`), así
que sirve tal cual para las dos variantes.

**Aviso vivo hoy:** la variante por omisión (`internal`) espera
`com.bibliaapp.mobile.internal` y `android/` tiene `com.bibliaapp.mobile`, la
pública. Hoy manda el nativo, pero un `prebuild` con la variante interna
cambiaría la identidad de la app (otra instalación y otro cliente OAuth).

---

## Cuatro cosas que rompen el build y no se ven venir

`android/` no está en el repo, así que cada `expo prebuild` deshace los ajustes
que necesita este proyecto. Las tres primeras ya las vigila
`npm run check:native` y paran el build con la orden para arreglarlas:

| Síntoma | Causa | Arreglo |
|---|---|---|
| `Class ... JvmVendorSpec does not have member field 'IBM_SEMERU'`, falla al configurar | el wrapper volvió a Gradle 9.x | fijar `gradle-8.14.3-bin.zip` en `android/gradle/wrapper/gradle-wrapper.properties` |
| lo mismo, o el build busca un JDK por vendor | falta la propiedad | `org.gradle.jvm.toolchain.foojay.enabled=false` en `android/gradle.properties` |
| `SDK location not found`, falla al evaluar el proyecto raíz | `ANDROID_HOME` sale de `/etc/profile.d/android-sdk.sh`, que solo se lee en sesiones de inicio: una consola cualquiera o una tarea en segundo plano no lo tienen | ya resuelto: `build:android:release` exporta `ANDROID_HOME=${ANDROID_HOME:-/opt/android-sdk}` antes de nada |
| `createBundleReleaseJsAndAssets` muere con `EACCES ... rmdir '/tmp/metro-cache/00'` | la caché de Metro en `/tmp` quedó de otro usuario | ya resuelto: `build:android:release` usa `TMPDIR=$PWD/.build-tmp` |

Y una quinta que no es del proyecto: si Gradle no resuelve
`repo.maven.apache.org` («Fallo temporal en la resolución del nombre»), es un
corte de red. Se reintenta y sigue desde donde estaba.

## Notas técnicas

- **Gradle 9.3.1** (default Expo 56) falla con `JvmVendorSpec IBM_SEMERU`; usar **8.14.3**.
- Propiedad añadida: `org.gradle.jvm.toolchain.foojay.enabled=false` en `gradle.properties`.
- Build multi-ABI (`armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`) — APK ~80–120 MB.
- Para APK más pequeño: `./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`

---

## Push notifications en APK release

Este build incluye `expo-notifications`. Los push requieren:

1. Permiso de notificaciones en Android 13+.
2. Token registrado en `/api/notifications/push-token` al iniciar sesión.
3. Para producción estable, configurar **EAS Project ID** en `app.json` (`extra.eas.projectId`).

---

## Script npm (opcional)

Añadir a `package.json`:

```json
"build:android:release": "cd android && ./gradlew assembleRelease && cp app/build/outputs/apk/release/app-release.apk ../releases/BibliaAPP-release.apk"
```

Ejecutar tras `expo prebuild` y con `ANDROID_HOME` configurado.
