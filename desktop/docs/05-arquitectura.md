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
├── packaging/               # Arch, Debian, Windows, releases
├── public/logo.png          # Logo web (copiado por npm run icons)
├── src/
│   ├── App.tsx              # Auth + routing por pestaña (lib/nav.ts)
│   ├── context/             # AuthContext, ThemeContext
│   ├── components/          # AppLayout, BibleReader, modales, etc.
│   ├── pages/               # Home, Biblia, Notas, Calendario, Perfil…
│   │   └── notes/           # NoteEditorView, DevotionalsView, libretas
│   └── lib/
│       ├── api.ts           # Cliente HTTP REST
│       ├── repo.ts          # Online/offline unificado
│       ├── sync.ts          # Sync libretas, notas, resaltados, favoritos
│       ├── config.ts        # API, variant, comunidad, Biblia por defecto
│       ├── nav.ts           # Pestañas, allowedSections, variant public
│       ├── preferences.ts   # Lector, Inicio, historial, recordatorios
│       ├── noteEditorBlocks.ts  # Bloques versículo/diccionario/imagen/tabla
│       ├── notePreferences.ts   # Tipografías y paleta del editor
│       ├── sessionStore.ts  # Token en plugin-store
│       └── offline/         # db.ts, bibleStore.ts
└── src-tauri/               # Rust: plugins, OAuth listener, tauri.conf.json
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

## Estado y preferencias v0.3.1

- `ThemeContext` aplica `data-theme` y conserva el modo elegido.
- `lib/preferences.ts` centraliza lector, último pasaje, Inicio, historial y plantilla de imagen.
- `lib/notePreferences.ts` guarda tipografía por nota y paleta de colores (localStorage).
- `lib/noteEditorBlocks.ts` envuelve versículos, Strong, tablas e imágenes con barra ↑↓ Copiar/Cortar/Eliminar (paridad móvil).
- `lib/nav.ts` interpreta `allowedSections` y oculta Comunidad/Grupos en variant `public` salvo `VITE_COMMUNITY_ENABLED=true`.
- `bibles.capabilities_json` conserva licencia y capacidades para decisiones offline.
- `App.tsx` resuelve búsqueda, estadísticas, actividad, subrayados, administración y legal.
