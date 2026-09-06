import assert from "node:assert/strict"
import crypto from "node:crypto"
import { writeFile } from "node:fs/promises"
import mysql from "mysql2/promise"
import { generateToken, hashPassword } from "../lib/auth"
import { getPool } from "../lib/mysql"
import { GET as contentGet } from "../app/api/games/content/route"
import { GET as versesGet } from "../app/api/games/verses/route"
import { GET as adminGet, PUT as adminPut } from "../app/api/admin/games/content/route"
import type { ContentEnvelope, EditorCatalog } from "../lib/games/catalog"
import { POST as progressPost } from "../app/api/games/progress/route"
import type { ProgressOperation, ProgressSyncReply } from "../lib/games/sync"

async function main() {
  const sourceDatabase = process.env.MYSQL_DATABASE!
  assert.match(sourceDatabase, /^[a-zA-Z0-9_]+$/)
  const database = `biblia_games_test_${Date.now()}_${process.pid}`
  const connection = await mysql.createConnection({ host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT ?? 3306), user: process.env.GAMES_TEST_ADMIN_USER ?? process.env.MYSQL_USER, password: process.env.GAMES_TEST_ADMIN_PASSWORD ?? process.env.MYSQL_PASSWORD })
  let created = false
  let granted = false
  let passed = false
  const keep = process.argv.includes("--keep")
  try {
    await connection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    created = true
    if (process.env.GAMES_TEST_ADMIN_USER) {
      await connection.query(`GRANT ALL PRIVILEGES ON \`${database}\`.* TO ?@'%'`, [process.env.MYSQL_USER])
      granted = true
    }
    for (const table of ["users", "bible_bibles", "bible_books", "bible_licenses", "bible_verses"]) {
      await connection.query(`CREATE TABLE \`${database}\`.\`${table}\` LIKE \`${sourceDatabase}\`.\`${table}\``)
      if (table === "users") continue
      const where = table === "bible_verses" ? " WHERE idBible = ?" : ""
      await connection.query(`INSERT INTO \`${database}\`.\`${table}\` SELECT * FROM \`${sourceDatabase}\`.\`${table}\`${where}`, table === "bible_verses" ? [Number(process.env.DEFAULT_PUBLIC_BIBLE_ID || 149)] : [])
    }
    process.env.MYSQL_DATABASE = database
    process.env.JWT_SECRET = crypto.randomBytes(32).toString("hex")
    for (const [id, role] of [[900001, "admin"], [900002, "user"]] as const) {
      await connection.query(`INSERT INTO \`${database}\`.users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)`, [id, `Prueba ${role}`, `${role}@games-test.invalid`, hashPassword(crypto.randomBytes(20).toString("hex")), role])
    }
    const admin = generateToken({ userId: 900001, role: "admin" })
    const reader = generateToken({ userId: 900002, role: "user" })
    const revoked = generateToken({ userId: 900002, role: "admin" })
    const request = (token?: string, body?: unknown) => new Request("http://127.0.0.1:3107/api/admin/games/content", { method: body === undefined ? "GET" : "PUT", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    assert.equal((await adminGet(request())).status, 401)
    assert.equal((await adminGet(request(reader))).status, 403)
    assert.equal((await adminGet(request(revoked))).status, 403)
    assert.equal((await adminPut(request(reader, {}))).status, 403)
    assert.equal((await adminPut(request(admin, null))).status, 400)
    const initial = await (await contentGet()).json() as ContentEnvelope
    assert.equal(initial.catalog.words.length, 50)
    const editor = await (await adminGet(request(admin))).json() as EditorCatalog
    assert.equal(editor.books.length, 66)
    const newWord = { word: "ABRAHAM", clue: "Dios le prometió que sería padre de muchas naciones.", category: "Personaje", bookId: 1, chapter: 17, verse: 5, reference: "Génesis 17:5" }
    const expanded = { ...editor.catalog, words: [...editor.catalog.words, newWord] }
    const published = await adminPut(request(admin, { revision: editor.revision, catalog: expanded }))
    assert.equal(published.status, 200)
    const saved = await published.json()
    assert.equal(saved.revision, editor.revision + 1)
    assert.equal((await adminPut(request(admin, { revision: editor.revision, catalog: expanded }))).status, 409)
    const duplicate = { ...expanded, words: [...expanded.words, { ...newWord, word: "abráham" }] }
    assert.equal((await adminPut(request(admin, { revision: saved.revision, catalog: duplicate }))).status, 400)
    const invalidPassage = { ...expanded, words: [...expanded.words, { ...newWord, word: "BETEL", chapter: 1, verse: 100 }] }
    assert.equal((await adminPut(request(admin, { revision: saved.revision, catalog: invalidPassage }))).status, 400)
    const concurrent = await Promise.all([adminPut(request(admin, { revision: saved.revision, catalog: expanded })), adminPut(request(admin, { revision: saved.revision, catalog: expanded }))])
    assert.deepEqual(concurrent.map(response => response.status).sort(), [200, 409])
    const current = await (await contentGet()).json() as ContentEnvelope
    assert.equal(current.catalog.words.length, 51)
    assert.deepEqual(current.daily, initial.daily, "El reto de hoy debe conservar su selección después de publicar")
    const bibleId = Number(process.env.DEFAULT_PUBLIC_BIBLE_ID || 149)
    const dailyResponse = await versesGet(new Request(`http://localhost/api/games/verses?bible=${bibleId}&daily=${initial.daily.date}`))
    assert.equal(dailyResponse.status, 200)
    assert.equal((await dailyResponse.json()).verses.length, 5)
    const reviewResponse = await versesGet(new Request(`http://localhost/api/games/verses?bible=${bibleId}&passage=1:17:5`))
    assert.equal(reviewResponse.status, 200)
    assert.ok((await reviewResponse.json()).verses.some((verse: { bookId: number; chapter: number; verse: number }) => verse.bookId === 1 && verse.chapter === 17 && verse.verse === 5))
    for (const [query, status] of [["bible=0", 400], ["bible=999999", 404], ["passage=1:1:0", 400], ["daily=9999-01-01", 404]] as const) {
      assert.equal((await versesGet(new Request(`http://localhost/api/games/verses?${query}`))).status, status)
    }
    const syncRequest = (token: string | undefined, accountId: number, operations: unknown[]) => new Request("http://localhost/api/games/progress", { method: "POST", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" }, body: JSON.stringify({ accountId, operations }) })
    assert.equal((await progressPost(syncRequest(undefined, 900002, []))).status, 401)
    assert.equal((await progressPost(syncRequest(reader, 900001, []))).status, 403)
    assert.equal((await progressPost(syncRequest(generateToken({ userId: 900099, role: "user" }), 900099, []))).status, 401)
    assert.equal((await progressPost(syncRequest(reader, 900002, [null]))).status, 400)
    const now = Date.now()
    const result = (id: string, score: number): Extract<ProgressOperation, { type: "result" }> => ({ id: `result:${id}`, at: now, type: "result", roundId: id, result: { id: `result:${id}`, game: "wordle", score, won: true }, mode: "free" })
    const desktop = result("desktop-round", 90), phone = result("phone-round", 80)
    const replies = await Promise.all([progressPost(syncRequest(reader, 900002, [desktop])), progressPost(syncRequest(reader, 900002, [phone]))])
    assert.deepEqual(replies.map(response => response.status), [200, 200])
    const merged = await (await progressPost(syncRequest(reader, 900002, [desktop, phone]))).json() as ProgressSyncReply
    assert.equal(merged.progress.totals.games.wordle.played, 2)
    assert.equal(merged.progress.totals.games.wordle.points, 170)
    const separate = await (await progressPost(syncRequest(admin, 900001, []))).json() as ProgressSyncReply
    assert.equal(separate.progress.totals.games.wordle.played, 0, "El progreso pertenece a una sola cuenta")
    const dailyResult: ProgressOperation = { ...result("desktop-daily", 100), mode: "daily", result: { id: "desktop-daily", game: "wordle", score: 100, won: true, dailyKey: `${initial.daily.date}:wordle` } }
    assert.equal((await progressPost(syncRequest(reader, 900002, [dailyResult]))).status, 200)
    const repeatedDaily = { ...dailyResult, id: "result:phone-daily", roundId: "phone-daily" }
    const repeated = await (await progressPost(syncRequest(reader, 900002, [repeatedDaily]))).json() as ProgressSyncReply
    assert.equal(repeated.progress.totals.games.wordle.played, 3)
    assert.equal(repeated.progress.totals.games.wordle.points, 270)
    const savedRound = { id: "shared-round", game: "wordle" as const, settings: { mode: "free" as const, seed: "shared-seed", word: initial.catalog.words[0] }, checkpoint: { draft: "AB", hints: [0] }, createdAt: now, updatedAt: now }
    const checkpoint: ProgressOperation = { id: "saved-shared-round", at: now, type: "save", round: savedRound }
    assert.equal((await progressPost(syncRequest(reader, 900002, [checkpoint]))).status, 200)
    const restored = await (await progressPost(syncRequest(reader, 900002, []))).json() as ProgressSyncReply
    assert.equal(restored.progress.rounds["shared-round"].checkpoint.draft, "AB")
    await progressPost(syncRequest(reader, 900002, [result("shared-round", 70)]))
    const late = await (await progressPost(syncRequest(reader, 900002, [{ ...checkpoint, id: "late-checkpoint", at: now + 100, round: { ...savedRound, updatedAt: now + 100 } }]))).json() as ProgressSyncReply
    assert.equal(late.progress.rounds["shared-round"], undefined)
    const frozen = await versesGet(new Request(`http://localhost/api/games/verses?bible=${bibleId}&references=1:17:5,1:28:19`))
    assert.equal(frozen.status, 200)
    assert.equal((await frozen.json()).verses.length, 2)
    assert.equal((await versesGet(new Request(`http://localhost/api/games/verses?references=1:1:100`))).status, 404)
    assert.equal((await versesGet(new Request(`http://localhost/api/games/verses?references=1:1:1,mal`))).status, 400)
    console.log("Sincronización: aislamiento por cuenta, concurrencia, reintentos, puntos diarios únicos y partidas compartidas verificados.")
    passed = true
    console.log("API de juegos: permisos, publicación, duplicados, referencias, concurrencia, reto estable y acceso bíblico verificados en una base temporal.")
    if (keep) {
      // La revisión de la interfaz necesita los esquemas auxiliares, sin datos personales.
      const [tables] = await connection.query<mysql.RowDataPacket[]>(`SHOW FULL TABLES FROM \`${sourceDatabase}\` WHERE Table_type = 'BASE TABLE'`)
      for (const table of tables) {
        const name = Object.values(table)[0] as string
        assert.match(name, /^[a-zA-Z0-9_]+$/)
        await connection.query(`CREATE TABLE IF NOT EXISTS \`${database}\`.\`${name}\` LIKE \`${sourceDatabase}\`.\`${name}\``)
      }
      await connection.query(`UPDATE \`${database}\`.users SET username=CONCAT('games_test_',role), legal_accepted_at=NOW() WHERE id IN (900001,900002)`)
      const fixture = `/tmp/${database}.json`
      const env = Object.fromEntries(["MYSQL_HOST", "MYSQL_PORT", "MYSQL_USER", "MYSQL_PASSWORD", "MYSQL_DATABASE", "DEFAULT_PUBLIC_BIBLE_ID", "JWT_SECRET"].filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]))
      await writeFile(fixture, JSON.stringify({ database, env, adminToken: admin, readerToken: reader, grantedUser: granted ? process.env.MYSQL_USER : null }), { mode: 0o600 })
      await writeFile("/tmp/biblia-games-test-fixture-path", fixture, { mode: 0o600 })
      console.log(`Base temporal conservada para revisar la interfaz. Archivo privado: ${fixture}`)
    }
  } finally {
    await getPool().end()
    if (created && !(keep && passed)) {
      assert.ok(database.startsWith("biblia_games_test_") && database !== sourceDatabase)
      if (granted) await connection.query(`REVOKE ALL PRIVILEGES ON \`${database}\`.* FROM ?@'%'`, [process.env.MYSQL_USER])
      await connection.query(`DROP DATABASE \`${database}\``)
    }
    await connection.end()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
