"use client"

import { cn } from "@/lib/utils"
import { User } from "lucide-react"

interface UserAvatarProps {
  name: string
  avatarUrl?: string | null
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}

const SIZE_MAP = {
  sm: "size-8 text-sm",
  md: "size-10 text-base",
  lg: "size-16 text-xl",
  xl: "size-24 sm:size-32 text-4xl",
}

export function UserAvatar({ name, avatarUrl, size = "md", className }: UserAvatarProps) {
  const initial = name?.charAt(0)?.toUpperCase() || "?"

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn("rounded-full object-cover shrink-0 bg-muted", SIZE_MAP[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center font-bold text-primary shrink-0 border border-border/50",
        SIZE_MAP[size],
        className,
      )}
    >
      {initial || <User className="size-1/2 opacity-60" />}
    </div>
  )
}
