import type { RowDataPacket } from "mysql2/promise"

import { getSession } from "@/lib/auth"
import { getPool } from "@/lib/mysql"
import type { BibleVersion } from "@/lib/types"

export type BibleCapability =
  | "canRead"
  | "canDownload"
  | "canCopy"
  | "canShare"
  | "canCreateImages"
  | "canUseAudio"

interface BibleCatalogRow extends RowDataPacket {
  bibleId: number
  abbr: string
  name: string
  license: string | null
  copyright: string | null
  attribution: string | null
  sourceUrl: string | null
  catalogScope: "public" | "internal" | null
  status: "active" | "disabled" | "revoked" | null
  canRead: number | null
  canDownload: number | null
  canCopy: number | null
  canShare: number | null
  canCreateImages: number | null
  canUseAudio: number | null
  cacheMaxAgeDays: number | null
}

interface EntitlementRow extends RowDataPacket {
  allowed: number
}

export class BibleAccessError extends Error {
  status: number

  constructor(message: string, status = 403) {
    super(message)
    this.name = "BibleAccessError"
    this.status = status
  }
}

function privilegedRoles(): Set<string> {
  return new Set(
    (process.env.INTERNAL_BIBLE_ROLES ?? "admin")
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean),
  )
}

async function hasEntitlement(userId: number, bibleId: number): Promise<boolean> {
  try {
    const [rows] = await getPool().query<EntitlementRow[]>(
      `SELECT 1 AS allowed
       FROM user_bible_entitlements
       WHERE user_id = ? AND bible_id = ?
         AND (expires_at IS NULL OR expires_at > NOW())
       LIMIT 1`,
      [userId, bibleId],
    )
    return rows.length > 0
  } catch {
    return false
  }
}

async function catalogRows(): Promise<BibleCatalogRow[]> {
  try {
    const [rows] = await getPool().query<BibleCatalogRow[]>(
      `SELECT b.idBible AS bibleId, b.abreviation AS abbr, b.name,
              l.license_name AS license, l.copyright_notice AS copyright,
              l.attribution_text AS attribution, l.source_url AS sourceUrl,
              l.catalog_scope AS catalogScope, l.status,
              l.can_read AS canRead, l.can_download AS canDownload,
              l.can_copy AS canCopy, l.can_share AS canShare,
              l.can_create_images AS canCreateImages,
              l.can_use_audio AS canUseAudio,
              l.cache_max_age_days AS cacheMaxAgeDays
       FROM bible_bibles b
       LEFT JOIN bible_licenses l ON l.bible_id = b.idBible
       ORDER BY b.idBible`,
    )
    return rows
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.error("No se pudo cargar bible_licenses; se cierra el catálogo por seguridad.", error)
      return []
    }
    const [rows] = await getPool().query<BibleCatalogRow[]>(
      `SELECT idBible AS bibleId, abreviation AS abbr, name
       FROM bible_bibles ORDER BY idBible`,
    )
    return rows
  }
}

function toBible(row: BibleCatalogRow): BibleVersion {
  const legacyDevelopmentRow = row.catalogScope == null && process.env.NODE_ENV !== "production"
  return {
    bibleId: Number(row.bibleId),
    abbr: row.abbr,
    name: row.name,
    license: row.license,
    copyright: row.copyright,
    attribution: row.attribution,
    sourceUrl: row.sourceUrl,
    catalogScope: row.catalogScope ?? "internal",
    canRead: legacyDevelopmentRow || row.canRead === 1,
    canDownload: legacyDevelopmentRow || row.canDownload === 1,
    canCopy: legacyDevelopmentRow || row.canCopy === 1,
    canShare: legacyDevelopmentRow || row.canShare === 1,
    canCreateImages: legacyDevelopmentRow || row.canCreateImages === 1,
    canUseAudio: legacyDevelopmentRow || row.canUseAudio === 1,
    cacheMaxAgeDays: row.cacheMaxAgeDays == null ? null : Number(row.cacheMaxAgeDays),
  }
}

export async function listAccessibleBibles(req: Request): Promise<BibleVersion[]> {
  const session = getSession(req)
  const roles = privilegedRoles()
  const rows = await catalogRows()
  const result: BibleVersion[] = []

  for (const row of rows) {
    if (row.status && row.status !== "active") continue
    const bible = toBible(row)
    if (!bible.canRead) continue

    if (row.catalogScope === "internal") {
      if (!session) continue
      const allowed = roles.has(session.role) || (await hasEntitlement(session.userId, bible.bibleId))
      if (!allowed) continue
    } else if (row.catalogScope == null && process.env.NODE_ENV === "production") {
      continue
    }

    result.push(bible)
  }

  return result
}

export async function assertBibleAccess(
  req: Request,
  bibleId: number,
  capability: BibleCapability = "canRead",
): Promise<BibleVersion> {
  const bible = (await listAccessibleBibles(req)).find((item) => item.bibleId === bibleId)
  if (!bible) throw new BibleAccessError("Esta versión bíblica no está disponible.", 404)
  if (bible[capability] !== true) {
    throw new BibleAccessError("La licencia de esta versión no permite esta acción.")
  }
  return bible
}

export function bibleAccessStatus(error: unknown): number {
  return error instanceof BibleAccessError ? error.status : 500
}
