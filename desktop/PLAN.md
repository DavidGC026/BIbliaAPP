# Plan de implementación — BibliaAPP Escritorio

Versión de escritorio multiplataforma para **Arch Linux**, **Debian** y **Windows**.

> Estado: propuesta inicial. Esta carpeta (`desktop/`) es el nuevo proyecto, hermano de `mobile/`.

---

## 1. Objetivo

Una app de escritorio nativa, ligera y con el mismo diseño que la web/móvil, que **consuma el backend existente** (`app/api/*` de Next.js, hoy en `https://biblia2.dvguzman.com`). No reimplementa lógica de negocio ni accede directo a MariaDB: habla REST + Bearer token, igual que la app móvil.

Casos de uso prioritarios (paridad con móvil v2.x):

- Lector bíblico (versiones, libros, capítulos, versículos).
- Versículo del día.
- Comunidad (feed), grupos, perfil.
- Login por token Bearer.
- Notas / resaltados / favoritos (fase 2).
- Notificaciones en tiempo real vía SSE (fase 2).

---

## 2. Análisis del proyecto actual (resumen)

| Capa          | Tecnología                                                            | Reutilizable en desktop                                                |
| ------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Backend / API | Next.js 16 (`app/api/*`), MariaDB (`mysql2`), SSE                     | **Sí, tal cual.** Mismo contrato que móvil                             |
| Auth          | Token AES `Authorization: Bearer <token>`                             | Sí. Guardar token en keychain del SO                                   |
| Web UI        | React 19, Tailwind 4 (OKLCH), shadcn, lucide                          | Componentes y paleta reutilizables                                     |
| Móvil         | Expo / React Native v2.0.7, consume la API, offline con `expo-sqlite` | **Patrón de referencia** (`mobile/lib/api.ts`, `mobile/lib/offline/*`) |

Conclusión: el backend ya está desacoplado del cliente. El desktop es **otro cliente más** sobre la misma API. La paleta de colores está documentada en `docs/esquema-colores.md` (variables OKLCH para web).

---

## 3. Decisión técnica: Tauri v2 + React (Vite)

**Stack elegido: Tauri v2 (núcleo Rust) + React + TypeScript + Vite + Tailwind 4.**

Por qué Tauri y no las otras opciones que mencionaste:

| Opción               |         Arch         |  Debian  |       Windows        | Tamaño   | Veredicto                                                                           |
| -------------------- | :------------------: | :------: | :------------------: | -------- | ----------------------------------------------------------------------------------- |
| **Tauri v2**         | AppImage / `.pacman` |  `.deb`  | `.msi` + NSIS `.exe` | ~3–10 MB | **Elegida.** Empaqueta nativo para los 3 destinos de fábrica, usa el WebView del SO |
| Electron             |  AppImage / pacman   |  `.deb`  |        `.exe`        | ~120 MB+ | Pesado, empaqueta Chromium completo                                                 |
| React Native desktop |       ❌ Linux       | ❌ Linux |      RN-Windows      | —        | No hay historia viable de RN para Linux. Descartado                                 |

Ventajas concretas de Tauri para tu caso:

- **Genera los tres formatos pedidos** con `tauri build` (`.deb` para Debian, AppImage para Arch/cualquier distro, `.msi`/`.exe` para Windows). Para Arch además puedes empaquetar un `PKGBUILD` que instale el `.AppImage` o el binario.
- Binarios pequeños porque reutiliza WebKitGTK (Linux) / WebView2 (Windows).
- Reutilizamos **React + Tailwind + shadcn**, así que el código de UI converge con la web.
- Almacenamiento seguro del token con el keychain del SO vía plugin oficial.

Reutilización de UI: portamos el frontend como **SPA (Vite)**, no como el servidor Next.js (Next es el backend y se queda como está). Copiamos/adaptamos componentes de `components/` y la paleta de `app/globals.css`.

---

## 4. Arquitectura del cliente desktop

```text
┌─────────────────────────────────────────┐
│  Tauri (Rust)                            │
│  - Ventana + WebView del SO              │
│  - Plugins: store, http, sql, updater    │
│  - Keychain para el Bearer token         │
│  ┌─────────────────────────────────────┐ │
│  │  Frontend SPA (Vite + React + TS)   │ │
│  │  - lib/api.ts  (clon del de móvil)  │ │
│  │  - UI shadcn + Tailwind (paleta web)│ │
│  │  - offline opcional (tauri-sql)     │ │
│  └─────────────────────────────────────┘ │
└──────────────────┬──────────────────────┘
                   │ HTTPS REST + SSE (Bearer)
                   ▼
        Backend Next.js existente  ── MariaDB
        (biblia2.dvguzman.com / API_URL configurable)
```

Decisiones:

- **API base configurable** por variable de entorno en build (`VITE_API_URL`), default producción. Igual que `EXPO_PUBLIC_API_URL` en móvil.
- **Token**: guardado en el keychain del SO con `tauri-plugin-store` cifrado o `keyring` (Rust). Equivalente a `expo-secure-store` del móvil.
- **CORS / peticiones**: usar `@tauri-apps/plugin-http` (las peticiones salen desde Rust, sin restricciones CORS del navegador).
- **Offline (fase 2)**: `tauri-plugin-sql` (SQLite) replicando el esquema y la lógica de `mobile/lib/offline/*` (biblias descargables, notas, lector).
- **Tipos**: portar `mobile/lib/types.ts` para mantener alineación con el backend.

