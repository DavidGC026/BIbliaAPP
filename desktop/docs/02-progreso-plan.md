# 02 — Progreso vs. plan de implementación

Referencia: [`../PLAN.md`](../PLAN.md)
Leyenda: ✅ hecho · 🟡 parcial · ⬜ pendiente

---

## Fase 0 — Prerrequisitos

| Item             | Estado                                                       |
| ---------------- | ------------------------------------------------------------ |
| Node 20+         | ✅                                                           |
| Rust (rustup)    | ✅                                                           |
| Arch: webkit2gtk | ✅ [04-arch-linux.md](./04-arch-linux.md)                    |
| Debian build     | ✅ [09-debian-linux.md](./09-debian-linux.md)                |
| Windows build    | 🟡 docs + CI; compilar en máquina Windows o tag `desktop-v*` |

---

## Fase 1 — Scaffold

| Item                 | Estado                  |
| -------------------- | ----------------------- |
| Tauri + React + Vite | ✅                      |
| Tailwind 4           | ✅                      |
| shadcn completo      | 🟡 Button, Card propios |
| `tauri dev`          | ✅                      |

---

## Fase 2 — API y auth

| Item                 | Estado           |
| -------------------- | ---------------- |
| config, types, api   | ✅               |
| Login + Google OAuth | ✅               |
| Sesión offline       | ✅               |
| plugin-http          | ⬜ fetch WebView |

---

## Fase 3 — Pantallas núcleo

| Pantalla                                                    | Estado |
| ----------------------------------------------------------- | ------ |
| Inicio, Login, Feed, Grupos, Perfil                         | ✅     |
| Biblia: Lector, Buscar, Referencias, Diccionario, Descargas | ✅     |

---

## Fase 4 — Empaquetado

| Item                   | Estado                                                      |
| ---------------------- | ----------------------------------------------------------- |
| Arch AppImage + pacman | ✅                                                          |
| Debian `.deb`          | ✅ `npm run pack:deb`                                       |
| Windows                | 🟡 `npm run pack:win` + CI [11-windows.md](./11-windows.md) |
| AUR                    | ⬜                                                          |

---

| Item                                      | Estado                                                     |
| ----------------------------------------- | ---------------------------------------------------------- |
| Offline SQLite + búsqueda                 | ✅                                                         |
| Detalle grupo + comentarios + SSE         | ✅                                                         |
| Resaltados y notas (lector)               | ✅ online + offline sync                                   |
| Favoritos                                 | ✅ online + offline sync                                   |
| Libretas / diario / libros                | ✅ libretas offline; diario/libros online                  |
| Auto-update                               | 🟡 plugin + UI + CI; `latest.json` en producción pendiente |
| Notas offline sync                        | ✅ libretas, notas, resaltados, favoritos, verse_notes     |
| Referencias cruzadas + diccionario Strong | ✅                                                         |
| Búsqueda universal + historial            | ✅                                                         |
| Planes de lectura                         | ✅                                                         |
| Inicio inteligente + recientes            | ✅                                                         |
| Temas visuales y del lector               | ✅                                                         |
| Administración y permisos                 | ✅                                                         |
| Legal + licencias de traducciones         | ✅                                                         |
| Calendario + RSVP                         | ✅ iglesia y grupos; CRUD admin                            |
| Editor avanzado de notas                  | ✅ imágenes, fuentes, autoguardado y PDF                   |
| Portadas avanzadas                        | ✅ Unsplash, archivo, URL y gradientes                     |
| Rediseño lector (párrafos + capitular)    | ✅ cabecera editorial, dropcap v1, versalitas y scroll-spy |
| Comentarios bíblicos clásicos             | ✅ Henry, Spurgeon plegados con Markdown seguro            |
| Audio Inteligente Kokoro TTS              | ✅ Kokoro neuronal + Web Speech fallback y visual tracker  |
| Moderación UGC y privacidad               | ✅ reportes, bloqueos, panel admin y borrado de cuenta     |

---

## Siguiente sprint

1. Publicar `latest.json` y artefactos firmados de v0.3.5 en producción.
2. Verificar instalación en Arch (`pacman`) / Debian (`.deb`) / Windows (`.msi`).
3. Añadir recordatorios nativos en segundo plano si se requiere ejecución con la app cerrada.

