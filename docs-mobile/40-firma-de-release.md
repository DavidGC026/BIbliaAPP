# 40 — La firma de release deja de ser la de debug

Septiembre 2026.

---

## Lo que había

`android/app/build.gradle` sale de la plantilla de Expo, y esa plantilla firma
el *release* con la **keystore de debug**, con un comentario avisando de que eso
hay que cambiarlo antes de producción. Nunca se cambió: los APK 3.9 a 4.0.9
están firmados con `CN=Android Debug`.

Funciona para instalar a mano, pero no es una identidad: esa llave la tiene
cualquiera que instale el SDK de Android, así que **cualquiera puede firmar una
actualización** de la app que el teléfono aceptará como legítima. Y Play Store
no admite un APK firmado así.

## Lo que hay ahora

La llave real, generada en agosto de 2026:

| | |
|---|---|
| Alias | `dvguzman` |
| Propietario | `CN=David Guzmán, O=dvguzman, L=Ciudad de México, ST=CDMX, C=MX` |
| Algoritmo | SHA384withRSA (RSA 4096) |
| Validez | 26 ago 2026 → 11 ene 2054 |
| SHA-256 | `6B:AA:7A:10:AD:01:29:0C:88:B4:FD:18:C0:AB:A5:58:AF:AD:7B:A2:ED:C2:4F:BF:8D:A1:B2:70:3C:BB:F5:28` |

Esa huella es la identidad de la app. Un APK que no la traiga no es tuyo:

```bash
apksigner verify --print-certs BibliaAPP-4.1.0-dvg-release.apk
```

### Dónde vive la llave

Fuera del repo, y nunca dentro de `android/`. En este servidor firman dos
personas, así que la copia buena es la compartida:

```text
/srv/credenciales/dvguzman/            david:proyectos  750
  dvguzman-release.jks                 david:proyectos  640
  keystore.properties                  david:proyectos  640  (contraseña en claro)
```

El grupo `proyectos` es lo que hace que la pueda usar quien compile —`david` y
`ulises`—, y a la vez lo que hay que tener presente: cualquiera de ese grupo
puede firmar como la app. `mobile/keystore.properties` es un enlace simbólico a
ese archivo, ignorado por git.

`david` mantiene además su copia privada en `~/.dvguzman/` (600), y el zip
original sigue en `/home/david/Credenciales/`.

Gradle las busca en este orden, y si no encuentra ninguna sigue firmando con la
de debug para no dejar la compilación rota:

1. `$DVGUZMAN_KEYSTORE_PROPERTIES`
2. `~/.dvguzman/keystore.properties` — la copia privada de quien compila
3. `keystore.properties` en la raíz de `mobile/` — el enlace a la compartida

Comprobar que la encuentra, sin compilar nada, y desde la cuenta que vaya a
firmar:

```bash
cd mobile && npm run check:native   # la línea «firma release» dice cuál usa
```

> Si se pierde el `.jks` o la contraseña no hay recuperación posible: habría que
> publicar la app como otra, con otro package name, perdiendo a los instalados.

### Por qué es un plugin de Expo y no una edición a mano

`android/` no está en el repo y `expo prebuild` la regenera entera desde la
plantilla, que vuelve a firmar con debug. Una edición a mano se perdería en el
siguiente prebuild sin que nada avise —justo el desfase que persigue
[13](./13-build-apk-release.md)—, así que el cableado lo pone
`mobile/plugins/withReleaseSigning.js`, y `npm run check:native` **para el
build** si el `release` vuelve a apuntar a `signingConfigs.debug`.

El plugin no toca la llave: solo escribe en el gradle la búsqueda de arriba.

## Consecuencia al instalar: hay que desinstalar primero

Android solo acepta una actualización firmada con la **misma** llave. Los APK
que ya estén en un teléfono son de la llave de debug, así que el primero firmado
con la real no se instala encima: hay que desinstalar BibliaAPP antes, y con
ella se van los datos locales de la app en ese dispositivo (la base SQLite de
notas descargadas, sesión, ajustes). Ocurre **una sola vez**; a partir de ahí
las actualizaciones vuelven a instalarse encima con normalidad.

Por eso el APK firmado con la llave real lleva `-dvg` en el nombre, para no
confundirlo con los de debug del mismo número de versión:

```text
BibliaAPP-4.0.9-release.apk        firmado con debug     (25 ago 2026)
BibliaAPP-4.1.0-dvg-release.apk    firmado con dvguzman
```

El salto a 4.1.0 es por lo mismo: la firma nueva estrena número, para que ningún
binario comparta versión con otro de identidad distinta.

El sufijo y el destino salen de dos variables del script de build:

```bash
cd mobile
RELEASE_SUFFIX=dvg RELEASE_DIR=/home/david/Biblia-release npm run build:android:release
```

Sin ellas se comporta como siempre: `mobile/releases/BibliaAPP-<versión>-release.apk`.

## Archivos

| Archivo | Cambio |
|---|---|
| `mobile/plugins/withReleaseSigning.js` | **Nuevo.** Cablea `signingConfigs.release` en el gradle que genera Expo |
| `mobile/app.json` | Registra el plugin |
| `mobile/scripts/check_native_config.cjs` | Error si el release vuelve a la firma de debug; aviso si no hay llave a mano |
| `mobile/package.json` | `RELEASE_SUFFIX` y `RELEASE_DIR` en `build:android:release` |
| `mobile/keystore.properties` | Enlace a `/srv/credenciales/dvguzman/keystore.properties` (ignorado por git) |
| `mobile/.gitignore` | `keystore.properties` |

## Verificación

```bash
cd mobile
npm run check:native          # la línea «firma release» dice con qué llave sale
apksigner verify --print-certs /home/david/Biblia-release/BibliaAPP-4.1.0-dvg-release.apk
```
