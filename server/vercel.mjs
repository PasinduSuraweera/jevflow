import { createApp } from './index.mjs';

// On Vercel each API request runs in a function instead of a long-lived server. The same handler,
// origin checks, validation and limits apply. Limits live in memory per function instance, so add
// Vercel Firewall rate limiting for public deployments.
const https = host => (host ? `https://${host}` : null);
const publicOrigin = process.env.PUBLIC_ORIGIN || https(process.env.VERCEL_PROJECT_PRODUCTION_URL) || 'http://localhost:3000';
// Preview deployments get their own URLs. Allow exactly those, as reported by Vercel's system variables.
const extraOrigins = [...new Set([https(process.env.VERCEL_URL), https(process.env.VERCEL_BRANCH_URL)])].filter(o => o && o !== publicOrigin);
const server = createApp({
  publicOrigin,
  extraOrigins,
  ...(process.env.RATE_LIMIT ? { rateLimit: Number(process.env.RATE_LIMIT) } : {}),
  ...(process.env.MAX_CONCURRENT ? { maxConcurrent: Number(process.env.MAX_CONCURRENT) } : {}),
});

export default function handler(req, res) {
  return new Promise(resolve => {
    res.once('finish', resolve);
    res.once('close', resolve);
    server.emit('request', req, res);
  });
}
