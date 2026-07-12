import { existsSync } from "fs"
import { readdir, stat } from "fs/promises"
import { join } from "path"

const RELEASES_DIR = join(process.cwd(), "mobile", "releases")
const APK_PATTERN = /^BibliaAPP-(.+)-release\.apk$/i

export type MobileRelease = {
  version: string
  filename: string
  size: number
  updatedAt: string
}

function parseVersionParts(version: string): number[] {
  return version.split(".").map((part) => parseInt(part, 10) || 0)
}

function compareVersionParts(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

export async function getLatestMobileRelease(): Promise<MobileRelease | null> {
  if (!existsSync(RELEASES_DIR)) return null

  const files = await readdir(RELEASES_DIR)
  let latest: { version: string; filename: string } | null = null

  for (const file of files) {
    const match = file.match(APK_PATTERN)
    if (!match) continue
    const version = match[1]
    if (
      !latest ||
      compareVersionParts(parseVersionParts(version), parseVersionParts(latest.version)) > 0
    ) {
      latest = { version, filename: file }
    }
  }

  if (!latest) return null

  const filepath = join(RELEASES_DIR, latest.filename)
  const info = await stat(filepath)

  return {
    version: latest.version,
    filename: latest.filename,
    size: info.size,
    updatedAt: info.mtime.toISOString(),
  }
}

export function getMobileReleasePath(filename: string): string | null {
  if (filename.includes("..") || filename.includes("/")) return null
  if (!APK_PATTERN.test(filename)) return null
  const filepath = join(RELEASES_DIR, filename)
  return existsSync(filepath) ? filepath : null
}

// ponytail: self-check — falla si el comparador de versiones se rompe
if (process.env.NODE_ENV !== "production") {
  const ok =
    compareVersionParts(parseVersionParts("3.4"), parseVersionParts("3.3")) > 0 &&
    compareVersionParts(parseVersionParts("2.0.10"), parseVersionParts("2.0.9")) > 0
  if (!ok) throw new Error("mobile-release version compare broken")
}
