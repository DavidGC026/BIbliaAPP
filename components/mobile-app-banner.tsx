"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { Download, Smartphone, X } from "lucide-react"
import { fetcher } from "@/lib/fetcher"

type MobileReleaseInfo = {
  available: boolean
  version?: string
  size?: number
  downloadUrl?: string
}

function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  )
}

function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false
  return /Android/i.test(navigator.userAgent)
}

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
}

export function MobileAppBanner() {
  const [isMobile, setIsMobile] = useState(false)
  const [dismissed, setDismissed] = useState(true)

  const { data } = useSWR<MobileReleaseInfo>(
    isMobile ? "/api/mobile-release" : null,
    fetcher,
    { shouldRetryOnError: false },
  )

  useEffect(() => {
    setIsMobile(isMobileBrowser())
  }, [])

  useEffect(() => {
    if (!data?.available || !data.version) return
    const key = `biblia_mobile_banner_dismissed_${data.version}`
    setDismissed(localStorage.getItem(key) === "1")
  }, [data?.available, data?.version])

  if (!isMobile || !data?.available || dismissed) return null

  function handleDownload() {
    if (!isAndroid()) {
      alert(
        "La aplicación móvil de BibliaAPP solo está disponible para Android. Si usas iPhone o iPad, puedes seguir usando la versión web.",
      )
      return
    }
    if (!data?.downloadUrl) return
    window.location.href = data.downloadUrl
  }

  function handleDismiss() {
    if (!data?.version) return
    localStorage.setItem(`biblia_mobile_banner_dismissed_${data.version}`, "1")
    setDismissed(true)
  }

  return (
    <div className="border-b border-primary/25 bg-primary/8 px-4 py-3 text-sm md:hidden">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Smartphone className="size-4" />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="font-semibold text-foreground">
              Descarga la app de BibliaAPP
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Versión {data.version}
              {data.size ? ` · ${formatBytes(data.size)}` : ""}
            </p>
            <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              Solo disponible para Android. En iPhone o iPad usa la versión web.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Download className="size-3.5" />
            Descargar APK
          </button>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground"
          aria-label="Cerrar aviso"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
