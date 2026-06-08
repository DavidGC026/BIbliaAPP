import { redirect } from "next/navigation"
import {
  BOOK_ABBR_TO_ID,
  buildHomeReaderQuery,
  parsePassageSlug,
} from "@/lib/bible-url"

type PageProps = {
  params: Promise<{ version: string; passage: string }>
}

export default async function DeepLinkRedirect({ params }: PageProps) {
  const { version, passage } = await params

  if (!version || !passage) {
    redirect("/")
  }

  const parsed = parsePassageSlug(passage)
  if (!parsed) {
    redirect("/")
  }

  const bookId = BOOK_ABBR_TO_ID[parsed.bookAbbr]
  if (!bookId) {
    redirect("/")
  }

  const bibleId = parseInt(version, 10)
  const targetBible = !isNaN(bibleId) ? bibleId : 149

  redirect(
    buildHomeReaderQuery({
      bibleId: targetBible,
      bookId,
      chapter: parsed.chapter,
      verse: parsed.verse,
    }),
  )
}
