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
    passed = true
    console.log("API de juegos: permisos, publicación, duplicados, referencias, concurrencia, reto estable y acceso bíblico verificados en una base temporal.")
    if (keep) {
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
