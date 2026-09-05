# BibliaAPP

Aplicación web para lectura bíblica, estudio en comunidad, grupos, oración, calendario de eventos y discipulado. Pensada para congregaciones, células y ministerios cristianos.

**Producción:** https://biblia2.dvguzman.com

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend / API | Next.js 16, React 19, Tailwind CSS 4 |
| Base de datos | MariaDB 11 (`mysql2`) |
| Autenticación | Tokens propios (AES) + sesión en cookie |
| Tiempo real | Server-Sent Events (notificaciones) |
| Despliegue | Docker (`biblia2-app`, puerto **3003**) |

## Estructura del proyecto

```text
app/              # Páginas y API routes (Next.js App Router)
components/       # UI (lector, grupos, feed, calendario, etc.)
lib/              # Lógica de negocio, MySQL, auth, grupos, oración…
mobile/           # App React Native (Expo)
docs-mobile/      # Documentación del cliente móvil
public/           # Estáticos y uploads
docs/             # Documentación local web (no se sube a Git; ver .gitignore)
```

Documentación local útil (en `docs/`, solo en tu servidor):

| Archivo | Contenido |
|---------|-----------|
| `docs/comandos-servidor.md` | **Estado, levantar, reiniciar y parar el stack** |
| `docs/actualizar-despliegue.md` | **Cómo actualizar código y reiniciar el contenedor** |
| `docs/funcionalidades-iglesias.md` | Funcionalidades para iglesias (grupos, oración, calendario…) |
| `docs/infra-privada.md` | Credenciales, `docker run` completo, Adminer (privado) |

## Desarrollo local

Requisitos: Node.js 20+, MariaDB accesible en `localhost:3306`.

```bash
cd /home/david/proyectos/BibliaAPP
npm install
```

Crea `.env.local` en la raíz (está en `.gitignore`):

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=biblia_user
MYSQL_PASSWORD=<contraseña>
MYSQL_DATABASE=bibliadb
APP_URL=http://localhost:3000
```

Arranca en modo desarrollo:

```bash
npm run dev
```

Abre http://localhost:3000. Los cambios se recargan solos (hot reload).

## Actualizar producción (resumen)

Cuando cambies código y quieras verlo en el dominio público:

```bash
cd /home/david/proyectos/BibliaAPP
docker restart biblia2-app
docker logs -f biblia2-app          # espera "Ready"
curl -s http://127.0.0.1:3003/api/health
```

Luego abre https://biblia2.dvguzman.com con **Ctrl+Shift+R**.

El contenedor `biblia2-app` monta este directorio en `/app` y, al arrancar, ejecuta `npm ci`, `npm run build` y `next start` en el puerto 3003. Un reinicio vuelve a compilar todo el proyecto.

**Guía detallada:** `docs/actualizar-despliegue.md` (checklist, alternativas, problemas frecuentes).

**Credenciales y comando `docker run` completo:** `docs/infra-privada.md`.

## Scripts npm

| Comando | Uso |
|---------|-----|
| `npm run dev` | Desarrollo local con hot reload |
| `npm run build` | Compilar para producción |
| `npm run start` | Servir build (puerto 3000 por defecto; en Docker usa `-p 3003`) |
| `npm run lint` | ESLint |

## App móvil (React Native / Expo)

La carpeta `mobile/` contiene la app Android (y iOS) con **Expo Router**, conectada a la misma API del backend Next.js.

**Documentación completa:** [`docs-mobile/README.md`](docs-mobile/README.md) · APK de prueba: `mobile/releases/BibliaAPP-1.0.0-release.apk`

```bash
cd mobile
npm install
npm run android   # emulador o dispositivo Android con Expo Go / dev build
npm run start     # menú de desarrollo Expo
```

Por defecto usa la API de producción (`https://biblia2.dvguzman.com`). Para apuntar a tu servidor local:

```bash
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000 npm run start
```

Pantallas incluidas en v1.0.0: Inicio (versículo del día), Lector bíblico, Comunidad (feed), Grupos y Perfil con login por token Bearer.

## Base de datos

No hay migraciones formales (Prisma, etc.). Las tablas se crean o amplían con funciones `ensure*Tables()` en `lib/` la primera vez que la app las necesita.

MariaDB corre en el contenedor `biblia-mariadb` (directorio aparte en el servidor: `/home/david/biblia-mariadb`).

## Funcionalidades principales

- Lector bíblico con notas, resaltados y planes de lectura
- Comunidad: feed, perfiles, seguidores
- **Grupos** con invitación por QR / enlace (`?joinGroup=CODIGO`)
- **Oración intercesora** con visibilidad por grupo
- **Anuncios oficiales** (admin / pastores)
- **Calendario de eventos** con RSVP
- **Discipulado** uno a uno
- **Juegos bíblicos**: completa el versículo, memoria de parejas y Wordle bíblico (web y móvil)

Detalle en `docs/funcionalidades-iglesias.md`.

## Juegos bíblicos

La web abre los juegos en `/?section=games`, desde el menú **Juegos**. En móvil
están en **Inicio → Acciones rápidas** (personalizables) y **Perfil → Juegos bíblicos**,
también para visitantes.

- **Completa el versículo**: cinco pasajes por partida, con cuatro opciones o
  respuesta escrita. La API `/api/games/verses?bible=ID` consulta 30 referencias
  del catálogo autorizado y conserva el texto de la traducción elegida.
- **Memoria bíblica**: 4, 6 u 8 pares, con referencias para repasar cada historia.
  Las tarjetas que no coinciden se cierran automáticamente después de 1,5 segundos.
- **Wordle bíblico**: 50 palabras, seis intentos, pistas y letras reveladas a cambio de puntos.
  La corrección cuenta las letras repetidas y distingue Ñ de N; ignora tildes.

Los resultados se guardan por cuenta y dispositivo: `localStorage` en web y
SQLite en móvil. No hay clasificación global ni sincronización de puntos.
Memoria y Wordle incluyen el contenido en el cliente; completar versículos
requiere conexión. No se guardan traducciones completas en el historial de juegos.

Las reglas, contenidos y hooks de `lib/games/` son la fuente común. Como móvil
tiene su propio repositorio, `npm run sync:games` desde `mobile/` actualiza su
copia; `node scripts/sync_games.cjs --check` verifica que coincide. Cada cliente
ejecuta `npm run check:games` (incluido también en `npm run check`).

Para ampliar el contenido o cambiar las opciones de juego, consulta
[Cómo ampliar los juegos bíblicos](docs/juegos-biblicos.md).

## Origen del proyecto

Iniciado con [v0](https://v0.app); el desarrollo continúa en este repositorio.
