import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createApp } from '../server/index.mjs';

test('Vercel handler serves the API with production and preview origins only', async t => {
  process.env.VERCEL_PROJECT_PRODUCTION_URL = 'jevflow.example.app';
  process.env.VERCEL_URL = 'jevflow-abc123.example.app';
  const { default: handler } = await import('../server/vercel.mjs');
  const server = createServer(handler).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(r => { server.close(r); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}`;
  assert.deepEqual(await (await fetch(url + '/api/status')).json(), { ready: true, provider: 'typesafe', keyStorage: 'none' });
  const post = origin => fetch(url + '/api/decision', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal((await post('https://evil.example')).status, 403);
  // Allowed origins pass the origin check and reach key validation.
  assert.equal((await post('https://jevflow.example.app')).status, 401);
  assert.equal((await post('https://jevflow-abc123.example.app')).status, 401);
});

test('extra origins must be exact HTTPS origins', () => {
  assert.throws(() => createApp({ publicOrigin: 'https://a.example', extraOrigins: ['http://b.example'] }));
  assert.throws(() => createApp({ publicOrigin: 'https://a.example', extraOrigins: ['https://b.example/path'] }));
});

test('Vercel build puts the village at the root and the workbench at /lab', () => {
  execFileSync(process.execPath, ['scripts/vercel-build.mjs'], { cwd: new URL('..', import.meta.url) });
  const site = new URL('../site/', import.meta.url);
  try {
    assert.match(readFileSync(new URL('index.html', site), 'utf8'), /world\.js/);
    assert.match(readFileSync(new URL('lab.html', site), 'utf8'), /app\.js/);
    for (const file of ['world.js', 'icons.js', 'village-view.js', 'vendor/three.module.js', 'vendor/three.core.js']) assert.ok(existsSync(new URL(file, site)), file);
  } finally { rmSync(site, { recursive: true, force: true }); }
});
