/** Utilidades de invitación a grupos (seguras en cliente y servidor). */

export const GROUP_JOIN_PARAM = "joinGroup"

export function buildGroupJoinUrl(inviteCode: string, origin?: string): string {
  const base =
    origin ||
    (typeof window !== "undefined" ? window.location.origin : "") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://biblia2.dvguzman.com"
  const params = new URLSearchParams()
  params.set(GROUP_JOIN_PARAM, inviteCode.trim().toUpperCase())
  return `${base.replace(/\/$/, "")}/?${params.toString()}`
}

export function getGroupJoinCodeFromSearch(search: string): string | null {
  const code = new URLSearchParams(search).get(GROUP_JOIN_PARAM)?.trim().toUpperCase()
  if (!code || !/^[A-F0-9]{8}$/.test(code)) return null
  return code
}

export function buildGroupQrImageUrl(inviteUrl: string, size = 240): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(inviteUrl)}`
}

const PENDING_JOIN_KEY = "biblia_pending_group_join"

export function savePendingGroupJoin(code: string) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(PENDING_JOIN_KEY, code.toUpperCase())
}

export function loadPendingGroupJoin(): string | null {
  if (typeof window === "undefined") return null
  const fromUrl = getGroupJoinCodeFromSearch(window.location.search)
  if (fromUrl) {
    savePendingGroupJoin(fromUrl)
    return fromUrl
  }
  const stored = sessionStorage.getItem(PENDING_JOIN_KEY)
  return stored && /^[A-F0-9]{8}$/.test(stored) ? stored : null
}

export function clearPendingGroupJoin() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(PENDING_JOIN_KEY)
  const url = new URL(window.location.href)
  if (url.searchParams.has(GROUP_JOIN_PARAM)) {
    url.searchParams.delete(GROUP_JOIN_PARAM)
    window.history.replaceState({}, "", url.pathname + (url.search || ""))
  }
}
