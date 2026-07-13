# 14 — Notas: auto-guardado y preview en libretas

Mejoras en la app Android (junio 2026) para que el usuario no pierda apuntes al salir del editor y vea texto legible en la lista de notas de cada cuaderno.

---

## Auto-guardado al salir

### Editor de cuaderno (`app/note/[noteId].tsx`)

Al editar una nota de libreta, los cambios se guardan **automáticamente** cuando el usuario sale de la pantalla:

- Botón **atrás** del header o gesto de retroceso en Android.
- No hace falta pulsar **Guardar**, aunque ese botón sigue disponible.

**Comportamiento:**

| Situación | Qué ocurre |
|-----------|------------|
| Nota existente con cambios | Se llama a `repoUpdateNotebookNote` antes de navegar atrás. |
| Nota nueva con título o contenido | Se crea con `repoCreateNotebookNote`. Si no hay título, se usa **"Sin título"**. |
| Nota nueva vacía (sin título ni texto) | No se crea nada; se sale sin guardar. |
| Error al guardar | Se muestra un aviso y **permanece en el editor** para no perder el texto. |
| Sin conexión | Usa la cola offline existente (`lib/repo.ts`); se sincroniza al volver internet. |

**Implementación técnica:**

- Listener `beforeRemove` de React Navigation (vía `useNavigation` de Expo Router).
- Antes de salir, el WebView del editor responde a `{ type: 'getHtml' }` para obtener el HTML actualizado.
- Refactor de la lógica de guardado en `persistNote()` con modo `silent` para el auto-guardado.

### Notas de versículo (`components/BibleReader.tsx`)

En el modal de nota del lector bíblico:

- Al pulsar **Cerrar** o usar el gesto atrás (`onRequestClose`), si el texto cambió respecto al valor inicial, se guarda con `repoSaveVerseNote`.
- Si falla el guardado, el modal **no se cierra**.

---

## Preview en la lista de libretas

### Problema

Las notas del editor enriquecido se almacenan en **HTML** (`<p>`, `<span>`, etc.). En la lista de un cuaderno (`app/notebook/[id].tsx`) el resumen usaba `stripNotePreview()`, pensado solo para **markdown**, y mostraba etiquetas HTML crudas.

### Solución

En `lib/notebookCovers.ts`, `stripNotePreview()` ahora:

1. Detecta si el contenido parece HTML.
2. Convierte a texto plano (`htmlToPlainText`): quita etiquetas, decodifica entidades (`&nbsp;`, `&amp;`, …) y normaliza espacios.
3. Mantiene compatibilidad con notas antiguas en markdown.
4. Recorta a ~100 caracteres con `…`.

La **vista previa completa** dentro del editor (`NoteContent` + WebView en modo lectura) no cambió; solo el snippet de la tarjeta en la lista del cuaderno.

---

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `mobile/app/note/[noteId].tsx` | Auto-guardado con `beforeRemove` |
| `mobile/components/BibleReader.tsx` | Auto-guardado al cerrar modal de nota de versículo |
| `mobile/lib/notebookCovers.ts` | `stripNotePreview()` soporta HTML |

---

## Cómo probar

```bash
cd mobile
npm run android
```

1. **Libreta:** abre una nota, escribe texto, sal con atrás sin pulsar Guardar. Vuelve a abrirla: el contenido debe persistir.
2. **Lista:** en el cuaderno, el resumen bajo el título debe mostrar texto legible, no `<p>…</p>`.
3. **Versículo:** en el lector, abre nota de un versículo, edita y cierra con **Cerrar**; recarga el capítulo y comprueba la nota.

---

## Paridad web (julio 2026)

La versión web replica el preview de lista y parte del autoguardado, con matices distintos:

| Comportamiento | Android | Web (`components/notebook-sidebar.tsx`) |
|----------------|---------|----------------------------------------|
| Preview en lista | `stripNotePreview()` en `notebookCovers.ts` | Misma lógica en `lib/notebook-covers.ts` |
| Autoguardado al salir | `beforeRemove` → guarda siempre al pulsar atrás | **No** guarda al pulsar **Volver**; solo autoguardado tras **4 s** sin cambios |
| Solicitar HTML antes de guardar | `getHtml` con fallback **5000 ms** | Igual vía `requestEditorHtml()` en `note-rich-editor.tsx` |
| Productividad (orden, pin, mover…) | Doc 17 | Paridad en web — ver [`docs/notas-web-paridad-movil.md`](../docs/notas-web-paridad-movil.md) |

Si el usuario alterna entre web y móvil, conviene recordar: en web hay que esperar el indicador **Guardado** o pulsar **Guardar** antes de **Volver** si acaba de editar.
