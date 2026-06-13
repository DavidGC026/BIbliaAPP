"use client"

import { Users, Church } from "lucide-react"
import { cn } from "@/lib/utils"

interface GroupVisualProps {
  name: string
  coverImage?: string | null
  avatarImage?: string | null
  churchLogoUrl?: string | null
  isOfficialChurch?: boolean
  variant?: "card" | "hero"
  className?: string
}

export function GroupVisual({
  name,
  coverImage,
  avatarImage,
  churchLogoUrl,
  isOfficialChurch,
  variant = "card",
  className,
}: GroupVisualProps) {
  const coverH = variant === "hero" ? "h-40 md:h-52" : "h-28"
  const avatarSize = variant === "hero" ? "size-24 md:size-28" : "size-16"
  const avatarOffset = variant === "hero" ? "-mt-12 md:-mt-14" : "-mt-8"

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-blue-600/80 via-primary/40 to-indigo-500/30",
          coverH,
        )}
      >
        {coverImage ? (
          <img src={coverImage} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <Users className={variant === "hero" ? "size-20" : "size-12"} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        {isOfficialChurch && churchLogoUrl && (
          <div className="absolute top-3 right-3 size-8 rounded-full bg-background/90 border border-border shadow-sm overflow-hidden flex items-center justify-center">
            <img src={churchLogoUrl} alt="Iglesia" className="size-full object-contain p-0.5" />
          </div>
        )}
        {isOfficialChurch && !churchLogoUrl && (
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-background/90 border border-border px-2 py-1 text-[10px] font-semibold text-primary">
            <Church className="size-3" />
            Iglesia
          </div>
        )}
      </div>
      <div className={cn("relative flex justify-center", avatarOffset)}>
        <div
          className={cn(
            "rounded-2xl border-4 border-background bg-card shadow-lg overflow-hidden flex items-center justify-center",
            avatarSize,
          )}
        >
          {avatarImage ? (
            <img src={avatarImage} alt={name} className="size-full object-cover" />
          ) : (
            <div className="size-full bg-gradient-to-br from-blue-500/30 to-primary/20 flex items-center justify-center">
              <Users className={variant === "hero" ? "size-10" : "size-7 text-primary/70"} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
