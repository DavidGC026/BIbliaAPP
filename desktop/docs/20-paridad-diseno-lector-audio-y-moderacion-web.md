# 20 — Paridad de Diseño, Lector Bíblico Editorial, Audio Kokoro TTS y Moderación UGC Web

Fecha: Septiembre 2026  
Versión: `0.3.5`

## Resumen

Esta actualización sincroniza por completo la versión **Desktop (Tauri v2 + React)** con todos los avances y refinamientos visuales introducidos en la versión **Web** de BibliaAPP:

1. **Rediseño editorial del lector bíblico**:
   - Cabecera con nombre del libro en versalitas (`tracking-[0.32em]`), numeral display en serif (`text-5xl md:text-6xl`) y fleurón ornamental `❦`.
   - Modo de texto en párrafos continuos (`layout: "paragraphs"`), con números de versículo en superíndice (`<sup>`).
   - Capitular elegante en el versículo 1 (`.verse-dropcap`, 3.15em con Source Serif 4 y ajuste óptico).
   - Medida de lectura optimizada a `max-w-[68ch]` para una experiencia descansada.
   - Subrayados tipo marcador de texto real (`box-decoration-clone`, esquinas suaves, 5 tonos pastel).
   - Panel superior flotante / sticky con referencia en vivo (*scroll-spy*) y barra de progreso de capítulo de 3px.

2. **Comentarios bíblicos clásicos**:
   - Soporte para comentarios de dominio público (Matthew Henry, Spurgeon…) plegados bajo cada versículo.
   - Pestañas selectoras por autor.
   - Renderizado seguro de Markdown (`headings`, `paragraphs`, `quotes`, `lists`, negritas y cursivas) sin `dangerouslySetInnerHTML`.

3. **Lector de audio inteligente (Kokoro Neural IA + Web Speech)**:
   - Integración con el motor TTS Kokoro (`/api/tts`) con voces neuronales en español (`em_alex`, `ef_dora`, `em_santa`).
   - Conmutación automática o manual a la síntesis nativa del sistema operativo (`window.speechSynthesis`).
   - Seguimiento visual del versículo activo con brillo suave esmeralda (`ring-2 ring-emerald-500 bg-emerald-500/10`).
   - Controles de velocidad (0.75x a 2.0x), precarga (*prefetch*) del siguiente versículo, pausar, saltar y silenciar.

4. **Moderación UGC, Bloqueo de Usuarios y Privacidad**:
   - **`ReportModal`**: Modal para reportar publicaciones, comentarios o usuarios infractores con clasificación de motivos.
   - **`BlockedUsersDialog`**: Diálogo para consultar y desbloquear usuarios bloqueados.
   - **`AdminModerationPanel`**: Pestaña en el panel de administración para que los administradores revisen denuncias y descarten o eliminen contenido infractor.
   - Menú contextual rápido (`•••`) en tarjetas de la comunidad.
   - Diálogo seguro de eliminación permanente de cuenta en el perfil.

5. **Tipografía y fuentes globales**:
   - Carga de fuentes variables `Geist` y `Source Serif 4` con eje óptico (`opsz`) en `index.html` y `@theme inline` en `globals.css`.

---

## Estructura de componentes creados y modificados

```text
desktop/src/
├── components/
│   ├── bible-reader/
│   │   ├── audio-player.tsx       # Reproductor híbrido Kokoro IA / Web Speech
│   │   ├── reader-settings.tsx    # Panel de ajustes tipográficos, párrafos y temas
│   │   ├── reader-toolbar.tsx     # Barra flotante de acciones sobre selección
│   │   ├── verse-commentary.tsx   # Acordeón de comentarios clásicos con autores
│   │   ├── verse-text.tsx         # Versículo memoizado (párrafos, capitular, marcador)
│   │   └── version-selector.tsx   # Selectores de versión, libro y capítulo
│   ├── BibleReader.tsx            # Orquestador del lector con cabecera editorial y scroll-spy
│   ├── FeedPostCard.tsx           # Tarjeta con menú contextual de moderación y bloqueo
│   ├── ReportModal.tsx            # Modal universal de denuncias
│   ├── BlockedUsersDialog.tsx     # Diálogo de usuarios bloqueados
│   ├── AdminModerationPanel.tsx   # Panel admin para resolver reportes
│   └── ui/
│       ├── Button.tsx             # Botón ampliado con variantes y tamaños
│       └── Icon.tsx               # Iconos con volume, play, pause, volume-x
├── pages/
│   ├── AdminUsersPage.tsx         # Pestañas de Usuarios y Moderación UGC
│   ├── FeedPage.tsx               # Comunidad con reporte y bloqueo
│   └── ProfilePage.tsx            # Perfil con gestión de bloqueos y borrado de cuenta
├── lib/
│   ├── api.ts                     # Endpoints de comentarios, TTS y moderación
│   ├── commentaryMarkdown.ts      # Parser puro de Markdown para comentarios
│   ├── highlightColors.ts         # Paleta de resaltados con HIGHLIGHT_COLOR_ITEMS
│   └── preferences.ts             # Preferencias de layout, comentarios y paletas
└── styles/
    └── globals.css                # Dropcap, reader-paragraphs, variables y animaciones
```

---

## Verificación

Compilación TypeScript y empaquetado de producción Vite ejecutados satisfactoriamente:
```bash
npm run build
```
- Salida limpia, 0 errores de TypeScript, dist generado correctamente.
