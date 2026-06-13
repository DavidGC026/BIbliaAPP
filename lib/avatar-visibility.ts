export type AvatarVisibility = "private" | "friends" | "church" | "groups" | "public"

export const AVATAR_VISIBILITY_LABELS: Record<AvatarVisibility, string> = {
  private: "Solo yo",
  friends: "Amigos",
  church: "Iglesia",
  groups: "Grupos",
  public: "Público",
}

export const AVATAR_VISIBILITY_DESCRIPTIONS: Record<AvatarVisibility, string> = {
  private: "Nadie más puede ver tu foto de perfil.",
  friends: "Solo tus amigos aceptados pueden verla.",
  church: "Miembros de la congregación oficial pueden verla.",
  groups: "Personas que comparten al menos un grupo contigo.",
  public: "Cualquier usuario con cuenta puede verla.",
}
