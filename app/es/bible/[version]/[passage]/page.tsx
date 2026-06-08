"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"
import {
  BOOK_ABBR_TO_ID,
  buildHomeReaderQuery,
  parsePassageSlug,
} from "@/lib/bible-url"

export default function DeepLinkRedirect() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    if (!params) return

    const version = params.version as string
    const passage = params.passage as string

    if (!version || !passage) {
      router.replace("/")
      return
    }

    const parsed = parsePassageSlug(passage)
    if (!parsed) {
      router.replace("/")
      return
    }

    const bookId = BOOK_ABBR_TO_ID[parsed.bookAbbr]
    if (!bookId) {
      router.replace("/")
      return
    }

    const bibleId = parseInt(version, 10)
    const targetBible = !isNaN(bibleId) ? bibleId : 149

    const redirectUrl = buildHomeReaderQuery({
      bibleId: targetBible,
      bookId,
      chapter: parsed.chapter,
      verse: parsed.verse,
    })

    router.replace(redirectUrl)
  }, [params, router])

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground text-sm font-medium">
      <div className="flex flex-col items-center gap-3">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-muted-foreground">Cargando pasaje bíblico...</p>
      </div>
    </div>
  )
}
