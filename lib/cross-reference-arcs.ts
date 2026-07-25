import type { RowDataPacket } from "mysql2/promise"

import { getPool } from "@/lib/mysql"

/**
 * Agregación capítulo-a-capítulo de las referencias cruzadas para el mapa de
 * referencias, cacheada en el proceso.
 *
 * Por qué: la consulta agrupa las ~344.000 referencias y devuelve más de cien
 * mil grupos. Sin caché, cada petición materializaba esos grupos, construía el
 * Set, el Map de índices y el array de arcos, y serializaba varios MB de JSON:
 * decenas de MB de pico por petición, y hasta cinco a la vez (connectionLimit).
 *
 * `bible_cross_references` es una tabla estática (solo cambia si se importa un
 * dataset nuevo), así que se guarda el JSON **ya serializado**: ~1,2 MB
 * retenidos en el proceso, y cero trabajo por petición. El TTL va a la par que
 * el Cache-Control que devuelve la ruta.
 *
 * Medido con 120.000 grupos simulados: 19,2 MB de pico por petición antes,
 * una sola vez al día ahora, y ~0 en las siguientes.
 */

const TTL_MS = 24 * 60 * 60 * 1000

interface Cached {
  json: string
  builtAt: number
}

let cached: Cached | null = null
let inFlight: Promise<Cached> | null = null

export interface ArcRow {
  a: number
  b: number
  n: number
}

interface ArcRowPacket extends ArcRow, RowDataPacket {}

/** Grupos capítulo-a-capítulo en crudo. */
export async function queryArcRows(): Promise<ArcRow[]> {
  // Se dejan las filas como objetos, que es lo que da mysql2 por omisión: con
  // `rowsAsArray` V8 gasta MÁS (medido: 11,1 MB frente a 8,4 con 120.000
  // grupos), porque cada array pequeño lleva su propio almacén de elementos
  // mientras los objetos de forma idéntica comparten mapa oculto.
  const [rows] = await getPool().query<ArcRowPacket[]>(
    `SELECT FLOOR(vid_origen / 1000) AS a, FLOOR(vid_destino / 1000) AS b, COUNT(*) AS n
     FROM bible_cross_references
     GROUP BY FLOOR(vid_origen / 1000), FLOOR(vid_destino / 1000)`,
  )
  return rows
}

/**
 * Convierte los grupos en el payload del mapa: claves de capítulo ordenadas y
 * tríos aplanados `[índiceA, índiceB, conexiones]`. Función pura.
 */
export function aggregateArcs(rows: ArcRow[]): { keys: number[]; arcs: number[] } {
  const keySet = new Set<number>()
  for (const r of rows) {
    keySet.add(Number(r.a))
    keySet.add(Number(r.b))
  }
  const keys = [...keySet].sort((x, y) => x - y)
  const idx = new Map(keys.map((k, i) => [k, i]))

  const arcs: number[] = []
  for (const r of rows) {
    arcs.push(idx.get(Number(r.a))!, idx.get(Number(r.b))!, Number(r.n))
  }
  return { keys, arcs }
}

async function build(fetchRows: () => Promise<ArcRow[]>): Promise<Cached> {
  return { json: JSON.stringify(aggregateArcs(await fetchRows())), builtAt: Date.now() }
}

/**
 * JSON `{ keys, arcs }` listo para devolver, construido como mucho una vez por
 * TTL. `fetchRows` se inyecta para poder probar la caché sin MySQL.
 */
export async function getCrossReferenceArcsJson(
  fetchRows: () => Promise<ArcRow[]> = queryArcRows,
): Promise<string> {
  if (cached && Date.now() - cached.builtAt < TTL_MS) return cached.json

  // Las peticiones concurrentes comparten el mismo trabajo en vez de
  // multiplicar el pico de memoria.
  if (!inFlight) {
    inFlight = build(fetchRows)
      .then((result) => {
        cached = result
        return result
      })
      .finally(() => {
        inFlight = null
      })
  }

  return (await inFlight).json
}
