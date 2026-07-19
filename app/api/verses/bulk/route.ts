import { type NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/mysql';
import { assertBibleAccess, bibleAccessStatus } from '@/lib/bible-access';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bibleId = Number(searchParams.get('bible'));
    const bookId = Number(searchParams.get('book'));
    if (!bibleId || !bookId) {
      return NextResponse.json({ error: "Parámetros 'bible' y 'book' requeridos." }, { status: 400 });
    }
    await assertBibleAccess(req, bibleId, 'canDownload');

    const [rows] = await getPool().query<any[]>(
      `SELECT bv.idVerse AS id, bv.idBook AS bookId, bb.name AS bookName,
              bv.chapter, bv.verse, bv.text
       FROM bible_verses bv
       JOIN bible_books bb ON bv.idBook = bb.idBook
       WHERE bv.idBible = ? AND bv.idBook = ?
       ORDER BY bv.chapter, bv.verse`,
      [bibleId, bookId],
    );

    return NextResponse.json({ verses: rows });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error desconocido' },
      { status: bibleAccessStatus(err) },
    );
  }
}
