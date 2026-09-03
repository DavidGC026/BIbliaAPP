import type { AppIconComponent } from "@/components/ui/app-icon"

export interface AppNavItem {
  id: string
  label: string
  icon: AppIconComponent
  groupId: string
  groupLabel: string
}
