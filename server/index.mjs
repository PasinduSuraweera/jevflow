import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { buildRequest, normalizeResponse, HttpError } from './decisions.mjs';

const ROOT = fileURLToPath(new URL('../dist/', import.meta.url));
const FILES = new Map([['/', ['index.html', 'text/html']], ['/index.html', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']], ['/style.css', ['style.css', 'text/css']], ['/favicon.svg', ['favicon.svg', 'image/svg+xml']], ['/LICENSE.txt', ['LICENSE.txt', 'text/plain']]]);
const MAX_BODY = 32768;
const MAX_RESPONSE = 65536;
async function readJson(stream, maximum) {
  const chunks = []; let size = 0;
  for await (const chunk of stream) {
    size += chunk.length;
    if (size > maximum) throw new HttpError(413, 'Request or response exceeds its size limit.');
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'Invalid JSON.'); }
}
const headers = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
export function createApp({ fetchImpl = globalThis.fetch, publicOrigin = 'http://localhost:3000', timeoutMs = 15000, rateLimit = 20, maxConcurrent = 4 } = {}) {
  const origin = new URL(publicOrigin);
  if (origin.origin !== publicOrigin || (origin.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname))) throw new Error('PUBLIC_ORIGIN must be an HTTPS origin (HTTP is allowed only on loopback).');
  const buckets = new Map(); let active = 0;
  const server = createServer(async (req, res) => {
    const reply = (status, body) => {
      if (res.destroyed) return;
      res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(body));
    };
    try {
      const path = new URL(req.url, publicOrigin).pathname;
      if (path !== '/api/decision') {
        if (!['GET', 'HEAD'].includes(req.method)) return reply(405, { error: 'Method not allowed.' });
        const asset = FILES.get(path);
        if (!asset) return reply(404, { error: 'Not found.' });
        const content = await readFile(resolve(ROOT, asset[0]));
        res.writeHead(200, { ...headers, 'Content-Type': asset[1] + '; charset=utf-8' });
        return res.end(req.method === 'HEAD' ? undefined : content);
      }
      if (req.method !== 'POST') return reply(405, { error: 'Use POST.' });
      // Compare against configuration, never against a user-controlled Host header.
      if (req.headers.origin !== publicOrigin) return reply(403, { error: 'Request origin is not allowed.' });
      if ((req.headers['content-type'] || '').split(';')[0].trim() !== 'application/json') return reply(415, { error: 'Use application/json.' });
      const now = Date.now();
      for (const [key, bucket] of buckets) if (bucket.until <= now) buckets.delete(key);
      // Intentionally ignore forwarded headers. Behind a proxy this may be a shared limit.
      const address = req.socket.remoteAddress;
      let bucket = buckets.get(address);
      if (!bucket) {
        if (buckets.size >= 10000) return reply(429, { error: 'Server is busy. Try again later.' });
        bucket = { count: 0, until: now + 60000 }; buckets.set(address, bucket);
      }
      if (++bucket.count > rateLimit || active >= maxConcurrent) return reply(429, { error: 'Request limit reached. Try again shortly.' });
      const apiKey = req.headers['x-jev-key'];
      if (typeof apiKey !== 'string' || !/^[\x21-\x7e]{8,512}$/.test(apiKey)) return reply(401, { error: 'Enter a valid API key.' });
      if (Number(req.headers['content-length']) > MAX_BODY) return reply(413, { error: 'Context must fit within 32 KB.' });
      active++;
      const controller = new AbortController();
      const deadline = setTimeout(() => controller.abort(), timeoutMs);
      const disconnected = () => { if (!res.writableEnded) controller.abort(); };
      res.on('close', disconnected);
      try {
        const body = await readJson(req, MAX_BODY);
        const request = buildRequest(body);
        const started = performance.now();
        const upstream = await fetchImpl('https://api.typesafe.ai/v1/systemone', {
          method: 'POST', redirect: 'error', signal: controller.signal,
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        if (!upstream.ok) {
          await upstream.body?.cancel();
          const status = upstream.status;
          if (status === 401 || status === 403) throw new HttpError(401, 'Jev rejected this key or its access permissions.');
          if (status === 429) throw new HttpError(429, 'Jev rate or quota limit reached. Try again later.');
          throw new HttpError(502, 'Jev could not complete this request. Try again later.');
        }
        let raw;
        try { raw = await readJson(upstream.body, MAX_RESPONSE); }
        catch { if (controller.signal.aborted) throw new HttpError(504, 'Jev request timed out.'); throw new HttpError(502, 'Jev returned an invalid response.'); }
        const result = normalizeResponse(raw, request, body.scenario);
        result.latencyMs = Math.round(performance.now() - started);
        reply(200, result);
      } catch (error) {
        if (controller.signal.aborted) reply(504, { error: 'Request cancelled or timed out. Provider charges may still apply.' });
        else reply(error instanceof HttpError ? error.status : 502, { error: error instanceof HttpError ? error.message : 'Unable to reach Jev. Try again later.' });
      } finally { clearTimeout(deadline); res.off('close', disconnected); active--; }
    } catch (error) { reply(error instanceof HttpError ? error.status : 500, { error: error instanceof HttpError ? error.message : 'Unable to complete request.' }); }
  });
  server.requestTimeout = 20000;
  server.headersTimeout = 10000;
  server.maxHeadersCount = 40;
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const publicOrigin = process.env.PUBLIC_ORIGIN || `http://localhost:${port}`;
  createApp({ publicOrigin }).listen(port, process.env.HOST || '127.0.0.1', () => {
    console.log(`JevFlow listening on port ${port}.`);
  });
}
