/*
 * Comprobaciones de los comentarios bíblicos (Matthew Henry, Spurgeon…).
 *
 *   node scripts/test_commentaries.cjs
 *
 * Dos partes:
 *
 *   1. Unitarias, siempre se ejecutan: el markdown mínimo de `content_md` y el
 *      lector de CSV del importador. Son funciones puras, sin base de datos.
 *
 *   2. Integración contra MySQL: importa un autor de prueba, comprueba que el
 *      endpoint devuelve el rango que cubre el versículo, que el respaldo
 *      encuentra el bloque más cercano y que reimportar no duplica. Se salta
 *      sola con un aviso si no hay base de datos configurada, para que la
 *      prueba siga sirviendo en un portátil sin MySQL.
 *
 * Las filas de prueba usan el autor «__test__» y se borran al terminar, incluso
 * si una comprobación falla.
 */
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const jiti = require('jiti')(__filename, { interopDefault: true, alias: { '@': ROOT } })

require('dotenv').config({ path: path.join(ROOT, '.env.local') })

const md = jiti(path.join(ROOT, 'lib/commentary-markdown.ts'))
const importer = jiti(path.join(ROOT, 'scripts/import_commentaries.ts'))

let failures = 0
let passed = 0

function check(name, actual, expected) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) {
    passed++
    return
  }
  failures++
  console.error(`✗ ${name}\n    esperado: ${e}\n    obtenido: ${a}`)
}

function ok(name, condition, detail = '') {
  if (condition) {
    passed++
    return
  }
  failures++
  console.error(`✗ ${name}${detail ? `\n    ${detail}` : ''}`)
}

// ---------------------------------------------------------------- markdown
console.log('· Markdown de los comentarios')

check('párrafo simple', md.parseMarkdownBlocks('Hola mundo'), [
  { type: 'paragraph', inline: [{ text: 'Hola mundo' }] },
])

check('encabezado con nivel', md.parseMarkdownBlocks('## La obra de la creación'), [
  { type: 'heading', level: 2, inline: [{ text: 'La obra de la creación' }] },
])

check('negrita y cursiva', md.parseInline('Dios **dijo** y fue *hecho*'), [
  { text: 'Dios ' },
  { text: 'dijo', bold: true },
  { text: ' y fue ' },
  { text: 'hecho', italic: true },
])

check('negrita con cursiva', md.parseInline('***todo aquel***'), [
  { text: 'todo aquel', bold: true, italic: true },
])

check('cursiva con guion bajo', md.parseInline('era _bueno_'), [
  { text: 'era ' },
  { text: 'bueno', italic: true },
])

// Las líneas seguidas forman un solo párrafo; la línea en blanco lo cierra.
check(
  'líneas seguidas se unen, la línea en blanco separa',
  md.parseMarkdownBlocks('uno\ndos\n\ntres'),
  [
    { type: 'paragraph', inline: [{ text: 'uno dos' }] },
    { type: 'paragraph', inline: [{ text: 'tres' }] },
  ],
)

check('cita', md.parseMarkdownBlocks('> En el principio'), [
  { type: 'quote', inline: [{ text: 'En el principio' }] },
])

check('lista de viñetas', md.parseMarkdownBlocks('- uno\n- dos'), [
  { type: 'list', ordered: false, items: [[{ text: 'uno' }], [{ text: 'dos' }]] },
])

check('lista numerada', md.parseMarkdownBlocks('1. uno\n2. dos'), [
  { type: 'list', ordered: true, items: [[{ text: 'uno' }], [{ text: 'dos' }]] },
])

// Pasar de viñetas a numeración abre una lista nueva, no mezcla las dos.
check('cambiar de tipo de lista abre otra', md.parseMarkdownBlocks('- uno\n1. dos'), [
  { type: 'list', ordered: false, items: [[{ text: 'uno' }]] },
  { type: 'list', ordered: true, items: [[{ text: 'dos' }]] },
])

// El contenido llega de ficheros importados: el HTML tiene que quedar como
// texto. El componente pinta tokens, nunca HTML, así que esto es lo que
// garantiza que un comentario con <script> se lea en vez de ejecutarse.
check('el HTML se conserva como texto plano', md.parseMarkdownBlocks('<script>alert(1)</script>'), [
  { type: 'paragraph', inline: [{ text: '<script>alert(1)</script>' }] },
])

check('markdown vacío', md.parseMarkdownBlocks(''), [])

check(
  'texto plano de un comentario',
  md.markdownToPlainText('## Título\n\nUn **párrafo**.\n\n- punto'),
  'Título Un párrafo. punto',
)

// ----------------------------------------------------------------- CSV
console.log('· Lector de CSV del importador')

check('csv básico', importer.parseCsv('bookId,chapter\n1,2'), [{ bookId: '1', chapter: '2' }])

// Un comentario lleva comas y saltos de línea dentro del texto: partir por
// comas rompería el fichero, de ahí el lector entrecomillado.
check(
  'csv con comas y saltos dentro del campo',
  importer.parseCsv('author,contentMd\n"Henry","Uno, dos\ntres"'),
  [{ author: 'Henry', contentMd: 'Uno, dos\ntres' }],
)

