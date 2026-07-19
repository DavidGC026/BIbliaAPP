import { type NextRequest, NextResponse } from "next/server"
import { getPool } from "@/lib/mysql"
import { fetchThemeBackgroundImage } from "@/lib/verse-theme-unsplash"
import { assertBibleAccess, bibleAccessStatus, listAccessibleBibles } from "@/lib/bible-access"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const requestedBibleId = Number(searchParams.get("idBible"))
    const accessibleBibles = await listAccessibleBibles(req)
    const configuredDefault = Number(process.env.DEFAULT_PUBLIC_BIBLE_ID)
    const idBible = requestedBibleId ||
      (accessibleBibles.some((bible) => bible.bibleId === configuredDefault)
        ? configuredDefault
        : accessibleBibles[0]?.bibleId)
    if (!idBible) {
      return NextResponse.json({ error: "No hay una versión bíblica disponible." }, { status: 404 })
    }
    await assertBibleAccess(req, idBible)
    
    // Obtener mes y día (ya sea pasados por query para testing o usando la fecha actual)
    const now = new Date()
    const month = Number(searchParams.get("month")) || (now.getMonth() + 1)
    const day = Number(searchParams.get("day")) || now.getDate()
    const daySeed = month * 31 + day

    // 1. Buscar el pasaje programado para hoy
    const [dailyRows]: any = await getPool().query(
      `SELECT d.idBook, d.chapter, d.verse_start, d.verse_end, d.theme, b.name as book_name
       FROM bible_verse_of_the_day d
       JOIN bible_books b ON d.idBook = b.idBook
       WHERE d.month = ? AND d.day = ?
       LIMIT 1`,
      [month, day]
    )

    if (!dailyRows || dailyRows.length === 0) {
      return NextResponse.json({ error: "No hay versículo programado para hoy." }, { status: 404 })
    }

    const daily = dailyRows[0]

    // 2. Buscar los textos de los versículos correspondientes a la versión seleccionada
    const [versesRows]: any = await getPool().query(
      `SELECT verse, text
       FROM bible_verses
       WHERE idBible = ? AND idBook = ? AND chapter = ? AND verse BETWEEN ? AND ?
       ORDER BY verse ASC`,
      [idBible, daily.idBook, daily.chapter, daily.verse_start, daily.verse_end]
    )

    if (!versesRows || versesRows.length === 0) {
      return NextResponse.json({ error: "Textos no encontrados para la versión especificada." }, { status: 404 })
    }

    // Unir los textos de los versículos
    const combinedText = versesRows.map((v: any) => v.text).join(" ")
    
    // Formatear referencia (Ej: Juan 3:16-17 o Juan 3:16)
    const reference = daily.verse_start === daily.verse_end 
      ? `${daily.book_name} ${daily.chapter}:${daily.verse_start}`
      : `${daily.book_name} ${daily.chapter}:${daily.verse_start}-${daily.verse_end}`

    const backgroundImage = await fetchThemeBackgroundImage(daily.theme, daySeed)

    return NextResponse.json({
      theme: daily.theme,
      reference,
      text: combinedText,
      idBook: daily.idBook,
      chapter: daily.chapter,
      verse_start: daily.verse_start,
      verse_end: daily.verse_end,
      idBible,
      backgroundImage,
    })

  } catch (err) {
    console.error("Error obteniendo el Versículo del Día:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: bibleAccessStatus(err) }
    )
  }
}
