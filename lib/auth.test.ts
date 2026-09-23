import assert from "node:assert/strict"
import crypto from "node:crypto"
import { test } from "node:test"
import { generateToken, getRequestToken, renewSessionToken, verifyToken, hashPassword, verifyPassword } from "./auth"

process.env.JWT_SECRET = "test-only-session-key-never-used-in-production"
const identity = { userId: 2, role: "user" }
const day = 24 * 60 * 60 * 1000
const request = (token: string) => new Request("https://example.test/api/auth/me", {
  headers: { authorization: `Bearer ${token}` },
})

test("authenticated tokens round-trip and use a fresh nonce", () => {
  const first = generateToken(identity)
  assert.deepEqual(verifyToken(first), identity)
  assert.notEqual(generateToken(identity), first)
  assert.equal(first.split(":")[0], "v2")
})

test("modifying the nonce, ciphertext or authentication tag rejects the token", () => {
  const original = generateToken(identity)
  for (const part of [1, 2, 3]) {
    const pieces = original.split(":")
    const bytes = Buffer.from(pieces[part], "hex")
    bytes[0] ^= 1
    pieces[part] = bytes.toString("hex")
    assert.equal(verifyToken(pieces.join(":")), null)
  }
})

test("rejects legacy CBC tokens, including a forged user ID in the IV", () => {
  const key = crypto.scryptSync(process.env.JWT_SECRET!, "salt", 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv)
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify({ ...identity, exp: Date.now() + day })), cipher.final(),
  ]).toString("hex")
  assert.equal(verifyToken(`${iv.toString("hex")}:${encrypted}`), null)
  iv[10] ^= "2".charCodeAt(0) ^ "1".charCodeAt(0)
  assert.equal(verifyToken(`${iv.toString("hex")}:${encrypted}`), null)
  assert.equal(verifyToken(encrypted), null)
})

test("rejects malformed, oversized, appended and cross-key tokens", () => {
  const token = generateToken(identity)
  for (const invalid of ["", "v2:", "a".repeat(10000), `${token}:extra`, `${token}00`, token.toUpperCase()]) {
    assert.equal(verifyToken(invalid), null)
  }
  const secret = process.env.JWT_SECRET
  try {
    process.env.JWT_SECRET = "another-test-key"
    assert.equal(verifyToken(token), null)
  } finally { process.env.JWT_SECRET = secret }
})

test("expires exactly at seven days and never renews an expired token", () => {
  const now = Date.now
  const start = now()
  try {
    Date.now = () => start
    const token = generateToken(identity)
    Date.now = () => start + 7 * day - 1
    assert.deepEqual(verifyToken(token), identity)
    Date.now = () => start + 7 * day
    assert.equal(verifyToken(token), null)
    assert.equal(renewSessionToken(request(token), identity), null)
  } finally { Date.now = now }
})

test("active sessions renew but cannot extend beyond thirty days from login", () => {
  const now = Date.now
  const start = now()
  try {
    Date.now = () => start
    let token = generateToken(identity)
    assert.equal(renewSessionToken(request(token), identity), null)
    for (let elapsed = 1; elapsed < 30; elapsed++) {
      Date.now = () => start + elapsed * day
      const renewed = renewSessionToken(request(token), identity)
      assert.ok(renewed)
      token = renewed
      assert.deepEqual(verifyToken(token), identity)
    }
    Date.now = () => start + 30 * day
    assert.equal(verifyToken(token), null)
    assert.equal(renewSessionToken(request(token), identity), null)
  } finally { Date.now = now }
})

test("renewal binds the user ID and adopts the current database role", () => {
  const token = generateToken({ userId: 2, role: "admin" })
  assert.equal(renewSessionToken(request(token), { userId: 1, role: "admin" }), null)
  const renewed = renewSessionToken(request(token), identity)
  assert.ok(renewed)
  assert.deepEqual(verifyToken(renewed), identity)
})

test("matches the exact session cookie and never falls back from an invalid authorization header", () => {
  const token = generateToken(identity)
  const withHeaders = (headers: Record<string, string>) => getRequestToken(new Request("https://example.test", { headers }))
  assert.deepEqual(withHeaders({ cookie: `other=1; session=${token}; theme=dark` }), token)
  assert.equal(withHeaders({ cookie: `other_session=${token}` }), null)
  assert.equal(withHeaders({ cookie: `session=${token}`, authorization: "Bearer expired" }), "expired")
  assert.equal(withHeaders({ cookie: `session=${token}`, authorization: "Basic invalid" }), null)
})

test("invalid identities cannot be issued and password checks remain compatible", () => {
  assert.throws(() => generateToken({ userId: -1, role: "user" }))
  assert.throws(() => generateToken({ userId: 1, role: "" }))
  const hash = hashPassword("test-only-password")
  assert.equal(verifyPassword("test-only-password", hash), true)
  assert.equal(verifyPassword("wrong-password", hash), false)
})
