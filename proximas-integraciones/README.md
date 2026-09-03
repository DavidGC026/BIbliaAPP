# Recursos y Diccionarios Léxicos (Griego, Hebreo y Arameo)

Esta carpeta contiene los repositorios públicos de léxicos, diccionarios Strong, interlineales y concordancias descargados para su próxima integración en la base de datos y la aplicación.

---

## Estructura de Repositorios Descargados

### 1. `strongs-json-sqlite/` (Mormon Documentation Project)
* **Formatos listos:** `strongs.json`, `strongs-mysql.sql`, `strongs-sqlite3.db`, `strongs.csv`
* **Contenido:** Concordancia Strong completa (Hebreo H1-H8674 y Griego G1-G5624).
* **Ideal para:** Carga rápida directa a MySQL mediante el archivo `strongs-mysql.sql` o lectura JSON.

### 2. `stepbible-data/` (Tyndale House Cambridge)
* **Formatos:** TSV (tab-separated values) en la carpeta `Lexicons/`
* **Contenido:**
  * `TBESH`: Léxico abreviado para Hebreo y Arameo (basado en Brown-Driver-Briggs BDB).
  * `TBESG`: Léxico abreviado para Griego (basado en Abbott-Smith y Thayer).
  * `TFLSJ`: Léxico completo de Liddell-Scott-Jones para Griego bíblico.
  * `Tagged-Bibles/` y `Morphology codes/`: Textos bíblicos con anotación morfológica palabra por palabra.
* **Licencia:** CC-BY 4.0 (Tyndale House).

### 3. `bdb-hebrew-lexicon-eliranwong/` (Eliran Wong)
* **Formatos:** `DictBDB.json` (24 MB) y `unabridged-BDB-Hebrew-lexicon.csv.zip`
* **Contenido:** Diccionario Brown-Driver-Briggs (BDB) íntegro y sin abreviar para Hebreo y Arameo bíblico con enlaces a números Strong.

### 4. `mybibletoolbox-data/` (Authentic Walk)
* **Formatos:** JSON individual por palabra en `strongs/` (G1 a G5624 y H1 a H8674) y SQLite en `databases/verse-strongs.sqlite`.
* **Contenido:** Mapeo de versículo a número Strong (`verse-strongs.sqlite`) ideal para saber qué palabras Strong corresponden a cada versículo del Antiguo y Nuevo Testamento.

### 5. `interlinear-bibledata-tahmmee/`
* **Formatos:** `bible_original.sql.gz` (SQL comprimido de 16MB), `lexicon/greek.json.gz`, `lexicon/hebrew.json.gz`, `interlinear/`.
* **Contenido:** Texto bíblico original interlineal con alineación palabra por palabra.

### 6. `openscriptures-strongs/` (OpenScriptures)
* **Formatos:** XML, XHTML y scripts de transformación.
* **Contenido:** Léxicos base de referencia de Open Scriptures para Griego y Hebreo.

### 7. `openscriptures-hebrew-lexicon/` (OpenScriptures)
* **Formatos:** XML del léxico Hebreo y Arameo BDB con fuentes léxicas ampliadas.

### 8. `morphgnt-strongs-greek-xml/` (MorphGNT)
* **Formatos:** XML con caracteres griegos Unicode reales (koiné) y morfología detallada.

---

## Guía de Integración Sugerida

### Opción A: Cargar directamente en MySQL
Puedes importar el script SQL base ejecutando:
```bash
mysql -u <usuario> -p <nombre_bd> < proximas-integraciones/strongs-json-sqlite/strongs-mysql.sql
```

### Opción B: Crear un API Route en Next.js
1. Diseñar el endpoint en `app/api/lexicon/[id]/route.ts`.
2. Servir los datos desde MySQL o desde caché JSON para respuestas en milisegundos cuando el usuario pulse una palabra en el lector bíblico.
