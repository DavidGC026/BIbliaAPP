import type { AppSectionDefinition } from "@/lib/app-sections"

/**
 * Catálogo de metadatos (server-safe): permisos, invitados, labels, grupos.
 *
 * Para añadir una sección nueva:
 * 1. Agrega su entrada aquí en APP_SECTION_CATALOG.
 * 2. Registra icono + componente en sections.client.tsx con registerAppSectionComplete().
 *
 * Guía completa: docs/nuevas-secciones.md
 */
export const APP_SECTION_CATALOG: AppSectionDefinition[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    navLabel: "Dashboard",
    groupId: "PRINCIPAL",
    groupLabel: "Principal",
    guestAccess: true,
    defaultForReader: true,
  },
  {
    id: "reading",
    label: "Leer (Biblia)",
    navLabel: "Leer",
    groupId: "PRINCIPAL",
    groupLabel: "Principal",
    guestAccess: true,
    defaultForReader: true,
  },
  {
    id: "feed",
    label: "Comunidad",
    navLabel: "Comunidad",
    groupId: "PRINCIPAL",
    groupLabel: "Principal",
    defaultForReader: true,
    loginPrompt: {
      title: "Comunidad",
      description: "Inicia sesión para ver publicaciones, comentar y conectar con otros lectores.",
    },
  },
  {
    id: "search",
    label: "Búsqueda",
    navLabel: "Búsqueda",
    groupId: "ESTUDIO",
    groupLabel: "Estudio bíblico",
    guestAccess: true,
    defaultForReader: true,
  },
  {
    id: "references",
    label: "Referencias",
    navLabel: "Referencias",
    groupId: "ESTUDIO",
    groupLabel: "Estudio bíblico",
    guestAccess: true,
    defaultForReader: true,
  },
  {
    id: "library",
    label: "Libros",
    navLabel: "Libros",
    groupId: "PERSONAL",
    groupLabel: "Personal",
    defaultForReader: true,
    loginPrompt: {
      title: "Biblioteca personal",
      description: "Guarda y organiza tus libros y recursos de estudio con una cuenta.",
    },
  },
  {
    id: "notebook",
    label: "Notas / Libreta",
    navLabel: "Notas",
    groupId: "PERSONAL",
    groupLabel: "Personal",
    defaultForReader: true,
    loginPrompt: {
      title: "Notas y libretas",
      description: "Crea notas vinculadas a versículos y organiza tus cuadernos de estudio.",
    },
  },
  {
    id: "profile",
    label: "Perfil",
    navLabel: "Perfil",
    groupId: "PERSONAL",
    groupLabel: "Personal",
    defaultForReader: true,
    loginPrompt: {
      title: "Tu perfil",
      description: "Personaliza tu perfil, apodo y preferencias de estudio.",
    },
  },
  {
    id: "favorites",
    label: "Favoritos",
    navLabel: "Favoritos",
    groupId: "PERSONAL",
    groupLabel: "Personal",
    defaultForReader: true,
    loginPrompt: {
      title: "Favoritos",
      description: "Marca versículos como favoritos para acceder a ellos rápidamente.",
    },
  },
  {
    id: "highlights",
    label: "Subrayados",
    navLabel: "Subrayados",
    groupId: "PERSONAL",
    groupLabel: "Personal",
    defaultForReader: true,
    loginPrompt: {
      title: "Subrayados",
      description: "Resalta pasajes con colores y revísalos cuando quieras.",
    },
  },
  {
    id: "plans",
    label: "Planes de lectura",
    navLabel: "Planes",
    groupId: "PERSONAL",
    groupLabel: "Personal",
    defaultForReader: true,
    loginPrompt: {
      title: "Planes de lectura",
      description: "Sigue planes de lectura y registra tu progreso diario.",
    },
  },
  {
    id: "prayers",
    label: "Oración",
    navLabel: "Oración",
    groupId: "ESPIRITUAL",
    groupLabel: "Vida espiritual",
    loginPrompt: {
      title: "Peticiones de oración",
      description: "Comparte y acompaña peticiones de oración con la comunidad.",
    },
  },
  {
    id: "devotionals",
    label: "Diario devocional",
    navLabel: "Diario",
    groupId: "ESPIRITUAL",
    groupLabel: "Vida espiritual",
    defaultForReader: true,
    loginPrompt: {
      title: "Diario devocional",
      description: "Escribe y guarda tus reflexiones espirituales personales.",
    },
  },
  {
    id: "groups",
    label: "Grupos",
    navLabel: "Grupos",
    groupId: "ESPIRITUAL",
    groupLabel: "Vida espiritual",
    loginPrompt: {
      title: "Grupos",
      description: "Únete a grupos de estudio y crece junto a otros.",
    },
  },
  {
    id: "activity",
    label: "Actividad",
    navLabel: "Actividad",
    groupId: "GENERAL",
    groupLabel: "General",
    loginPrompt: {
      title: "Actividad",
      description: "Consulta tu historial de lectura y actividad en la app.",
    },
  },
  {
    id: "statistics",
    label: "Estadísticas",
    navLabel: "Estadísticas",
    groupId: "GENERAL",
    groupLabel: "General",
    loginPrompt: {
      title: "Estadísticas",
      description: "Visualiza tus hábitos de lectura y progreso espiritual.",
    },
  },
  {
    id: "users",
    label: "Gestión de usuarios",
    navLabel: "Usuarios",
    groupId: "GENERAL",
    groupLabel: "General",
    adminOnly: true,
    loginPrompt: {
      title: "Gestión de usuarios",
      description: "Panel de administración de usuarios.",
    },
  },
]

export type AppSectionId = (typeof APP_SECTION_CATALOG)[number]["id"]
