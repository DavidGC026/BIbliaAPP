import { existsSync, readdirSync } from "node:fs"
import path from "node:path"

const DATA_ROOT = path.join(process.cwd(), "proximas-integraciones", "stepbible-data")

function firstMatch(dir: string, prefix: string): string | null {
  if (!existsSync(dir)) return null
  const name = readdirSync(dir).find((entry) => entry.startsWith(prefix) && entry.endsWith(".txt"))
  return name ? path.join(dir, name) : null
}

export function stepbibleDataRoot(): string {
  return DATA_ROOT
}

export function tvtmsFilePath(): string | null {
  return firstMatch(path.join(DATA_ROOT, "Versification"), "TVTMS")
}

export function tagntFilePaths(): string[] {
  const dir = path.join(DATA_ROOT, "Translators Amalgamated OT+NT")
  return ["TAGNT Mat-Jhn", "TAGNT Act-Rev"]
    .map((prefix) => firstMatch(dir, prefix))
    .filter((file): file is string => Boolean(file))
}

export function tahotFilePaths(): string[] {
  const dir = path.join(DATA_ROOT, "Translators Amalgamated OT+NT")
  return ["TAHOT Gen-Deu", "TAHOT Jos-Est", "TAHOT Job-Sng", "TAHOT Isa-Mal"]
    .map((prefix) => firstMatch(dir, prefix))
    .filter((file): file is string => Boolean(file))
}

export function taggedWordRowPattern(): RegExp {
  return /^[A-Za-z0-9]+\.[0-9]+\.[0-9]+(?:\([^)]+\))?#[0-9]+/
}
