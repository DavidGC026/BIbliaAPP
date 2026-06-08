export { AppSectionOutlet } from "./outlet"
export { buildAppNavItems, getNavGroupOrder } from "./nav.client"
export type { AppNavItem } from "./types-nav"
export { registerAppSectionComplete } from "./store"
export type { CompleteAppSectionConfig, SectionRenderContext } from "./types"

// Registra iconos y componentes (side effect)
import "./sections.client"
