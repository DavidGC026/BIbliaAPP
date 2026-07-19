# 05 — Arquitectura

## Stack

| Capa                        | Tecnología                                              |
| --------------------------- | ------------------------------------------------------- |
| UI                          | React 19, TypeScript, Tailwind CSS 4 (OKLCH)            |
| Build frontend              | Vite 7                                                  |
| Shell nativo                | Tauri 2 (Rust, WebKitGTK en Linux)                      |
| Persistencia sesión         | `@tauri-apps/plugin-store`                              |
| Persistencia Biblia offline | `@tauri-apps/plugin-sql` (SQLite)                       |
| OAuth Google                | Servidor HTTP local en Rust + backend Next.js           |
| Backend                     | API REST existente (`app/api/*`) — sin lógica duplicada |

Identificador Tauri: `com.bibliaapp.desktop`

---

## Diagrama

```text
┌─────────────────────────────────────────────────────────┐
│  Tauri (Rust)                                            │
│  · WebView (WebKitGTK / WebView2)                        │
│  · plugin-store     → session.json (token + user)        │
│  · plugin-sql       → bibliaapp.db (versículos offline)  │
│  · plugin-opener    → navegador para Google OAuth        │
│  · start_google_oauth_listener → localhost callback      │
│  ┌───────────────────────────────────────────────────┐  │
│  │  React SPA (src/)                                  │  │
│  │  · AuthContext · AppLayout · pages · components    │  │
│  │  · lib/api.ts · lib/repo.ts · lib/offline/*        │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS + Bearer token
                           ▼
              Next.js (biblia2.dvguzman.com)
              MariaDB · app/api/*
```

---

## Estructura de carpetas

```text
desktop/
├── docs/                    # Documentación (este directorio)
├── packaging/arch/          # PKGBUILD, build-pacman-pkg.sh, .pkg.tar.zst
├── public/logo.png          # Logo web (copiado por npm run icons)
├── src/
│   ├── App.tsx              # Auth + routing por pestaña (AppTab)
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx # Temas globales (localStorage)
│   ├── components/
│   │   ├── AppLayout.tsx    # Barra lateral + SyncStatusBadge
│   │   ├── BibleReader.tsx
│   │   ├── ThemeSwitch.tsx
│   │   ├── LegalAcceptanceGate.tsx
│   │   ├── DesktopReminders.tsx
│   │   └── ui/              # Button, Card, EmptyState
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── UniversalSearchPage.tsx
│   │   ├── BiblePage.tsx    # Lector | Buscar | Referencias | Diccionario | Descargas
│   │   ├── NotesPage.tsx    # Libretas | Diario | Libros | Planes
│   │   ├── InsightsPage.tsx # statistics | activity | highlights (desde Perfil)
│   │   ├── AdminUsersPage.tsx
│   │   ├── LegalPage.tsx
│   │   └── …
│   └── lib/
│       ├── api.ts           # Cliente HTTP REST
│       ├── repo.ts          # Online/offline unificado (Biblia + sync)
│       ├── preferences.ts   # Lector, Inicio, historial (localStorage)
│       ├── nav.ts           # NAV_ITEMS + allowedSections
│       ├── config.ts        # VITE_API_URL, DEFAULT_BIBLE_ID
│       ├── sessionStore.ts  # Token en plugin-store
│       ├── sync.ts          # Sync libretas/notas/resaltados
│       └── offline/
│           ├── db.ts        # SQLite schema + migraciones
│           └── bibleStore.ts
└── src-tauri/
    ├── src/lib.rs           # Plugins + OAuth listener
    ├── tauri.conf.json
    └── capabilities/default.json
```

---

## Flujos principales

### Autenticación

1. Usuario en LoginPage → email/password o Google
2. Google: Rust abre puerto → navegador → backend → redirect `http://127.0.0.1:<port>/callback?token=…`
3. Token guardado en store + usuario vía `/api/auth/me`
4. Sin red: sesión cacheada; solo 401/403 cierran sesión

### Lectura bíblica

1. `repo.repoListBibles()` — API o catálogo SQLite
2. Si versión **descargada** → versículos desde SQLite
3. Si online → API + cache opcional por capítulo
4. Sin red sin descarga → error con mensaje hacia Descargas

### Descarga offline

1. Biblia → Descargas → Descargar
2. `downloadBible`: libros + versículos (bulk o capítulo a capítulo)
3. Marca `downloaded = 1` en tabla `bibles`

---

## Plugins Tauri y permisos

| Plugin            | Uso                                                     |
| ----------------- | ------------------------------------------------------- |
| `opener`          | Abrir URL OAuth en navegador                            |
| `store`           | Sesión persistente                                      |
| `sql`             | Biblia offline                                          |
| `deep-link`       | Legacy / registro esquema (OAuth ya no depende de esto) |
| `single-instance` | Una ventana; enfocar al volver de OAuth                 |

Permisos en `src-tauri/capabilities/default.json`: `core`, `opener`, `store`, `sql`, `deep-link`, `core:event`.

## Navegación

La app no usa react-router. `App.tsx` mantiene un `AppTab` y `lib/nav.ts` define la barra lateral:

| Pestaña lateral | `AppTab` | Sección `allowedSections` |
| --------------- | -------- | --------------------------- |
| Inicio          | `home`   | `dashboard`                 |
| Biblia          | `bible`  | `reading`                   |
| Búsqueda        | `search` | `search`                    |
| Notas           | `notes`  | `notebook`                  |
| Comunidad       | `feed`   | `feed`                      |
| Grupos          | `groups` | `groups`                    |
| Perfil          | `profile`| `profile`                   |

Pestañas secundarias (sin entrada propia en la barra): `statistics`, `activity`, `highlights`, `admin` y `legal`. Se abren desde **Perfil** u otras pantallas mediante `onNavigate`.

Si el usuario no es admin y el servidor envía `allowedSections`, `AppLayout` oculta entradas cuya sección no esté permitida. Comunidad y Grupos también respetan `VITE_COMMUNITY_ENABLED`.

## Estado y preferencias v0.3.0

- **Sesión:** token y usuario en `tauri-plugin-store` (`sessionStore.ts`).
- **Preferencias de UI:** lector, Inicio, historial de búsqueda y plantilla de imagen en `localStorage` vía `lib/preferences.ts`.
- **Tema global:** `ThemeContext` + clave `bibliaapp_theme_mode` en `localStorage`.
- **Recordatorios:** `ReminderSettings.tsx` persiste `bibliaapp_reminder_preferences` en `localStorage`; `DesktopReminders.tsx` evalúa avisos mientras la app está abierta.
- `lib/nav.ts` interpreta `allowedSections` para navegación y subpestañas.
- `bibles.capabilities_json` conserva licencia y capacidades para decisiones offline.
- `App.tsx` resuelve búsqueda, estadísticas, actividad, subrayados, administración y legal.
