# Comentarios bíblicos (Matthew Henry, Spurgeon…)

Comentarios clásicos de dominio público que aparecen **debajo del versículo** en el lector, plegados, cuando el lector activa la opción *Comentarios* en los ajustes de lectura.

## Por qué no hay Prisma ni migración de Prisma

El proyecto no usa Prisma: la capa de datos es `mysql2` con SQL escrito a mano (`lib/mysql.ts` + un módulo por dominio en `lib/`), y las tablas se crean solas con funciones idempotentes del tipo `ensureDbTables()`. Los comentarios siguen esa misma convención, así que **no hay que ejecutar `prisma migrate` ni `prisma db push`**: la tabla se crea sola la primera vez que se usa la funcionalidad.

El fichero `scripts/003_commentaries.sql` está para quien prefiera migrar a mano antes de desplegar.

## Esquema en base de datos

Creado por `ensureCommentaryTables()` en `lib/commentaries.ts`, y disponible también como SQL suelto en `scripts/003_commentaries.sql`:

```text
bible_commentaries → id, bible_id, book_id, chapter, verse_start, verse_end,
                     author, language_code, content_md, created_at, updated_at
                     KEY    idx_commentary_lookup (book_id, chapter, language_code,
                                                   verse_start, verse_end)
                     UNIQUE uniq_commentary_passage (bible_id, book_id, chapter,
                                                     verse_start, verse_end,
                                                     author, language_code)
```

Dos decisiones que conviene conocer antes de tocar la tabla:

- **Un comentario cubre un rango, no un versículo.** Matthew Henry comenta bloques enteros («Génesis 1:1-5»), así que la unidad es `verse_start..verse_end`. Un comentario de un solo versículo es el caso `verse_start = verse_end`. El lector reparte cada bloque entre todos los versículos que abarca: leyendo Génesis 1:3 aparece el bloque «1:1-5» igual que leyendo el 1:1.
- **`bible_id = 0` significa «todas las versiones», y no es NULL a propósito.** MySQL considera distintos entre sí los NULL dentro de un `UNIQUE KEY`, de modo que con NULL cada reimportación insertaría filas nuevas en vez de actualizar las existentes y el upsert del importador dejaría de funcionar. Solo se pone un `idBible` real si el comentario cita una traducción concreta; lo normal es dejarlo en 0.

## Importar comentarios

```bash
cd /srv/projects/Biblia/BibliaAPP

# Muestra incluida (crea la tabla si no existe)
npx tsx scripts/import_commentaries.ts scripts/commentaries-sample.json

# Un fichero propio, en JSON o CSV
npx tsx scripts/import_commentaries.ts comentarios.csv

# Validar sin escribir nada
npx tsx scripts/import_commentaries.ts comentarios.csv --dry-run
```

Sin argumento usa `scripts/commentaries-sample.json`. El importador hace **upsert** contra `uniq_commentary_passage`: volver a pasar el mismo fichero actualiza los textos en lugar de duplicar filas, así que se puede reimportar sin limpiar la tabla antes. Las filas inválidas se descartan una a una con el motivo por pantalla, sin abortar el fichero entero.

### Formato de entrada

JSON (un array suelto, o un objeto con la clave `comentarios` / `commentaries`) o CSV con cabecera. Cada clave se acepta en camelCase y en snake_case (`verseStart` o `verse_start`).

| Campo | Obligatorio | Descripción |
|-------|-------------|-------------|
| `bookId` | sí | 1-66 (1 = Génesis, 43 = Juan). |
| `chapter` | sí | Capítulo. |
| `verseStart` | sí | Primer versículo del bloque. |
| `verseEnd` | no | Último del bloque; si falta, se usa `verseStart`. |
| `author` | sí | Aparece tal cual en el selector de la interfaz. |
| `contentMd` | sí | El comentario en markdown. |
| `bibleId` | no | 0 por defecto = todas las versiones. |
| `languageCode` | no | `es` por defecto. |

El lector de CSV entiende comillas al estilo RFC 4180, porque los comentarios llevan comas y saltos de línea dentro del texto:

```csv
bookId,chapter,verseStart,verseEnd,author,contentMd
1,1,1,5,"Matthew Henry","## La creación

Dios **dijo**, y fue hecho."
```

