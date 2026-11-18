import crypto from 'node:crypto';
import { loadCore } from './core.mjs';
import { allowLocalPageNavigation } from './browser.mjs';

const { SetupServer, setupState, readCredentials, SetupError, SETUP_BODY_LIMIT } = await loadCore('src/setup.mjs');
const { discoverModels } = await loadCore('src/panel-settings.mjs');
const { validateBaseURL } = await loadCore('src/openai-backend.mjs');

// Extend the upstream server without weakening its static-page or save routes.
export class RelaySetup extends SetupServer {
  async handle(req, res) {
    allowLocalPageNavigation(req);
    if (req.url !== '/api/discover') return super.handle(req, res);
    const json = (status, value) => {
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store', 'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; frame-ancestors 'none'", 'referrer-policy': 'no-referrer' });
      res.end(JSON.stringify(value));
    };
    let started = false;
    try {
      if (req.headers.host !== this.hostHeader || req.headers.origin !== this.origin
        || req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(req.headers['sec-fetch-site'])) {
        throw new SetupError('origin_refused', 403);
      }
      if (this.failures >= 20) throw new SetupError('too_many_attempts', 429);
      const actual = Buffer.from(req.headers.authorization || ''), expected = Buffer.from('Bearer ' + this.key);
      if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) {
        this.failures++;
        throw new SetupError('unauthorized', 401);
      }
      if (req.method !== 'POST') throw new SetupError('method_not_allowed', 405);
      if (this.discovering || this.pending) throw new SetupError('setup_busy', 409);
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) throw new SetupError('json_required', 415);
      if (Number(req.headers['content-length']) > SETUP_BODY_LIMIT) throw new SetupError('request_too_large', 413);
      this.discovering = started = true;
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > SETUP_BODY_LIMIT) throw new SetupError('request_too_large', 413);
        chunks.push(chunk);
      }
      let input;
      try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new SetupError('invalid_json'); }
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new SetupError('invalid_json');
      let baseURL;
      try { baseURL = validateBaseURL(input.baseURL); } catch { throw new SetupError('invalid_base_url'); }
      let apiKey = typeof input.apiKey === 'string' ? input.apiKey.trim() : '';
      if (!apiKey) {
        const state = setupState({ paths: this.paths, platform: this.platform, uid: this.uid });
        const connection = state.connections.find(row => row.id === input.connectionId && row.baseURL === baseURL);
        // A changed address must never receive the credential for the old one.
        if (state.receipt === 'owned' && connection) {
          apiKey = readCredentials(this.paths.credentials, { platform: this.platform, uid: this.uid })?.connectionApiKeys?.[connection.id];
        }
      }
      if (typeof apiKey !== 'string' || !/^[\x21-\x7e]{1,4096}$/.test(apiKey)) throw new SetupError('invalid_api_key');
      try {
        const result = await discoverModels({ connection: { id: input.connectionId || 'relay', baseURL }, apiKey });
        json(200, { models: result.models, modelCount: result.modelCount });
      } catch (error) {
        const allowed = ['discovery_timeout', 'discovery_http_error', 'discovery_too_large', 'discovery_invalid_catalog'];
        json(502, { error: { code: allowed.includes(error.message) ? error.message : 'discovery_unavailable',
          ...(Number.isInteger(error.httpStatus) ? { httpStatus: error.httpStatus } : {}) } });
      }
    } catch (error) {
      if (!res.headersSent && !res.destroyed) json(error instanceof SetupError ? error.status : 503,
        { error: { code: error instanceof SetupError ? error.message : 'discovery_unavailable' } });
    } finally { if (started) this.discovering = false; }
  }
}
