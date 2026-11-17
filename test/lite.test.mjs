import test from 'node:test';
import assert from 'node:assert/strict';
import { LiteControl, liteStateDirectory } from '../src/lite-control.mjs';
import path from 'node:path';
import { allowLocalPageNavigation } from '../src/browser.mjs';

test('cross-port navigation permits public HTML only, preserving API CSRF guards', () => {
  const headers = { 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document', 'sec-fetch-site': 'same-site' };
  const page = { method: 'GET', url: '/', headers: { ...headers } };
  allowLocalPageNavigation(page);
  assert.equal(page.headers['sec-fetch-site'], 'none');
  for (const request of [
    { method: 'GET', url: '/api/state', headers: { ...headers } },
    { method: 'POST', url: '/', headers: { ...headers } },
    { method: 'GET', url: '/', headers: { ...headers, origin: 'http://other.test' } },
    { method: 'GET', url: '/', headers: { ...headers, 'sec-fetch-mode': 'cors' } },
  ]) {
    allowLocalPageNavigation(request);
    assert.equal(request.headers['sec-fetch-site'], 'same-site');
  }
});

test('Lite reuses desktop data unless portable data was explicitly selected', () => {
  assert.equal(liteStateDirectory({ platform: 'win32', env: { APPDATA: 'C:/Users/test/AppData/Roaming' }, home: '/test' }),
    path.resolve('C:/Users/test/AppData/Roaming/Kimi Relay/gateway'));
  assert.equal(liteStateDirectory({ platform: 'darwin', env: {}, home: '/Users/test' }),
    path.resolve('/Users/test/Library/Application Support/Kimi Relay/gateway'));
  assert.equal(liteStateDirectory({ env: { KIMI_RELAY_HOME: './separate' } }), path.resolve('separate'));
});

test('browser lifecycle controls require token, local host and exact origin', async t => {
  const actions = [];
  const control = new LiteControl({ snapshot: () => ({ mode: 'setup' }), action: action => { actions.push(action); } });
  await control.start();
  t.after(() => control.stop());
  const origin = new URL(control.entryURL).origin;
  const token = new URL(control.entryURL).hash.slice(5);
  const api = (route, options = {}) => fetch(origin + route, options);
  assert.equal((await api('/api/status')).status, 401);
  assert.equal((await api('/api/status', { headers: { authorization: 'Bearer ' + token } })).status, 200);
  const headers = { authorization: 'Bearer ' + token, 'content-type': 'application/json' };
  assert.equal((await api('/api/restart', { method: 'POST', headers })).status, 403);
  assert.equal((await api('/api/restart', { method: 'POST', headers: { ...headers, origin: 'https://other.test' } })).status, 403);
  assert.equal((await api('/api/restart', { method: 'POST', headers: { ...headers, origin } })).status, 200);
  assert.deepEqual(actions, ['restart']);
  assert.equal((await api('/api/arbitrary-command', { method: 'POST', headers: { ...headers, origin } })).status, 404);
  const html = await api('/');
  assert.match(html.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.ok(!(await html.text()).includes(token));
});
