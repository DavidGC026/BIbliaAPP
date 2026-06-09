# Sección Diccionario bíblico

Diccionarios de estudio (Strong de griego y hebreo, y futuros) accesibles desde la sección **Diccionario** (grupo Estudio bíblico, con acceso para invitados).

## Esquema en base de datos

Esquema multi-diccionario (creado automáticamente por `ensureDbTables()` en `lib/bible.ts`):

```text
bible_dictionaries          → id, slug, name, language, source
bible_dictionary_entries    → dictionary_id, code, lemma, transliteration, definition
                              UNIQUE(dictionary_id, code)
                              FULLTEXT(lemma, transliteration, definition)
```

La tabla legada `bible_strong_dictionary` (creada por el importador) se migra automáticamente al esquema nuevo con `INSERT IGNORE` cada vez que corre `ensureDbTables()`. Puedes reimportar Strong sin miedo: los duplicados se ignoran.

## Importar / reimportar el diccionario Strong

```bash
cd /home/david/proyectos/BibliaAPP
npx tsx scripts/import_strong_dictionary.ts
```

Descarga los diccionarios griego y hebreo desde OpenScriptures y los inserta en `bible_strong_dictionary`. La migración al esquema nuevo ocurre sola en el siguiente arranque/uso de la app (o ejecuta cualquier endpoint que toque la BD).

## Añadir un diccionario nuevo

1. Inserta el diccionario:

```sql
INSERT INTO bible_dictionaries (slug, name, language, source)
VALUES ('mi-diccionario', 'Mi Diccionario', 'Español', 'Fuente');
```

2. Inserta sus entradas en `bible_dictionary_entries` con el `dictionary_id` correspondiente.
3. Listo: la API lo expone en `GET /api/dictionary?list` y la UI muestra el selector de diccionario automáticamente cuando hay más de uno.

## API

`GET /api/dictionary` (pública, cacheada 1 h):

| Parámetro | Descripción |
|-----------|-------------|
| `list` | Devuelve los diccionarios disponibles con conteo de entradas. |
| `dict` | Slug del diccionario (default `strong`). |
| `q` | Búsqueda libre (mínimo 2 caracteres) o código Strong (`G25`, `h430`). Usa FULLTEXT + LIKE. |
| `lang` | `all` \| `greek` \| `hebrew` (filtra por prefijo G/H del código). |
| `page` | Página (25 entradas por página). |
| `code` | Búsqueda exacta de una entrada: devuelve `{ entry }`. |
| `browse` | Permite listar sin query (modo exploración). |

## Deep links

`https://biblia2.dvguzman.com/?strong=G25` abre la app directamente en la sección Diccionario con esa entrada cargada. Útil para compartir y para integraciones futuras con el lector.

## Integración con el lector (pendiente)

El texto bíblico actual (`bible_verses.text`) es texto plano en español **sin etiquetado Strong palabra a palabra**, por lo que no es posible tocar una palabra del lector y saltar a su entrada. Para habilitarlo haría falta importar una versión etiquetada (p. ej. RVR con números Strong) o una tabla de concordancia `versículo ↔ código`. El deep link `?strong=` ya deja lista la mitad del camino.

## Traducción al español

Las definiciones originales de OpenScriptures están en inglés. Se traducen al español con una instancia local de LibreTranslate y se guardan en la columna `definition_es` (el original en inglés se conserva en `definition`). La API devuelve el español cuando existe, con fallback al inglés.

```bash
# 1. Levantar LibreTranslate (solo modelos en/es)
docker run -d --name biblia-libretranslate -p 127.0.0.1:5567:5000 \
  -e LT_LOAD_ONLY=en,es --restart unless-stopped libretranslate/libretranslate

# 2. Traducir (reanudable: solo procesa filas con definition_es IS NULL)
cd /home/david/proyectos/BibliaAPP
npx tsx scripts/translate_dictionary.ts

# 3. (Opcional) apagar LibreTranslate al terminar
docker rm -f biblia-libretranslate
```

El script traduce sección por sección conservando las etiquetas `Strong:`/`KJV:`/`Derivation:` que la UI parsea. Si reimportas el diccionario y aparecen entradas nuevas, basta volver a correr el script.

## UI (`components/strong-dictionary.tsx`)

- Estado inicial sin listado completo: ejemplos clicables + botón "Explorar todo el diccionario".
- Definiciones parseadas en secciones (Definición / Traducciones KJV / Derivación).
- Los códigos Strong dentro de las definiciones (`H031`, `G25`...) son enlaces que cargan esa entrada.
- Filtro griego/hebreo, selector de diccionario (si hay más de uno) y paginación.
- Las definiciones se muestran en español (traducidas con LibreTranslate), con fallback al inglés original.
