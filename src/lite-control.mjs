import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function liteStateDirectory({ platform = process.platform, env = process.env, home = os.homedir() } = {}) {
  return path.resolve(env.KIMI_RELAY_HOME || (platform === 'win32'
    ? path.join(env.APPDATA || path.join(home, 'AppData/Roaming'), 'Kimi Relay/gateway')
    : path.join(home, 'Library/Application Support/Kimi Relay/gateway')));
}

// Only the private fragment authenticates the browser; static assets never
// embed it, and no control operation accepts cross-origin or unauthenticated calls.
export class LiteControl {
  constructor({ snapshot, action }) {
    this.snapshot = snapshot;
    this.action = action;
    this.token = crypto.randomBytes(32).toString('hex');
    this.busy = false;
  }

  async start() {
    this.server = http.createServer((req, res) => { void this.handle(req, res); });
    this.server.requestTimeout = 10000;
    this.server.headersTimeout = 10000;
    await new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(0, '127.0.0.1', resolve);
    });
    this.origin = 'http://127.0.0.1:' + this.server.address().port;
    this.entryURL = this.origin + '/#key=' + this.token;
    return this.entryURL;
  }

  async handle(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
    const json = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
    try {
      if (req.headers.host !== new URL(this.origin).host
        || req.headers.origin && req.headers.origin !== this.origin
        || req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site'])) {
        json(403, { error: 'origin_refused' }); return;
      }
      const assets = { '/': ['lite.html', 'text/html'], '/lite.js': ['lite.js', 'text/javascript'], '/lite.css': ['lite.css', 'text/css'] };
      if (assets[req.url] && req.method === 'GET') {
        const [name, type] = assets[req.url];
        res.writeHead(200, { 'Content-Type': type + '; charset=utf-8' });
        res.end(fs.readFileSync(new URL('../ui/' + name, import.meta.url))); return;
      }
      const expected = Buffer.from('Bearer ' + this.token);
      const supplied = Buffer.from(req.headers.authorization || '');
      if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
        json(401, { error: 'unauthorized' }); return;
      }
      if (req.method === 'GET' && req.url === '/api/status') {
        json(200, { product: 'Kimi Relay Lite', ...this.snapshot(), busy: this.busy }); return;
      }
      if (req.method !== 'POST' || req.headers.origin !== this.origin) {
        json(403, { error: 'origin_refused' }); return;
      }
      const action = req.url?.startsWith('/api/') ? req.url.slice(5) : '';
      if (!['restart', 'setup', 'stop', 'remove-dns', 'data'].includes(action)) {
        json(404, { error: 'not_found' }); return;
      }
      if (this.busy) { json(409, { error: 'busy' }); return; }
      this.busy = true;
      try {
        // Flush Stop before closing this listener; all operations are serialized.
        if (action === 'stop') {
          res.once('finish', () => { void Promise.resolve().then(() => this.action(action)).catch(() => {}); });
          json(200, { ok: true });
        } else {
          await this.action(action);
          json(200, { ok: true });
        }
      } finally { this.busy = false; }
    } catch {
      if (!res.headersSent && !res.destroyed) json(503, { error: 'operation_failed' });
    }
  }

  async stop() {
    if (!this.server) return;
    this.server.closeAllConnections();
    await new Promise(resolve => this.server.close(resolve));
  }
}