### Contribuir con textos nuevos

`scripts/commentaries-sample.json` es **contenido de muestra para probar el circuito completo, no una edición de referencia**: son resúmenes breves en español de ideas conocidas de cada autor, no la traducción literal de sus obras. Antes de publicar, sustitúyelo por una edición real de dominio público manteniendo el mismo formato — por ejemplo desde CCEL ([Matthew Henry](https://www.ccel.org/ccel/henry/mhc), [Spurgeon](https://www.ccel.org/ccel/spurgeon/treasury)).

Al añadir una fuente nueva: comprueba que esté en dominio público, respeta la división en bloques del original (no la trocees versículo a versículo) y usa el mismo `author` en todas sus filas, porque es lo que agrupa las pestañas del selector.

## API

`GET /api/commentaries` (pública, cacheada 1 h como el diccionario):

| Parámetro | Descripción |
|-----------|-------------|
| `book` | Id del libro (obligatorio salvo con `list`). |
| `chapter` | Capítulo (obligatorio salvo con `list`). |
| `verse` | Devuelve solo los bloques que **cubren** ese versículo. Sin él, el capítulo entero. |
| `bible` | Añade a los genéricos los comentarios atados a esa versión. |
| `author` | Filtra por autor. |
| `lang` | Idioma (`es` por defecto). |
| `nearest` | Si nadie comentó ese versículo, devuelve el bloque más cercano del capítulo (uno por autor) y marca `nearest: true`. |
| `list` | Devuelve los autores disponibles con su número de comentarios. |

```jsonc
// GET /api/commentaries?book=1&chapter=1&verse=3
{
  "commentaries": [
    { "id": 2, "bibleId": 0, "bookId": 1, "chapter": 1, "verseStart": 3, "verseEnd": 5,
      "author": "Matthew Henry", "languageCode": "es", "contentMd": "## La luz del primer día\n\n…" }
  ],
  "nearest": false
}
```

## Interfaz

El lector pide **el capítulo entero en una sola petición** (`components/bible-reader/index.tsx`) y reparte los bloques entre sus versículos. Pedirlos versículo a versículo dispararía 176 llamadas en el Salmo 119; el modo `verse` de la API queda para consultas sueltas (móvil, escritorio, enlaces directos).

- La opción vive en los ajustes de lectura (*Estudio → Comentarios*) y se guarda en `localStorage` con el resto de preferencias del lector (`lib/reader-preferences.ts`). **Desactivada por defecto**: el lector es para leer la Biblia, y con la opción apagada el capítulo ni siquiera pide los comentarios al servidor.
- Cada comentario empieza **plegado**. Además de no enterrar el texto bíblico, así el markdown solo se analiza cuando alguien lo abre.
- Con varios autores para el mismo pasaje aparece un selector de autor; con uno solo se muestra su nombre sin más.

### Markdown

`lib/commentary-markdown.ts` implementa el subconjunto que usan estos textos —títulos, párrafos, citas, listas, negrita y cursiva— y devuelve **bloques de datos, no HTML**. El componente los pinta como elementos de React, sin `dangerouslySetInnerHTML`: como el contenido llega de ficheros importados, un comentario que traiga `<script>` se muestra como texto en lugar de ejecutarse. Por eso tampoco se añadió ninguna dependencia de markdown al proyecto.

## Pruebas

```bash
node scripts/test_commentaries.cjs
```

Comprueba el markdown y el lector de CSV (siempre), y contra MySQL: que se devuelva el rango que cubre el versículo, que un versículo sin comentario no invente uno, que el respaldo `nearest` elija el bloque más cercano, que el idioma filtre y que reimportar actualice sin duplicar. Las filas de prueba usan el autor `__test__` en un capítulo inexistente (Génesis 99) y se borran al terminar. Sin `MYSQL_HOST`/`MYSQL_DATABASE` la parte de integración se salta sola con un aviso.

## Pendiente

- El móvil y el escritorio aún no consumen el endpoint; la API ya soporta el modo por versículo que necesitan.
- Los comentarios no entran todavía en la descarga offline del móvil (`docs-mobile/19-descargas-offline.md`); haría falta un modo `export` paginado como el del diccionario.
