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
desktop/          # Cliente de escritorio (Tauri v2 + React)
docs/             # Documentación técnica web (ver índice abajo)
docs-mobile/      # Documentación del cliente móvil (repo aparte)
public/           # Estáticos y uploads
```

### Documentación en el repositorio

| Archivo | Contenido |
|---------|-----------|
| [`docs/nuevas-secciones.md`](docs/nuevas-secciones.md) | Cómo añadir una sección al menú y permisos |
| [`docs/notas-web-paridad-movil.md`](docs/notas-web-paridad-movil.md) | Editor de notas web y paridad con móvil |
| [`docs/referencias-cruzadas-mapa-arcoiris.md`](docs/referencias-cruzadas-mapa-arcoiris.md) | Referencias cruzadas y mapa arcoíris |
| [`docs/diccionario.md`](docs/diccionario.md) | Diccionario Strong, API y traducción |
| [`docs/mobile-release-api.md`](docs/mobile-release-api.md) | Distribución de APK Android desde la web |
| [`desktop/README.md`](desktop/README.md) | Cliente de escritorio: build, empaquetado, OAuth |
| [`docs-mobile/README.md`](docs-mobile/README.md) | Índice de documentación móvil (plan maestro, offline, Inicio…) |

Documentación local del servidor (en `docs/`, no versionada; ver `.gitignore`):

| Archivo | Contenido |
|---------|-----------|
| `docs/comandos-servidor.md` | Estado, levantar, reiniciar y parar el stack |
| `docs/actualizar-despliegue.md` | Cómo actualizar código y reiniciar el contenedor |
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

## Clientes nativos

### App móvil (React Native / Expo)

La app Android/iOS vive en un **repositorio separado** ([DavidGC026/BibliaAppMobile](https://github.com/DavidGC026/BibliaAppMobile); ya no está en `mobile/` de este repo). Consume la misma API REST que la web.

- Documentación de referencia: [`docs-mobile/README.md`](docs-mobile/README.md) — incluye el [plan maestro de mejoras](docs-mobile/20-plan-maestro-mejoras-generales.md) y la iteración [recientes inteligentes en Inicio](docs-mobile/21-inicio-recientes-inteligentes.md).
- Distribución de APK desde la web: [`docs/mobile-release-api.md`](docs/mobile-release-api.md)

### App de escritorio (Tauri v2)

Cliente para Arch, Debian y Windows en la carpeta [`desktop/`](desktop/). Misma API, sesión offline con SQLite y OAuth Google vía localhost.

```bash
cd desktop
npm install
npm run tauri dev      # desarrollo
npm run pack:arch      # Arch (.pkg.tar.zst)
```

Guía completa: [`desktop/README.md`](desktop/README.md)

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

Detalle en `docs/funcionalidades-iglesias.md`.

## Origen del proyecto

Iniciado con [v0](https://v0.app); el desarrollo continúa en este repositorio.
