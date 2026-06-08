import mysql from "mysql2/promise"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const VERSES_POOL = [
  { theme: "Amor", idBook: 43, chapter: 3, verse_start: 16, verse_end: 17 }, // Juan 3:16-17
  { theme: "Amor", idBook: 46, chapter: 13, verse_start: 4, verse_end: 7 }, // 1 Corintios 13:4-7
  { theme: "Amor", idBook: 62, chapter: 4, verse_start: 7, verse_end: 8 }, // 1 Juan 4:7-8
  { theme: "Amor", idBook: 45, chapter: 8, verse_start: 38, verse_end: 39 }, // Romanos 8:38-39
  { theme: "Fe", idBook: 58, chapter: 11, verse_start: 1, verse_end: 1 }, // Hebreos 11:1
  { theme: "Fe", idBook: 40, chapter: 17, verse_start: 20, verse_end: 20 }, // Mateo 17:20
  { theme: "Fe", idBook: 45, chapter: 10, verse_start: 17, verse_end: 17 }, // Romanos 10:17
  { theme: "Fortaleza", idBook: 50, chapter: 4, verse_start: 13, verse_end: 13 }, // Filipenses 4:13
  { theme: "Fortaleza", idBook: 23, chapter: 41, verse_start: 10, verse_end: 10 }, // Isaías 41:10
  { theme: "Fortaleza", idBook: 19, chapter: 46, verse_start: 1, verse_end: 2 }, // Salmos 46:1-2
  { theme: "Ansiedad", idBook: 50, chapter: 4, verse_start: 6, verse_end: 7 }, // Filipenses 4:6-7
  { theme: "Ansiedad", idBook: 60, chapter: 5, verse_start: 7, verse_end: 7 }, // 1 Pedro 5:7
  { theme: "Ansiedad", idBook: 40, chapter: 6, verse_start: 33, verse_end: 34 }, // Mateo 6:33-34
  { theme: "Esperanza", idBook: 24, chapter: 29, verse_start: 11, verse_end: 11 }, // Jeremías 29:11
  { theme: "Esperanza", idBook: 45, chapter: 15, verse_start: 13, verse_end: 13 }, // Romanos 15:13
  { theme: "Esperanza", idBook: 19, chapter: 121, verse_start: 1, verse_end: 2 }, // Salmos 121:1-2
  { theme: "Paz", idBook: 43, chapter: 14, verse_start: 27, verse_end: 27 }, // Juan 14:27
  { theme: "Paz", idBook: 23, chapter: 26, verse_start: 3, verse_end: 3 }, // Isaías 26:3
  { theme: "Paz", idBook: 45, chapter: 5, verse_start: 1, verse_end: 1 }, // Romanos 5:1
  { theme: "Consuelo", idBook: 40, chapter: 11, verse_start: 28, verse_end: 30 }, // Mateo 11:28-30
  { theme: "Consuelo", idBook: 47, chapter: 1, verse_start: 3, verse_end: 4 }, // 2 Corintios 1:3-4
  { theme: "Promesa", idBook: 66, chapter: 21, verse_start: 4, verse_end: 4 }, // Apocalipsis 21:4
]

const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

async function seedDailyVerses() {
  console.log("Iniciando conexión a MariaDB para Seeding...")
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  })

  await connection.beginTransaction()

  try {
    console.log("Limpiando tabla existente...")
    await connection.query("TRUNCATE TABLE bible_verse_of_the_day")

    const values = []
    let poolIndex = 0

    // Generar un versículo para cada día de los 12 meses (incluyendo 29 de febrero)
    for (let month = 1; month <= 12; month++) {
      for (let day = 1; day <= daysInMonth[month - 1]; day++) {
        const verse = VERSES_POOL[poolIndex % VERSES_POOL.length]
        values.push([month, day, verse.theme, verse.idBook, verse.chapter, verse.verse_start, verse.verse_end])
        poolIndex++
      }
    }

    console.log(`Insertando ${values.length} versículos diarios...`)
    await connection.query(
      `INSERT INTO bible_verse_of_the_day (month, day, theme, idBook, chapter, verse_start, verse_end) VALUES ?`,
      [values]
    )

    await connection.commit()
    console.log("¡Seeding completado con éxito!")
  } catch (err) {
    await connection.rollback()
    console.error("Error durante el seeding. Transacción revertida.", err)
  } finally {
    await connection.end()
  }
}

seedDailyVerses()
