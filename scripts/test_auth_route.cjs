const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const Module = require('node:module');
const { build } = require('esbuild');

test('profile endpoint preserves the authentication contract without a real database', async t => {
  process.env.JWT_SECRET = 'route-test-key-never-used-in-production';
  const entry = path.resolve(__dirname, '../app/api/auth/me/route.ts');
  let currentUser = { id: 2, role: 'user', name: 'Test' };
  const mocks = {
    getUserById: async () => currentUser,
    updateUserStreak: async () => {},
    processGroupEventRemindersThrottled: async () => {},
  };
  const result = await build({
    stdin: {
      contents: "export { GET } from './app/api/auth/me/route'; export { generateToken, verifyToken } from './lib/auth';",
      resolveDir: path.resolve(__dirname, '..'), loader: 'ts',
    },
    bundle: true, write: false, platform: 'node', format: 'cjs', external: ['next/server'],
    plugins: [{ name: 'isolated-database', setup(builder) {
      builder.onResolve({ filter: /^@\/lib\/(bible|group-events)$/ }, () => ({ path: 'test-auth-dependencies', external: true }));
    } }],
  });
  const compiled = new Module(entry, module);
  compiled.filename = entry;
  compiled.paths = Module._nodeModulePaths(path.dirname(entry));
  compiled.require = id => id === 'test-auth-dependencies' ? mocks : Module.prototype.require.call(compiled, id);
  compiled._compile(result.outputFiles[0].text, entry);
  const { GET, generateToken, verifyToken } = compiled.exports;
  const call = token => GET(new Request('https://example.test/api/auth/me', {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  }));

  await t.test('guest and invalid tokens return an explicit uncached null user', async () => {
    for (const token of [null, 'expired']) {
      const response = await call(token);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
      assert.deepEqual(await response.json(), { user: null });
    }
  });

  await t.test('valid token returns the database profile without unnecessary renewal', async () => {
    const response = await call(generateToken({ userId: 2, role: 'user' }));
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(response.headers.get('Set-Cookie'), null);
    assert.deepEqual(await response.json(), { user: currentUser });
  });

  await t.test('renewal returns the same credential in JSON and the secure HTTP-only cookie', async () => {
    const now = Date.now;
    const start = now();
    try {
      Date.now = () => start;
      const token = generateToken({ userId: 2, role: 'user' });
      Date.now = () => start + 2 * 24 * 60 * 60 * 1000;
      const response = await call(token);
      const result = await response.json();
      assert.ok(result.token);
      assert.deepEqual(verifyToken(result.token), { userId: 2, role: 'user' });
      const cookie = response.headers.get('Set-Cookie');
      assert.ok(cookie.includes(`session=${result.token};`));
      assert.ok(cookie.includes('HttpOnly'));
      assert.ok(cookie.includes('SameSite=Lax'));
    } finally { Date.now = now; }
  });

  await t.test('a deleted user is explicitly unauthorized', async () => {
    currentUser = null;
    const response = await call(generateToken({ userId: 2, role: 'user' }));
    assert.equal(response.status, 401);
    assert.equal((await response.json()).code, 'SESSION_INVALID');
  });

  await t.test('database failure is retryable and does not leak the database error', async () => {
    t.mock.method(console, 'error', () => {});
    mocks.getUserById = async () => { throw new Error('private database details'); };
    const response = await call(generateToken({ userId: 2, role: 'user' }));
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.equal((await response.text()).includes('private database details'), false);
  });
});