---

## 5. Estructura de carpetas propuesta

```text
desktop/
├── PLAN.md                  # este archivo
├── package.json
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tailwind.config / postcss
├── src/                     # frontend React (SPA)
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles/globals.css   # paleta OKLCH portada de app/globals.css
│   ├── lib/
│   │   ├── api.ts           # clon adaptado de mobile/lib/api.ts
│   │   ├── config.ts        # API_BASE_URL, DEFAULT_BIBLE_ID
│   │   ├── auth.ts          # token via keychain
│   │   └── types.ts         # portado de mobile/lib/types.ts
│   ├── components/          # UI shadcn reutilizada
│   └── routes/ (o pages/)   # lector, feed, grupos, perfil, login
└── src-tauri/               # núcleo Rust
    ├── Cargo.toml
    ├── tauri.conf.json      # bundle targets: deb, appimage, msi, nsis
    ├── build.rs
    ├── icons/
    └── src/
        ├── main.rs
        └── lib.rs
```

---

## 6. Plan por fases

### Fase 0 — Prerrequisitos por SO (una vez)

- [x] Rust (`rustup`) + Node 20+.
- [x] **Arch**: `webkit2gtk-4.1 base-devel curl wget file openssl appmenu-gtk-module libappindicator-gtk3 librsvg`.
- [ ] **Debian**: `libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev`.
- [ ] **Windows**: WebView2 Runtime + Microsoft C++ Build Tools.
- [x] Verificar backend: `curl -s https://biblia2.dvguzman.com/api/health`.

### Fase 1 — Scaffold y arranque (MVP de cascarón)

- [x] `npm create tauri-app@latest` en `desktop/` (template React + TS + Vite).
- [x] Configurar Tailwind 4 + portar paleta OKLCH desde `app/globals.css`.
- [~] Integrar shadcn (mismos componentes base que la web). → UI mínima propia
- [x] `tauri dev` abre ventana con pantalla de inicio.

### Fase 2 — Capa de API y auth (paridad con móvil)

- [x] Portar `src/lib/config.ts`, `types.ts` y `api.ts` desde `mobile/lib/`.
- [x] Login (`POST /api/auth/login`) → guardar token en store.
- [~] Cliente HTTP con `@tauri-apps/plugin-http` → usa fetch del WebView
- [x] Google OAuth localhost + cambios backend `desktop`.
- [x] `getMe()`, manejo de 401/403 (`EMAIL_NOT_VERIFIED`).
- [x] **Check runnable**: `src/lib/__check__.ts`.

### Fase 3 — Pantallas núcleo (paridad móvil v1)

- [x] Inicio: versículo del día (`/api/verse-of-the-day`).
- [x] Lector: versiones / libros / capítulos / versículos.
- [x] Comunidad: feed (`/api/feed`).
- [x] Grupos (`/api/groups`).
- [x] Perfil + logout.

### Fase 4 — Empaquetado multiplataforma

- [x] `tauri.conf.json`: targets `appimage`, `deb`.
- [x] Iconos desde `public/logo.png` (`npm run icons`).
- [x] **Debian**: `.deb` (`npm run pack:deb`).
- [x] **Arch**: AppImage + PKGBUILD + `.pkg.tar.zst`.
- [~] **Windows**: build + CI; compilar localmente o vía tag `desktop-v*`.
- [ ] Verificar instalación limpia en cada SO.

### Fase 5 — Extras (opcional, post-MVP)

- [x] Offline SQLite + sync libretas/notas/resaltados/favoritos (paridad móvil).
- [x] Detalle grupo, comentarios feed, notificaciones SSE.
- [~] Auto-update (`tauri-plugin-updater` + UI + CI; `latest.json` en producción pendiente).

---

## 7. CI/CD (GitHub Actions)

Workflow: [`.github/workflows/desktop-build.yml`](../.github/workflows/desktop-build.yml)

- Push a `main` (cambios en `desktop/`): compila Linux + Windows
- Tag `desktop-v*`: release draft en GitHub con artefactos

Secretos opcionales: `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

Arch consume el AppImage o el `.pkg.tar.zst` del workflow / release.

---

## 8. Riesgos y decisiones abiertas

- **¿API remota o también local?** Por defecto apunta a producción (como el móvil). Si se quiere modo "servidor local", basta cambiar `VITE_API_URL`.
- **WebKitGTK en Linux**: algunas distros traen `4.0` vs `4.1`; fijar `4.1` y documentar el paquete por distro (ya listado en Fase 0).
- **Paridad de UI**: los componentes web usan Next (server components en algunos casos). Al portar a SPA hay que pasarlos a componentes cliente puros. Empezar por los más simples (lector, feed).
- **Almacenamiento de token**: decidir entre `keyring` (Rust, más seguro) vs `tauri-plugin-store` cifrado (más simple). Recomendado: `keyring`.

---

## 9. Estado actual y documentación

**Implementado hasta v0.3.3:** auth, navegación y permisos por sección, lector avanzado, búsqueda universal, planes, calendario/RSVP, actividad/estadísticas, temas, offline SQLite + sync/licencias, feed, grupos, notificaciones, notas/libretas con editor interoperable, administración, legal, empaquetado Arch/Debian y CI Windows/Linux.

Documentación completa en [`docs/README.md`](./docs/README.md).

**Siguiente:** publicar `latest.json` firmado en producción; verificar instalación limpia en cada SO.
