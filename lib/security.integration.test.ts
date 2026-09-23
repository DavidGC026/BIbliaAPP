import assert from "node:assert/strict"
import { test } from "node:test"
import { randomUUID } from "node:crypto"
import { createSessionToken, generateToken, getSession, renewSessionToken, revokeSession, hashPassword } from "./auth"
import { getPool } from "./mysql"
import { limitAuthAttempts } from "./auth-rate-limit"
import { consumePasswordResetToken, ensureDbTables } from "./bible"

test("persistent session and rate-limit guarantees against an isolated database", { skip: process.env.SECURITY_TEST_DB !== "1" }, async t => {
  assert.equal(process.env.MYSQL_HOST, "127.0.0.1")
  assert.equal(process.env.MYSQL_DATABASE, "biblia_security_test")
  process.env.JWT_SECRET = "isolated-integration-test-secret-at-least-32-chars"
  const pool = getPool()
  const request = (token: string) => new Request("https://example.test", { headers: { authorization: `Bearer ${token}` } })
  try {
    await pool.query("CREATE TABLE IF NOT EXISTS users (id INT PRIMARY KEY, role VARCHAR(30), password VARCHAR(255))")
    const password = hashPassword("fixture-password")
    await pool.query("REPLACE INTO users (id, role, password) VALUES (1, 'admin', ?), (2, 'user', ?)", [password, password])
    let original = "", renewed = ""
    await t.test("unregistered tokens cannot authorize a request", async () => {
      assert.equal(await getSession(request(generateToken({ userId: 1, role: "admin" }))), null)
    })
    await t.test("role changes apply immediately, including renewed tokens", async () => {
      original = await createSessionToken(1, password)
      assert.deepEqual(await getSession(request(original)), { userId: 1, role: "admin" })
      await pool.query("UPDATE users SET role = 'user' WHERE id = 1")
      const session = await getSession(request(original))
      assert.deepEqual(session, { userId: 1, role: "user" })
      renewed = renewSessionToken(request(original), session!)!
      assert.ok(renewed)
      assert.deepEqual(await getSession(request(renewed)), session)
    })
    await t.test("logout revokes every copy and renewal of that session, across devices", async () => {
      const otherDevice = await createSessionToken(1)
      await revokeSession(request(renewed))
      assert.equal(await getSession(request(original)), null)
      assert.equal(await getSession(request(renewed)), null)
      assert.ok(await getSession(request(otherDevice)))
    })
    await t.test("password changes invalidate all sessions without trusting cached claims", async () => {
      const token = await createSessionToken(1)
      await pool.query("UPDATE users SET password = ? WHERE id = 1", [hashPassword("new-password")])
      assert.equal(await getSession(request(token)), null)
      await assert.rejects(createSessionToken(1, password))
    })
    await t.test("deleted accounts cannot use any protected endpoint", async () => {
      const token = await createSessionToken(2)
      await pool.query("DELETE FROM users WHERE id = 2")
      assert.equal(await getSession(request(token)), null)
    })
    await t.test("a reset link can be consumed only once under concurrent requests", async () => {
      // Referencias del esquema legado del feed, normalmente creadas por la migración inicial.
      await pool.query("CREATE TABLE IF NOT EXISTS feed_posts (id INT PRIMARY KEY)")
      await pool.query("CREATE TABLE IF NOT EXISTS feed_comments (id INT PRIMARY KEY, post_id INT)")
      await ensureDbTables()
      const reset = randomUUID()
      const session = await createSessionToken(1)
      await pool.query("UPDATE users SET password_reset_token = ?, password_reset_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = 1", [reset])
      const results = await Promise.all([consumePasswordResetToken(reset, hashPassword("first-password")), consumePasswordResetToken(reset, hashPassword("second-password"))])
      assert.deepEqual(results.sort(), [false, true])
      assert.equal(await getSession(request(session)), null)
    })
    await t.test("concurrent attempts share an atomic persistent limit", async () => {
      const subject = randomUUID()
      const results = await Promise.allSettled(Array.from({ length: 20 }, () => limitAuthAttempts("test", subject, 5)))
      assert.equal(results.filter(result => result.status === "fulfilled").length, 5)
      for (const result of results) if (result.status === "rejected") {
        assert.equal(result.reason.status, 429)
        assert.ok(result.reason.retryAfter > 0)
      }
    })
  } finally { await pool.end() }
})
