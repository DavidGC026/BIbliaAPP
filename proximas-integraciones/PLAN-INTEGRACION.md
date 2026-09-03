# Plan de integración — Interlineal y léxicos (griego / hebreo)

Documento de trabajo para incorporar los recursos de `proximas-integraciones/`
al lector bíblico. Cubre desde la limpieza del repositorio hasta la vista
interlineal en el lector, con criterios de aceptación medibles en cada paso.

**Fecha de redacción:** 2026-09-01
**Rama de referencia:** `fix/notas-bloques-contenido`
**Estado global:** `EN CURSO` (Fase 3 cerrada)

---

## 0. Cómo usar este documento

> **Este plan se va documentando sobre la marcha.** No es un documento de
> lectura única: es el registro vivo del avance.

Reglas para mantenerlo:

1. **Antes de empezar una tarea**, marca su casilla como en curso (`[~]`) y
   pon tu nombre y la fecha en la [Bitácora](#12-bitácora-de-avance).
2. **Al terminar una tarea**, márcala como hecha (`[x]`), anota en la bitácora
   qué ficheros se crearon o tocaron, y **apunta cualquier desviación** respecto
   a lo planeado (un dato que salió distinto, una decisión que cambió).
3. **Al cerrar una fase**, actualiza la tabla de [Estado por fases](#11-estado-por-fases)
   y el campo **Estado global** de la cabecera.
4. Si una tarea se abandona o se pospone, márcala `[-]` y **escribe por qué**.
   Una tarea sin explicación es peor que una tarea sin hacer.
5. Las cifras que aparecen como criterio de aceptación están **medidas sobre los
   datos reales** de esta carpeta y la base de datos de producción a fecha
   2026-09-01. Si al ejecutar te salen distintas, **no ajustes el plan a tu
   resultado**: investiga la diferencia y anótala.

Leyenda de casillas: `[ ]` pendiente · `[~]` en curso · `[x]` hecha · `[-]` descartada

---

## 1. Qué se puede hacer y qué no

Verificado contra la base de datos real y contra los ficheros de esta carpeta.

### Sí es posible

- **Interlineal completo del Nuevo Testamento con glosa en español.**
  TAGNT aporta 141.720 palabras griegas, todas con glosa española, cubriendo
  7.948 de los 7.957 versículos del NT. El 99,74 % de esas palabras enlaza con
  una entrada Strong que **ya está traducida al español** en la base de datos.
- **Interlineal completo del Antiguo Testamento**, con glosa inglesa de origen
  más la definición Strong española ya existente, y 49 partículas hebreas
  traducidas a mano (ver Fase 6).
- **Panel interlineal paralelo** en el lector: texto original + análisis a un
  lado, versión española del usuario al otro.

### No es posible

- **Palabras clicables dentro del texto de la RV60, NVI, NTV o NBLA.**
  No existe alineación palabra-a-palabra entre los originales y ninguna
  traducción española de la base de datos, y no la habrá: esas versiones son
  propietarias (© Sociedades Bíblicas Unidas, Biblica, Tyndale, Lockman) y no
  hay tagging público que se pueda usar. El interlineal vive en su propia vista,
  no dentro del texto de la versión.
- **Usar TBESH / TBESG.** Ver Fase 8.

---

## 2. Decisiones tomadas

### Fuentes que se usan

| Fuente | Para qué | Licencia |
|---|---|---|
| `stepbible-data/…/TAGNT *` | Interlineal NT (griego + glosa ES) | CC BY 4.0 |
| `stepbible-data/…/TAHOT *` | Interlineal AT (hebreo) | CC BY 4.0 |
| `stepbible-data/Versification/TVTMS *` | Mapeo de versificación hebrea → estándar | CC BY 4.0 |
| `bible_strong_dictionary` (ya en BD) | Definiciones en español | OpenScriptures, dominio público |
| `mybibletoolbox-data/commentary/**/*-macula.yaml` | Reserva: dominios semánticos Louw-Nida | MIT (datos Clear Bible, CC BY) |

### Fuentes que se descartan

| Fuente | Motivo |
|---|---|
| `strongs-json-sqlite/` | Duplica los datos de OpenScriptures que `scripts/import_strong_dictionary.ts` ya importa. |
| `openscriptures-strongs/` | Ya se descarga en tiempo de ejecución desde GitHub por ese mismo script. |
| `morphgnt-strongs-greek-xml/` | Redundante con TAGNT, que además trae morfología y español. |
| `mybibletoolbox-data/databases/verse-strongs.sqlite` | Solo da la lista ordenada de códigos por versículo, sin anclaje al texto. Insuficiente. |
| `mybibletoolbox-data/commentary/**/*-ebible.yaml` | 3 GB con 949 traducciones por versículo, de las cuales 5 en español, con licencias propias no verificadas. |
| `openscriptures-hebrew-lexicon/`, `bdb-hebrew-lexicon-eliranwong/` | En reserva para una fase posterior de léxico profundo. No entran en este plan. |
| `interlinear-bibledata-tahmmee/` | Sin ventaja sobre TAGNT/TAHOT. |
| `stepbible-data/Lexicons/TBESH`, `TBESG` | **Bloqueo legal**, ver Fase 8. |
| `stepbible-data/Tagged-Bibles/TTESV` | CC BY-**NC**. Fuera si hay componente comercial. |

---

## 3. Fase 0 — Higiene del repositorio

**Objetivo:** que estos 5,3 GB no acaben en git y ocupen lo mínimo en disco.

- [ ] **0.1** Añadir `proximas-integraciones/` a `.gitignore`.
      Hoy aparece como `??` en `git status` y **no está ignorado**
      (`git check-ignore` sale con código 1). Un `git add .` intentaría añadir
      4 GB de datos y convertiría los 8 repos anidados en gitlinks rotos.
- [ ] **0.2** Añadir la excepción para **este mismo fichero**, que sí debe
      versionarse:
      ```gitignore
      proximas-integraciones/
      !proximas-integraciones/PLAN-INTEGRACION.md
      !proximas-integraciones/README.md
      ```
      Sin la negación, el plan queda invisible para git y se pierde el registro
      de avance.
- [ ] **0.3** Reducir `mybibletoolbox-data/` de 4,6 GB a lo necesario con el
      script que el propio repo incluye:
      ```bash
      cd proximas-integraciones/mybibletoolbox-data
      git sparse-checkout init --cone
      git sparse-checkout set databases strongs
      ```
      Solo si se decide usar macula (Fase 6, alternativa B), añadir además los
      libros concretos que hagan falta.
- [ ] **0.4** Revisar si `ejemplos/` (también sin seguimiento) debe ignorarse.

**Criterio de aceptación:** `git status` limpio de estas rutas y
`du -sh proximas-integraciones` por debajo de 1 GB.

---

## 4. Fase 1 — Cimientos

**Objetivo:** las tres piezas de las que depende todo lo demás. Si esto falla,
el interlineal se desalinea en decenas de capítulos y no se nota hasta que un
usuario lo reporta.

### 4.1 Mapeo de libros

- [x] **1.1** Crear `lib/interlinear/book-map.ts` con las 66 abreviaturas de
      STEPBible → `bible_books.idBook`. Reutiliza `BOOK_ABBR_TO_ID` de
      `lib/bible-url.ts` (mismas 66, solo cambia la capitalización).

Las abreviaturas presentes en TAGNT/TAHOT son exactamente 66 y mapean limpiamente
al orden canónico 1–66 que ya usa `bible_books` (verificado: 39 = Malaquías,
40 = Mateo, 43 = Juan, 66 = Apocalipsis).

```
Gen Exo Lev Num Deu Jos Jdg Rut 1Sa 2Sa 1Ki 2Ki 1Ch 2Ch Ezr Neh Est Job Psa
Pro Ecc Sng Isa Jer Lam Ezk Dan Hos Jol Amo Oba Jon Mic Nam Hab Zep Hag Zec Mal
Mat Mrk Luk Jhn Act Rom 1Co 2Co Gal Eph Php Col 1Th 2Th 1Ti 2Ti Tit Phm Heb Jas
1Pe 2Pe 1Jn 2Jn 3Jn Jud Rev
```

- [x] **1.2** Test: las 66 abreviaturas resuelven, ninguna repetida, ninguna
      fuera de 1–66. `npm run check:interlinear`.

### 4.2 Normalizador de códigos Strong

- [x] **1.3** Crear `lib/interlinear/strong-code.ts`.

Cada fuente escribe los códigos distinto y hay que llevarlos todos al formato
de `bible_strong_dictionary`, que es `G1` / `H1` (sin ceros a la izquierda):

| Origen | Ejemplo | Normalizado |
|---|---|---|
| Base de datos actual | `H1`, `G5547` | — (formato destino) |
| TAGNT | `G5547=N-GSM-T` | `G5547` |
| TAGNT (desambiguado) | `G2424G` | `G2424` |
| TAGNT (instancia) | `G5207_A` | `G5207` |
| TAHOT | `H9003/{H7225G}` | `H9003` + `H7225` |
| TAHOT (homónimo) | `{H1254A}` | `H1254` |
| macula | `1722` | `G1722` (según libro) |
| verse-strongs.sqlite | `H0905` | `H905` |

Reglas: quitar llaves, partir por `/` y `\`, quitar el sufijo `_A`/`_B`,
quitar la letra final de desambiguación, quitar ceros a la izquierda.

- [x] **1.4** Test contra la base de datos real.
      **Medido 2026-09-03** (columnas Strong de TAGNT+TAHOT, incluyendo filas
      con paréntesis hebreo): **13.974** códigos distintos; **13.845** resuelven
      contra `bible_dictionary_entries` (slug `strong`) = **99,08 %**.
      Los **129** que no resuelven son todos `H9xxx` / `G6xxx` / `G20447` /
      `G20833` y quedan en `isUnresolvedStrongExpected()`.
      Desviación vs 13.979 / 13.850: cinco códigos menos; el 99,1 % del plan
      era 13.850/13.979. No se forzó el denominador.

### 4.3 Parser de versificación (TVTMS)

- [x] **1.5** Crear `lib/interlinear/versification.ts`.

**Este es el punto que más silenciosamente puede romper todo.** La numeración
hebrea no coincide con la de la RV60: Génesis 31 tiene **54 versículos en TAHOT**
y **55 en la base de datos**; el desfase acumulado en el AT es de ~1.967
versículos (21.178 en TAHOT frente a 23.145 en RV60).

El fichero de mapeo viene incluido en la carpeta:
`stepbible-data/Versification/TVTMS - …CC BY.txt` (29.896 líneas).

- Usar la **sección expandida**, entre `#DataStart(Expanded)` (línea 4181) y
  `#DataEnd(Expanded)` (línea 27570). La sección condensada es para lectura
  humana, no para programar.
- Columnas: `SourceType | SourceRef | StandardRef | Action | NoteMarker | …`
- Filtrar por `SourceType` que contenga `Hebrew` → **5.031 filas** de mapeo.
- Ejemplo verificado: `Hebrew | Gen.32:1 | Gen.31:55 | Renumber verse`.
- Acciones a contemplar: `Renumber verse` (9.785), `Keep verse` (8.383),
  `Renumber verse*` (2.030), `Concatenation` (664), `DividedPrev verse` (589),
  `MergedPrev verse` (404), `IfEmpty verse` (254), `Renumber title` (248).

- [x] **1.6** Test: `Gen.32:1` (hebreo) → `Gen.31:55` (estándar). **Cifras
      2026-09-03:** TAHOT tiene **23.261** versos en numeración NRSV/inglesa
      (títulos como `Psa.3.0`) y **23.145** de ellos existen en RV60
      (`idBible = 149`; la BD tiene **23.146** versos de AT). Los 21.178 del
      plan eran las filas *sin* paréntesis hebreo: el patrón de dato no las
      contaba. TVTMS acuerda el **99,35 %** de los pares hebreo→inglés que
      TAHOT ya trae; hay **58** desacuerdos únicos (p. ej. `1Ki.18:34`,
      títulos de salmo `Psa.11:1` vs `Psa.11:0`). El importador del AT debe
      usar la referencia inglesa de TAHOT, no recomputarla solo con TVTMS.

> **Nota sobre el NT:** TAGNT usa numeración estándar y no necesita mapeo.
> Los 9 versículos de diferencia (7.948 frente a 7.957) son pasajes de crítica
> textual ausentes en los manuscritos (p. ej. Hch 8:37, 1 Jn 5:7b). Es correcto
> que falten; la interfaz debe tolerar un versículo sin interlineal.

---

## 5. Fase 2 — Esquema de base de datos

- [x] **2.1** Crear `scripts/004_interlinear.sql`, siguiendo la convención
      numerada que ya existe en `scripts/`. La app también las crea al arrancar
      (`lib/interlinear/tables.ts`). `strong_raw` quedó en `VARCHAR(80)` (el
      plan decía 40) por tokens TAHOT con varios prefijos. `verse = 0` son
      títulos de salmo.

```sql
CREATE TABLE IF NOT EXISTS bible_interlinear (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  idBook       SMALLINT UNSIGNED NOT NULL,
  chapter      SMALLINT UNSIGNED NOT NULL,
  verse        SMALLINT UNSIGNED NOT NULL,
  position     SMALLINT UNSIGNED NOT NULL,   -- orden de la palabra en el versículo
  original     VARCHAR(120) NOT NULL,        -- griego / hebreo con diacríticos
  transliteration VARCHAR(120)  NULL,
  strong_code  VARCHAR(12)  NULL,            -- normalizado: G5547, H7225
  strong_raw   VARCHAR(80)   NULL,           -- tal cual venía: {H1254A}, G5207_A
  morph        VARCHAR(40)   NULL,           -- N-GSM-T, HVqp3ms
  lemma        VARCHAR(120)  NULL,
  gloss_es     VARCHAR(255)  NULL,           -- solo NT (TAGNT col. 9)
  gloss_en     VARCHAR(255)  NULL,
  language     ENUM('grc','heb','arc') NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_word (idBook, chapter, verse, position),
  KEY idx_passage (idBook, chapter, verse),
  KEY idx_strong (strong_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Partículas hebreas H9xxx que Strong no cubre (ver Fase 6)
CREATE TABLE IF NOT EXISTS bible_strong_particles (
  strong_code  VARCHAR(12) NOT NULL,
  gloss_en     VARCHAR(120) NOT NULL,
  gloss_es     VARCHAR(120) NOT NULL,
  description_es TEXT NULL,
  PRIMARY KEY (strong_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- [x] **2.2** Dimensionado medido 2026-09-03: `bible_verses` tiene **186.672**
      filas y **36,9 MB**. Tablas nuevas creadas vacías en `bibliadb`. El disco
      del servidor tiene ~1,4 TB libres; 100–150 MB no son un problema. No se
      cargan filas hasta las Fases 3 y 6.
- [x] **2.3** `bible_bibles.fuertes` confirmado: `TINYINT(1)`, las 6 biblias en
      `0` o `NULL`. Se expone como `hasInterlinear` en `BibleVersion` (catálogo
      y `listBibles`). **No se pone a 1** hasta que haya datos cargados.

---

## 6. Fase 3 — Importador del Nuevo Testamento (TAGNT)

**Objetivo:** la fase de mayor retorno. Es donde el español viene regalado.

- [x] **3.1** Crear `scripts/import_interlinear_gnt.ts` y el parser
      `lib/interlinear/tagnt.ts`. Upsert por lotes de 500, `--fresh` / `--dry-run`.
      `npm run import:interlinear-gnt`.

Ficheros de origen (2, por límite de tamaño de GitHub):
```
stepbible-data/Translators Amalgamated OT+NT/TAGNT Mat-Jhn - … CC-BY.txt
stepbible-data/Translators Amalgamated OT+NT/TAGNT Act-Rev - … CC-BY.txt
```

Las filas de datos son las que casan con `^[A-Za-z0-9]+\.[0-9]+\.[0-9]+#[0-9]+`
(el resto son cabeceras y notas). Separador: tabulador.

Columnas verificadas sobre `Mat.1.1#04`:

| Col | Contenido | Ejemplo |
|---|---|---|
| 1 | Referencia + ediciones | `Mat.1.1#04=NKO` |
| 2 | Griego + transliteración | `Χριστοῦ (Christou)` |
| 3 | Glosa inglesa | `Christ` |
| 4 | Strong extendido `=` morfología | `G5547=N-GSM-T` |
| 5 | Forma de diccionario `=` significado | `Χριστός=Christ` |
| 6 | Ediciones que lo contienen | `NA28+NA27+Tyn+SBL+…` |
| 8 | Nota de variante textual | `Tyn: Ἁβραάμ ;` |
| **9** | **Glosa española** | `Ungido` |
| 10 | Sub-significado / entidad | `Christ»Christ\|Jesus@Mat.1.1` |
| 11 | Posición | `#04` |
| 12 | Strong simple + instancia | `G5547`, `G5207_A` |

- [x] **3.2** **Decisión:** no se descarta ninguna fila. Las variantes `=K` /
      `=O` **no comparten `position`** con la lectura NA: son palabras extra
      (Hch 8:37, Mc 16:9-20, Jn 8:1-11…). Cargarlas cubre la RV60 (tradición
      TR). `strong_raw` guarda el Strong de la columna 12, no la variante.
- [x] **3.3** Cargar por lotes (`CHUNK_SIZE = 500`). Hecho 2026-09-03.
- [x] **3.4** Validación 2026-09-03:
      - **141.746** palabras (las 141.720 del plan + 26 filas con paréntesis
        hebreo/NA en la referencia, que el patrón original no contaba).
      - **7.949** versículos (7948 + 1).
      - **141.120 / 141.746 (99,56 %)** resuelven Strong. El 99,74 % del plan
        era sobre 141.720 sin las extra TR/`G6xxx`. Los que no resuelven son
        `G6xxx`, `G20447` y 254 filas sin código.
      - Cero `gloss_es` vacía.
      - Mt 1:1 y Jn 1:1 cuadran con el fichero (Βίβλος/Libro, Ἐν/En, λόγος/Palabra).

---

## 7. Fase 4 — API

- [ ] **4.1** Crear `app/api/interlinear/route.ts`, siguiendo el patrón de
      `app/api/dictionary/route.ts`.
      - Parámetros: `book`, `chapter`, y `verse` opcional.
      - Devuelve las palabras del capítulo o del versículo, con la definición
        española del Strong resuelta por `JOIN`.
      - Cabeceras de caché igual que el diccionario: los datos no cambian nunca.
        `public, max-age=3600, stale-while-revalidate=86400` o más agresivo.
- [ ] **4.2** Endpoint o parámetro para saber **qué pasajes tienen interlineal**,
      de modo que la interfaz no ofrezca el botón donde no hay datos.
- [ ] **4.3** Medir el tamaño de la respuesta de un capítulo largo
      (Salmo 119: 176 versículos; Mt 1) y paginar o comprimir si hace falta.

---

## 8. Fase 5 — Interfaz del lector

- [ ] **5.1** Crear `components/bible-reader/interlinear-panel.tsx`.

Reutilizar el patrón de `components/bible-reader/verse-commentary.tsx`, que ya
resuelve este problema: bloque plegado por defecto bajo el versículo, que solo
procesa y pinta su contenido al abrirse. El comentario de ese fichero lo explica
bien — el lector es para leer la Biblia, y un panel abierto en cada versículo
entierra el texto.

- [ ] **5.2** Cada palabra es pulsable → abre la ficha Strong. Reaprovechar
      `components/strong-dictionary.tsx`, que ya sabe pintar una entrada.
- [ ] **5.3** Fuentes: el hebreo necesita tipografía con diacríticos correctos.
      La carpeta `bdb-hebrew-lexicon-eliranwong/` incluye `sileot.ttf` y
      `sileotsr.ttf` (SIL Ezra, licencia OFL) por si las del sistema fallan.
- [ ] **5.4** Dirección del texto: el hebreo es RTL. Verificar que no rompe el
      layout del lector ni el modo párrafos.
- [ ] **5.5** No tocar `verse-text.tsx` para hacer clicables las palabras del
      texto español: no hay alineación posible (ver §1). El interlineal es un
      panel aparte.
- [ ] **5.6** Activar el botón solo cuando `bible_bibles.fuertes = 1`.

---

## 9. Fase 6 — Importador del Antiguo Testamento (TAHOT)

**Objetivo:** cerrar el AT. Más trabajo que el NT porque **no hay columna
española**.

- [ ] **6.1** Crear `scripts/import_interlinear_hot.ts`.

Ficheros de origen (4): `TAHOT Gen-Deu`, `TAHOT Jos-Est`, `TAHOT Job-Sng`,
`TAHOT Isa-Mal`. Cubren los 39 libros. La columna 1 ya viene en numeración
NRSV/inglesa (`Gen.31.55(32.1)`); el hebreo es el paréntesis. Usar
`parseTahotHeadRef`. Títulos de salmo: verso `0` (`Psa.3.0`). TVTMS solo como
comprobación o para fuentes que no traigan el par.

Columnas verificadas sobre `Gen.1.1#01` — **ojo, no son las mismas que TAGNT**:

| Col | Contenido | Ejemplo |
|---|---|---|
| 1 | Referencia | `Gen.1.1#01=L` |
| 2 | Hebreo (`/` separa prefijos) | `בְּ/רֵאשִׁ֖ית` |
| 3 | Transliteración | `be./re.Shit` |
| 4 | **Glosa inglesa** | `in/ beginning` |
| 5 | Strong extendido | `H9003/{H7225G}` |
| 6 | Morfología | `HR/Ncfsa` |
| 9 | Strong simple | `H7225G` |
| 12 | Glosas embebidas | `H9003=ב=in/{H7225G=רֵאשִׁית=: beginning»first}` |

- [ ] **6.2** **Las 49 partículas hebreas.** Solo el 61,57 % de las 283.734
      palabras del AT enlaza con una entrada Strong; el **38,43 % restante son
      códigos `H9xxx`** (prefijos, sufijos, pronombres enclíticos, puntuación)
      que Strong nunca cubrió.

      Son **únicamente 49 códigos distintos**, y sus glosas vienen embebidas en
      la columna 12 del propio fichero (CC BY, sin problema de licencia):

      ```
      H9001 &      H9002 and    H9003 in    H9004 like   H9005 to
      H9006 from   H9007 which  H9008 ¿     H9009 the    H9010 the
      H9011 to     H9012 emph.  H9013 emph. H9014 link   …
      ```

      Traducirlas a mano a español y cargarlas en `bible_strong_particles`.
      Es trabajo de una tarde y **sube la cobertura del AT de 61,57 % a ~100 %**.
      No usar TBESH para esto (ver Fase 8).

- [ ] **6.3** Glosas españolas de las palabras léxicas. Tres opciones, decidir
      y anotar cuál se toma:
      - **A (recomendada):** no traducir la glosa; mostrar la glosa inglesa como
        apoyo y apoyarse en la `definition_es` del Strong, que ya está al 100 %.
      - **B:** traducir las glosas con LibreTranslate, reutilizando el patrón de
        `scripts/translate_dictionary.ts`. Riesgo alto: una glosa es una palabra
        suelta sin contexto y la traducción automática se equivoca mucho.
      - **C:** usar los ficheros `*-macula.yaml` de `mybibletoolbox-data`, que
        traen dominios semánticos Louw-Nida; sigue siendo inglés, pero con
        desambiguación mejor.
- [ ] **6.4** Validación post-carga:
      - 283.734 palabras (menos lo que se decida filtrar).
      - Versículos alineados tras el mapeo de versificación: **anotar la cifra**
        y comparar con los 23.145 del AT en RV60.
      - Prueba manual: Gn 1:1, Sal 23:1 y **Gn 31:54 / 32:1** (el caso límite de
        versificación).

---

## 10. Fase 7 — Cierres

### 10.1 Móvil y descarga offline

- [ ] **7.1** El export offline actual (`/api/dictionary?export`) pagina de
      2.000 en 2.000. Con 425.454 filas serían **213 páginas**: no sirve tal
      cual. Definir estrategia: descarga por libro, bajo demanda, o directamente
      no ofrecer el interlineal sin conexión.

### 10.2 Licencias y atribución

- [ ] **7.2** Añadir la atribución de STEPBible donde corresponda
      (`app/terminos`, `components/legal/legal-footer.tsx`, o la ficha de
      licencias que ya alimenta `bible_licenses`):

      > Datos interlineales de STEPBible.org, basados en el trabajo de
      > Tyndale House Cambridge (CC BY 4.0).

- [ ] **7.3** **No integrar TBESH ni TBESG.** Sus definiciones proceden del BDB
      Abreviado © Larry Pierce / OnlineBible.net, y el propio fichero advierte:
      *"Permission should be gained from Online Bible before these definitions
      are applied in any project"*. No hacen falta: TAGNT/TAHOT ya traen glosa y
      el diccionario Strong ya está en español.
- [ ] **7.4** **No integrar TTESV** (ESV etiquetado, 114 MB): es CC BY-**NC** y
      queda fuera si la aplicación tiene cualquier componente comercial.
- [ ] **7.5** STEPBible pide *"please do not redistribute it yourself"*: se
      pueden usar los datos en la aplicación, pero **no re-servir los ficheros
      crudos** desde un endpoint público.

---

## 11. Estado por fases

| Fase | Descripción | Estado | Cerrada el |
|---|---|---|---|
| 0 | Higiene del repositorio | `parcial` (`.gitignore` ya ignora datos; 0.2 excepciones de los `.md` hechas 2026-09-03) | — |
| 1 | Cimientos (libros, códigos, versificación) | `cerrada` | 2026-09-03 |
| 2 | Esquema de base de datos | `cerrada` | 2026-09-03 |
| 3 | Importador NT (TAGNT) | `cerrada` | 2026-09-03 |
| 4 | API | `pendiente` | — |
| 5 | Interfaz del lector | `pendiente` | — |
| 6 | Importador AT (TAHOT) | `pendiente` | — |
| 7 | Cierres (offline, licencias) | `pendiente` | — |

---

## 12. Bitácora de avance

Una entrada por sesión de trabajo. Añadir al final, sin borrar lo anterior.

| Fecha | Quién | Fase / tarea | Qué se hizo | Desviaciones |
|---|---|---|---|---|
| 2026-09-01 | — | — | Redacción del plan. Cifras medidas sobre los datos y la BD reales. | — |
| 2026-09-03 | Brothers / agente | Fase 1 | `lib/interlinear/*`: mapa de libros, normalizador Strong, TVTMS, `parseTahotHeadRef`, `npm run check:interlinear`. Excepciones de `.gitignore` para este plan y el README. | TAHOT ya viene en numeración NRSV (hebreo entre paréntesis). 21.178 era un recuento incompleto. Strong: 13.974 / 13.845 / 129. RV60 AT: 23.146. TVTMS vs TAHOT: 58 desacuerdos únicos. |
| 2026-09-03 | Brothers / agente | Fase 2 | `scripts/004_interlinear.sql` + `ensureInterlinearTables`. Tablas creadas vacías. `hasInterlinear` desde `fuertes`. | `strong_raw` VARCHAR(80). `fuertes` sigue en 0. |
| 2026-09-03 | Brothers / agente | Fase 3 | Parser TAGNT + importador. Carga real: 141.746 palabras / 7.949 versos / 99,56 % Strong / 0 glosas vacías. | No se filtran K/O: cada una tiene su `position`. `fuertes` sigue en 0. |

---

## 13. Riesgos y decisiones abiertas

| # | Asunto | Estado |
|---|---|---|
| R1 | La versificación es el punto de fallo silencioso: se desalinea sin dar error. Debe cerrarse **antes** de cargar el AT. | mitigado: TAHOT trae la ref inglesa; TVTMS queda como comprobación (99,35 %). Importar la columna 1 principal, no recomputar. |
| R2 | Filtrado de variantes textuales en TAGNT (tarea 3.2): sin decidir si se guardan o se descartan. | cerrado: se cargan todas; no hay colisión de `position`. |
| R3 | Glosas españolas del AT (tarea 6.3): sin elegir opción A, B o C. | abierto |
| R4 | Interlineal sin conexión (tarea 7.1): sin estrategia. | abierto |
| R5 | ¿La aplicación tiene componente comercial? Determina si TTESV queda descartada de forma definitiva. | abierto |
| R6 | Léxicos profundos (BDB completo, `openscriptures-hebrew-lexicon`) quedan fuera de este plan; valorar como fase 8 futura. | aplazado |
