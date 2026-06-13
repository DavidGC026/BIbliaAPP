export const GROUP_ROLES = ["admin", "lider", "maestro", "congregante"] as const
export type GroupRole = (typeof GROUP_ROLES)[number]

export const GROUP_ROLE_LABELS: Record<GroupRole, string> = {
  admin: "Administrador",
  lider: "Líder",
  maestro: "Maestro",
  congregante: "Congregante",
}

export function normalizeGroupRole(role: string): GroupRole {
  if (role === "member") return "congregante"
  if ((GROUP_ROLES as readonly string[]).includes(role)) return role as GroupRole
  return "congregante"
}

export function getGroupRoleLabel(role: string): string {
  return GROUP_ROLE_LABELS[normalizeGroupRole(role)]
}

export function isGroupAdmin(role: string): boolean {
  return normalizeGroupRole(role) === "admin"
}

export function isValidGroupRole(role: string): role is GroupRole {
  return (GROUP_ROLES as readonly string[]).includes(role)
}