check(
  'csv con comillas escapadas',
  importer.parseCsv('author,contentMd\n"Henry","dijo ""hola"""'),
  [{ author: 'Henry', contentMd: 'dijo "hola"' }],
)

check('csv solo con cabecera', importer.parseCsv('bookId,chapter\n'), [])

check(
  'json envuelto en objeto',
  importer.parseJson('{"comentarios":[{"author":"Henry"}]}'),
  [{ author: 'Henry' }],
)

check('json en array suelto', importer.parseJson('[{"author":"Henry"}]'), [{ author: 'Henry' }])

// ---------------------------------------------------------- integración
const TEST_AUTHOR = '__test__'

async function integration() {
  if (!process.env.MYSQL_HOST || !process.env.MYSQL_DATABASE) {
    console.log('· Integración con MySQL: omitida (sin MYSQL_HOST/MYSQL_DATABASE)')
    return
  }

  const commentaries = jiti(path.join(ROOT, 'lib/commentaries.ts'))
  const { getPool } = jiti(path.join(ROOT, 'lib/mysql.ts'))

  const cleanup = async () => {
    await getPool().query('DELETE FROM bible_commentaries WHERE author = ?', [TEST_AUTHOR])
  }

  try {
    await commentaries.ensureCommentaryTables()
  } catch (err) {
    console.log(`· Integración con MySQL: omitida (${err.message})`)
    return
  }

  console.log('· Integración con MySQL')
  try {
    await cleanup()

    // Génesis 99 no existe: aísla la prueba de los datos reales de la tabla.
    const chapter = 99
    const base = { bookId: 1, chapter, author: TEST_AUTHOR, languageCode: 'es' }
    await commentaries.upsertCommentaries([
      { ...base, verseStart: 1, verseEnd: 5, contentMd: 'bloque uno' },
      { ...base, verseStart: 10, verseEnd: 12, contentMd: 'bloque dos' },
    ])

    const covering = await commentaries.findCommentaries({
      bookId: 1,
      chapter,
      verse: 3,
      author: TEST_AUTHOR,
    })
    check(
      'devuelve el rango que cubre el versículo',
      covering.map((c) => [c.verseStart, c.verseEnd, c.contentMd]),
      [[1, 5, 'bloque uno']],
    )

    // El versículo 7 cae en el hueco entre los dos bloques.
    const gap = await commentaries.findCommentaries({
      bookId: 1,
      chapter,
      verse: 7,
      author: TEST_AUTHOR,
    })
    check('un versículo sin comentario no inventa uno', gap, [])

    const nearest = await commentaries.findNearestCommentaries({
      bookId: 1,
      chapter,
      verse: 7,
      author: TEST_AUTHOR,
    })
    // Del 7 al bloque 1-5 hay 2; al bloque 10-12, 3. Gana el primero.
    check(
      'el respaldo elige el bloque más cercano',
      nearest.map((c) => [c.verseStart, c.verseEnd]),
      [[1, 5]],
    )
    ok('el respaldo devuelve un comentario por autor', nearest.length === 1, `fueron ${nearest.length}`)

    const wholeChapter = await commentaries.findCommentaries({
      bookId: 1,
      chapter,
      author: TEST_AUTHOR,
    })
    ok(
      'sin versículo devuelve el capítulo entero',
      wholeChapter.length === 2,
      `fueron ${wholeChapter.length}`,
    )

    // Reimportar el mismo pasaje actualiza el texto en lugar de duplicarlo:
    // es lo que permite volver a pasar un fichero corregido sin limpiar antes.
    await commentaries.upsertCommentaries([
      { ...base, verseStart: 1, verseEnd: 5, contentMd: 'bloque uno corregido' },
    ])
    const reimported = await commentaries.findCommentaries({
      bookId: 1,
      chapter,
      verse: 3,
      author: TEST_AUTHOR,
    })
    check(
      'reimportar actualiza y no duplica',
      reimported.map((c) => c.contentMd),
      ['bloque uno corregido'],
    )

    // bible_id = 0 significa «todas las versiones»: leer en cualquier
    // traducción tiene que seguir viendo el comentario genérico.
    const withBible = await commentaries.findCommentaries({
      bookId: 1,
      chapter,
      verse: 3,
      bibleId: 1,
      author: TEST_AUTHOR,
    })
    ok(
      'el comentario genérico se ve desde cualquier versión',
      withBible.length === 1,
      `fueron ${withBible.length}`,
    )

    // El idioma filtra de verdad: pedir en inglés no devuelve el texto español.
    const otherLanguage = await commentaries.findCommentaries({
      bookId: 1,
      chapter,
      verse: 3,
      languageCode: 'en',
      author: TEST_AUTHOR,
    })
    check('el idioma filtra los resultados', otherLanguage, [])

    const authors = await commentaries.listCommentaryAuthors('es')
    ok(
      'el autor aparece en el selector',
      authors.some((a) => a.author === TEST_AUTHOR),
      `autores: ${authors.map((a) => a.author).join(', ')}`,
    )
  } finally {
    await cleanup()
    await getPool().end()
  }
}

integration()
  .catch((err) => {
    failures++
    console.error(`✗ integración: ${err.message}`)
  })
  .finally(() => {
    console.log(`\n${passed} comprobaciones correctas, ${failures} fallidas`)
    process.exit(failures === 0 ? 0 : 1)
  })
