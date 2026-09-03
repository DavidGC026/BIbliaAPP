import { redirect } from "next/navigation"
import {
  BOOK_ABBR_TO_ID,
  buildHomeReaderQuery,
  parsePassageSlug,
} from "@/lib/bible-url"

import type { Metadata } from "next"
import { getPool } from "@/lib/mysql"
import type { RowDataPacket } from "mysql2"

type PageProps = {
  params: Promise<{ version: string; passage: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { passage } = await params
  const parsed = parsePassageSlug(passage)
  if (!parsed) return { title: "BibliaAPP" }

  const bookId = BOOK_ABBR_TO_ID[parsed.bookAbbr]
  if (!bookId) return { title: "BibliaAPP" }

  try {
    const pool = getPool()
    const [books] = await pool.query<RowDataPacket[]>(
      `SELECT name FROM bible_books WHERE idBook = ? LIMIT 1`,
      [bookId],
    )
    const bookName = (books[0]?.name as string) || "Biblia"
    const ref = parsed.verse
      ? `${bookName} ${parsed.chapter}:${parsed.verse}`
      : `${bookName} ${parsed.chapter}`

    let preview = `Lee ${ref} en BibliaAPP.`
    if (parsed.verse) {
      const [vRows] = await pool.query<RowDataPacket[]>(
        `SELECT text FROM bible_verses WHERE idBook = ? AND chapter = ? AND verse = ? LIMIT 1`,
        [bookId, parsed.chapter, parsed.verse],
      )
      if (vRows[0]?.text) {
        preview = vRows[0].text
      }
    }

    return {
      title: `${ref} — BibliaAPP`,
      description: preview,
      openGraph: {
        title: `${ref} — BibliaAPP`,
        description: preview,
        images: ["/logo.png"],
      },
    }
  } catch {
    return { title: "BibliaAPP" }
  }
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
