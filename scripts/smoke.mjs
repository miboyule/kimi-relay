import { _electron as electron } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { once } from 'node:events';
import assert from 'node:assert/strict';

const state = await fs.mkdtemp(path.join(os.tmpdir(), 'kimi-relay-smoke-'));
const arch = process.env.RELAY_ARCH || process.arch;
const executablePath = process.platform === 'win32' ? path.resolve('dist/win-unpacked/Kimi Relay.exe')
  : path.resolve(`dist/${arch === 'arm64' ? 'mac-arm64' : 'mac'}/Kimi Relay.app/Contents/MacOS/Kimi Relay`);
const upstream = http.createServer(async (req, res) => {
  for await (const chunk of req) {} // Synthetic endpoint; never a real paid request.
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ id: 'smoke-test', choices: [{ message: { role: 'assistant', content: 'relay-smoke-ok' } }] }));
});
upstream.listen(0, '127.0.0.1');
await once(upstream, 'listening');
const reservation = http.createServer().listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
let desktop;
try {
  desktop = await electron.launch({ executablePath, args: ['--relay-smoke'],
    env: { ...process.env, KIMI_RELAY_HOME: state }, timeout: 45000 });
  const window = await desktop.firstWindow();
  const errors = [];
  window.on('pageerror', error => errors.push(error.message));
  await window.getByRole('heading', { name: '连接你的模型' }).waitFor({ timeout: 45000 });
  await fs.mkdir('.test-artifacts', { recursive: true });
  await window.screenshot({ path: '.test-artifacts/first-run.png', fullPage: true });
  assert.equal(await window.evaluate(() => typeof window.require), 'undefined');
  const initialOrigin = new URL(window.url()).origin;
  await window.locator('#name').fill('Isolated smoke test');
  await window.locator('#url').fill(`http://127.0.0.1:${upstream.address().port}/v1`);
  await window.locator('#key').fill('synthetic-smoke-key');
  await window.locator('#models').fill('deepseek-chat');
  await window.locator('summary').click();
  await window.locator('#port').fill(String(port));
  await window.getByRole('button', { name: '保存并打开控制面板' }).click();
  await window.waitForURL(url => url.protocol === 'http:' && url.origin !== initialOrigin, { timeout: 45000 });
  await window.locator('body').waitFor();
  const credentials = JSON.parse(await fs.readFile(path.join(state, 'credentials.json'), 'utf8'));
  const response = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, { method: 'POST',
    headers: { authorization: 'Bearer ' + credentials.gatewayToken, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'relay/kimi-deepseek-chat', messages: [{ role: 'user', content: 'synthetic test' }] }) });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /relay-smoke-ok/);
  assert.deepEqual(errors, []);
  console.log('Packaged desktop: setup, sandboxed page, panel handoff and real HTTP relay passed.');
} finally {
  if (desktop) await desktop.close();
  upstream.closeAllConnections();
  await new Promise(resolve => upstream.close(resolve));
  // The path is a dedicated mkdtemp directory under the system temp directory.
  if (!path.resolve(state).startsWith(path.resolve(os.tmpdir()) + path.sep)) throw Error('invalid_cleanup_path');
  await fs.rm(state, { recursive: true, force: true });
}
