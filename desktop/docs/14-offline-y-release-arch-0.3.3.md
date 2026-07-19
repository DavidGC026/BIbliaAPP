# 14 — Auditoría offline y release Arch 0.3.3

Fecha: **2026-07-19**.

## Resultado

Desktop conserva su núcleo de trabajo sin red después del primer inicio de sesión y de descargar al menos una Biblia:

- sesión y permisos cacheados;
- lectura y búsqueda de Biblias descargadas;
- libretas y notas con creación, edición, imágenes y autoguardado;
- subrayados, favoritos y notas por versículo;
- cola SQLite y sincronización al recuperar conexión;
- Inicio con contenido personal local, último pasaje, nombre de iglesia y último versículo diario cacheado.

La compilación final también incorpora el contenedor visual compartido de hasta 1536 px para reducir los márgenes laterales en ventanas amplias y un sistema local de iconos SVG que no depende de fuentes o recursos online.

## Correcciones de la auditoría

1. `repoListBibles()` selecciona primero una versión con `downloaded = 1` al caer a SQLite.
2. Las listas locales de libretas/notas pueden devolver `[]` sin volver a exigir la API.
3. `syncAll()` comparte la misma promesa entre llamadas concurrentes y hace un solo envío de libretas/notas por ciclo.
4. El pull completo guarda subrayados en SQLite además de libretas, notas y favoritos.
5. `SyncStatusBadge` cuenta las cinco colas: libretas, notas, subrayados, favoritos y notas de versículo.
6. `meta.offline_user_id` evita mezclar información privada entre cuentas del mismo equipo; la migración solo conserva datos sin propietario cuando existe una sesión cacheada que identifica a su dueño.
7. Inicio conserva un respaldo local público del nombre de iglesia y versículo diario.

## Alcance que requiere red

Comunidad, grupos, administración, RSVP, cargas de imágenes al servidor, Strong y referencias cruzadas dependen de datos remotos. El diario y los libros de estudio siguen siendo online en esta versión. Estas secciones no impiden abrir ni usar el lector y las notas offline.

Las imágenes nuevas de una nota intentan subirse online; si no hay servidor se guardan como `data:` dentro del HTML, por lo que permanecen visibles offline.

## Artefacto Arch

```text
packaging/arch/bibliaapp-desktop-0.3.3-1-x86_64.pkg.tar.zst
```

- Tamaño: `11,204,471` bytes.
- SHA-256: `4dc686515573973b65080e12a380a80905ff3098391ac40ae9961ffc06c40c91`.
- Arquitectura: ELF64 x86-64 PIE.
- Dependencias principales comprobadas: GTK 3, WebKitGTK 4.1, GLib, libsoup 3 y SQLite.
- Ninguna biblioteca enlazada apareció como `not found` durante la validación.

Contenido del paquete:

- `/usr/bin/bibliaapp-desktop`;
- `/usr/share/applications/bibliaapp-desktop.desktop`;
- iconos hicolor de 16, 32, 48, 128 y 256 px.

Instalación:

```bash
sudo pacman -U packaging/arch/bibliaapp-desktop-0.3.3-1-x86_64.pkg.tar.zst
```

El artefacto se excluye de Git mediante `desktop/.gitignore`; debe conservarse o publicarse por separado de los fuentes.

## Validación ejecutada

```bash
npm run check
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
npm run pack:arch
```

Tauri también produjo:

- `src-tauri/target/release/bundle/appimage/BibliaAPP_0.3.3_amd64.AppImage`;
- `src-tauri/target/release/bundle/deb/BibliaAPP_0.3.3_amd64.deb`.

La instalación con `pacman -U` no se ejecutó en el entorno de compilación porque no dispone de `pacman`; el archivo se validó directamente como tar Zstandard, leyendo `.PKGINFO`, permisos, rutas y dependencias dinámicas.
