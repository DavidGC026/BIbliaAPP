import assert from "node:assert/strict"
import { test } from "node:test"
import sharp from "sharp"
import { readAuthBody, readBoundedBody, emailField, passwordField, RequestError, securityErrorResponse } from "./request-security"
import { getAppUrl } from "./app-url"
import { prepareUploadedImage } from "./image-resize"

test("typed domain errors retain the codes expected by existing clients", async () => {
  const error = Object.assign(new RequestError("La cuenta es la misma."), { code: "SAME_ACCOUNT" })
  const response = securityErrorResponse(error)
  assert.equal(response.status, 400)
  assert.equal((await response.json()).code, "SAME_ACCOUNT")
})

test("auth inputs reject arrays, wrong types, oversized bodies and invalid JSON", async () => {
  for (const text of ["null", "[]", "{"]) await assert.rejects(readAuthBody(new Request("https://example.test", { method: "POST", headers: { "Content-Type": "application/json" }, body: text })))
  assert.throws(() => emailField({ email: "test@example.test" }))
  assert.throws(() => passwordField("x".repeat(1025)))
  assert.equal(emailField(" TEST@example.test "), "test@example.test")
  await assert.rejects(readBoundedBody(new Request("https://example.test", { method: "POST", body: "123456" }), 5), { status: 413 })
})

test("email links cannot be redirected using an attacker-controlled Origin", () => {
  const old = process.env.APP_URL, oldPublic = process.env.NEXT_PUBLIC_APP_URL
  try {
    delete process.env.APP_URL; delete process.env.NEXT_PUBLIC_APP_URL
    assert.equal(getAppUrl("https://attacker.invalid"), "https://biblia2.dvguzman.com")
  } finally {
    if (old === undefined) delete process.env.APP_URL; else process.env.APP_URL = old
    if (oldPublic === undefined) delete process.env.NEXT_PUBLIC_APP_URL; else process.env.NEXT_PUBLIC_APP_URL = oldPublic
  }
})

test("uploaded images must decode as raster and are re-encoded without appended active content", async () => {
  await assert.rejects(prepareUploadedImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><script>alert(1)</script></svg>'), 512))
  await assert.rejects(prepareUploadedImage(Buffer.from("not an image"), 512))
  const original = await sharp({ create: { width: 800, height: 600, channels: 3, background: "red" } }).png().toBuffer()
  const result = await prepareUploadedImage(Buffer.concat([original, Buffer.from("<script>bad</script>")]), 512)
  assert.equal(result.mimeType, "image/png")
  assert.equal((await sharp(result.buffer).metadata()).width, 512)
  assert.equal(result.buffer.includes(Buffer.from("<script>")), false)
})
