const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const fs = require('node:fs/promises');
const os = require('node:os');
const Module = require('node:module');
const { build } = require('esbuild');
const { NextRequest } = require('next/server');

test('all media URLs apply the same permissions; legacy files leave public storage', async t => {
  const root = path.resolve(__dirname, '..');
  let session = null, allowed = false, known = true;
  const media = { user_id: 1, filename: 'fixture.png', mime_type: 'image/svg+xml', kind: 'other', visibility: 'private' };
  const mocks = { getSession: async () => session, canViewMedia: async () => allowed,
    getUserMediaById: async () => known ? media : null, getUserMediaByFilename: async () => known ? media : null };
  const result = await build({ stdin: { resolveDir: root, loader: 'ts', contents: `
    export { GET as byId } from './app/api/media/[id]/route';
    export { GET as byName } from './app/api/uploads/[filename]/route';
    export { GET as legacy } from './app/uploads/[filename]/route';
    export { middleware } from './middleware';
  ` }, bundle: true, write: false, platform: 'node', format: 'cjs', external: ['next/server'],
    plugins: [{ name: 'isolated-media', setup(builder) {
      builder.onResolve({ filter: /(?:^|\/)(auth|media-privacy|user-media)$/ }, () => ({ path: 'media-test-mocks', external: true }));
    } }] });
  const compiled = new Module(__filename, module);
  compiled.paths = Module._nodeModulePaths(root);
  compiled.require = id => id === 'media-test-mocks' ? mocks : Module.prototype.require.call(compiled, id);
  compiled._compile(result.outputFiles[0].text, __filename);
  const { byId, byName, legacy, middleware } = compiled.exports;
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'biblia-media-test-'));
  const previous = process.cwd(), oldDir = process.env.UPLOADS_DIR;
  delete process.env.UPLOADS_DIR;
  process.chdir(temp);
  try {
    await fs.mkdir(path.join(temp, 'public/uploads'), { recursive: true });
    await fs.writeFile(path.join(temp, 'public/uploads/fixture.png'), 'fixture');
    const call = fn => fn(new Request('https://example.test'), { params: Promise.resolve({ id: '1', filename: 'fixture.png' }) });
    for (const fn of [byId, byName, legacy]) {
      session = null; assert.equal((await call(fn)).status, 401);
      session = { userId: 2, role: 'user' }; allowed = false; assert.equal((await call(fn)).status, 403);
      known = false; assert.equal((await call(fn)).status, 404); known = true;
      allowed = true;
      const response = await call(fn);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
      assert.equal(response.headers.get('Content-Type'), 'image/png');
      assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    }
    await assert.rejects(fs.stat(path.join(temp, 'public/uploads/fixture.png')), { code: 'ENOENT' });
    assert.equal(await fs.readFile(path.join(temp, 'data/uploads/fixture.png'), 'utf8'), 'fixture');
    for (const filename of ['../fixture.png', '..\\fixture.png', 'evil.svg', '.hidden.png']) {
      assert.equal((await byName(new Request('https://example.test'), { params: Promise.resolve({ filename }) })).status, 400);
    }
    const rewrite = middleware(new NextRequest('https://example.test/uploads/fixture.png'));
    assert.equal(rewrite.headers.get('x-middleware-rewrite'), 'https://example.test/api/uploads/fixture.png');
    for (const origin of ['https://attacker.invalid', 'tauri://attacker']) {
      assert.equal(middleware(new NextRequest('https://example.test/api/auth/logout', { method: 'POST', headers: { origin } })).status, 403);
    }
    for (const origin of ['tauri://localhost', 'https://biblia2.dvguzman.com']) {
      assert.equal(middleware(new NextRequest('https://example.test/api/auth/login', { method: 'POST', headers: { origin } })).status, 200);
    }
  } finally {
    process.chdir(previous);
    if (oldDir === undefined) delete process.env.UPLOADS_DIR; else process.env.UPLOADS_DIR = oldDir;
    await fs.rm(temp, { recursive: true, force: true });
  }
});
