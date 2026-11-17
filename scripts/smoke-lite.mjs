import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import assert from 'node:assert/strict';

const state = await fs.mkdtemp(path.join(os.tmpdir(), 'kimi-relay-lite-smoke-'));
const stage = path.resolve('dist', `lite-${process.platform === 'win32' ? 'win' : 'mac'}-${process.arch}`);
const runtime = path.join(stage, 'runtime', process.platform === 'win32' ? 'node.exe' : 'node');
const args = [path.join(stage, 'app/src/lite.mjs'), '--headless', '--smoke'];
const env = { ...process.env, KIMI_RELAY_HOME: state };
let launcher, browser, entry;
const upstream = http.createServer(async (req, res) => {
  for await (const chunk of req) {}
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ id: 'lite-smoke', choices: [{ message: { role: 'assistant', content: 'lite-forward-ok' } }] }));
});
upstream.listen(0, '127.0.0.1');
await once(upstream, 'listening');
const reservation = http.createServer().listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
async function waitFor(read, label) {
  for (let count = 0; count < 180; count++) {
    try { const value = await read(); if (value) return value; } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw Error('Timeout: ' + label);
}
async function api(route, post = false, auth = true) {
  const url = new URL(entry.url);
  return fetch(url.origin + '/api/' + route, { method: post ? 'POST' : 'GET',
    headers: { ...(auth ? { authorization: 'Bearer ' + url.hash.slice(5) } : {}), ...(post ? { origin: url.origin } : {}) } });
}
try {
  // Run delivered launch scripts, not just the source entry point. Headless test
  // flags isolate Kimi and suppress opening the user's own browser.
  if (process.platform === 'win32') {
    const source = await fs.readFile(path.join(stage, 'Start Kimi Relay.vbs'), 'utf8');
    assert.match(source, /--detach/);
    const script = path.join(stage, 'smoke-launch.vbs');
    await fs.writeFile(script, source.replace('--detach', '--detach --headless --smoke'));
    execFileSync('cscript.exe', ['//nologo', script], { env, windowsHide: true });
    await fs.rm(script);
  } else {
    const command = path.join(stage, 'Kimi Relay Lite.app/Contents/MacOS/launch');
    assert.ok((await fs.stat(command)).mode & 0o100);
    const source = await fs.readFile(command, 'utf8');
    await fs.writeFile(command, source.replace('--detach', '--detach --headless --smoke'), { mode: 0o755 });
    try { execFileSync(command, [], { env }); }
    finally { await fs.writeFile(command, source, { mode: 0o755 }); }
  }
  entry = await waitFor(async () => JSON.parse(await fs.readFile(path.join(state, 'lite-entry.json'), 'utf8')), 'startup');
  assert.equal((await api('status', false, false)).status, 401);
  await waitFor(async () => (await (await api('status')).json()).mode === 'setup', 'setup ready');
  launcher = spawn(runtime, args, { env, windowsHide: true, stdio: 'ignore' });
  const duplicateExit = await Promise.race([once(launcher, 'exit'), new Promise((_, reject) => { const timer = setTimeout(() => reject(Error('duplicate did not exit')), 10000); timer.unref(); })]);
  assert.equal(duplicateExit[0], 0);
  assert.equal(JSON.parse(await fs.readFile(path.join(state, 'lite-entry.json'), 'utf8')).pid, entry.pid);
  browser = await chromium.launch(process.env.RELAY_BROWSER_CHANNEL ? { channel: process.env.RELAY_BROWSER_CHANNEL } : {});
  const manager = await browser.newPage();
  const errors = [];
  manager.on('pageerror', error => errors.push(error.message));
  await manager.goto(entry.url);
  const link = manager.locator('#panel');
  await link.waitFor({ state: 'visible' });
  await fs.mkdir('.test-artifacts', { recursive: true });
  await manager.screenshot({ path: '.test-artifacts/lite-manager.png', fullPage: true });
  const opened = manager.context().waitForEvent('page');
  await link.click();
  const setup = await opened;
  setup.on('pageerror', error => errors.push(error.message));
  await setup.locator('#name').fill('Lite packaged test');
  await setup.locator('#url').fill(`http://127.0.0.1:${upstream.address().port}/v1`);
  await setup.locator('#key').fill('synthetic-lite-key');
  await setup.locator('#models').fill('deepseek-chat');
  await setup.locator('summary').click();
  await setup.locator('#port').fill(String(port));
  const originalOrigin = new URL(setup.url()).origin;
  await setup.getByRole('button', { name: '保存并打开控制面板' }).click();
  await setup.waitForURL(url => url.origin !== originalOrigin, { timeout: 45000 });
  const credentialsFile = path.join(state, 'credentials.json');
  let credentials = await fs.readFile(credentialsFile);
  const key = JSON.parse(credentials).gatewayToken;
  const result = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, { method: 'POST',
    headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'relay/kimi-deepseek-chat', messages: [{ role: 'user', content: 'synthetic' }] }) });
  assert.equal(result.status, 200);
  assert.match(await result.text(), /lite-forward-ok/);
  // Exercise UI controls and preserve credentials across a worker restart.
  manager.on('dialog', dialog => dialog.accept());
  await manager.locator('[data-action="restart"]').click();
  await waitFor(async () => (await (await api('status')).json()).mode === 'panel', 'restart');
  // The browser finishes its own post-restart status read before controls are
  // enabled. Do not intercept that read while preparing the late-poll scenario.
  await manager.waitForFunction(() => !document.querySelector('[data-action="stop"]').disabled);
  assert.deepEqual(await fs.readFile(credentialsFile), credentials);
  // A customer clicks Modify expecting the form itself, not a changed link.
  await manager.locator('[data-action="setup"]').click();
  await manager.locator('#name').waitFor({ state: 'visible' });
  await manager.waitForFunction(() => document.querySelector('#models').value === 'deepseek-chat');
  assert.equal(await manager.locator('#key').inputValue(), '');
  const modifiedOrigin = new URL(manager.url()).origin;
  await manager.getByRole('button', { name: '保存并打开控制面板' }).click();
  await manager.waitForURL(url => url.origin !== modifiedOrigin, { timeout: 45000 });
  const savedCredentials = await fs.readFile(credentialsFile);
  const { updatedAt: previousUpdate, ...previousValues } = JSON.parse(credentials);
  const { updatedAt: savedUpdate, ...savedValues } = JSON.parse(savedCredentials);
  assert.deepEqual(savedValues, previousValues);
  assert.ok(Date.parse(savedUpdate) >= Date.parse(previousUpdate));
  credentials = savedCredentials;
  await manager.goto(entry.url);
  await manager.locator('[data-action="stop"]').waitFor({ state: 'visible' });
  assert.deepEqual(errors, []);
  // Reproduce a late status response arriving after Stop. It must not replace
  // the final success message with a spurious connection error.
  let heldRoute, reportHeld;
  const held = new Promise(resolve => { reportHeld = resolve; });
  await manager.route('**/api/status', async route => {
    if (heldRoute) await route.continue();
    else { heldRoute = route; reportHeld(); }
  });
  await manager.evaluate(() => { window.pendingStatus = refresh(); });
  await held;
  await manager.locator('[data-action="stop"]').click();
  await manager.getByText('网关已停止', { exact: true }).waitFor();
  await heldRoute.abort();
  await manager.evaluate(() => window.pendingStatus);
  assert.equal(await manager.locator('#status').textContent(), '网关已停止');
  await manager.unroute('**/api/status');
  await waitFor(async () => { try { await fs.access(path.join(state, 'lite.lock')); return false; } catch { return true; } }, 'shutdown');
  await assert.rejects(fetch(`http://127.0.0.1:${port}/v1/models`));
  // A code-only overlay must never contain runtime or persistent state.
  if (process.platform === 'win32') {
    const version = JSON.parse(await fs.readFile('package.json')).version;
    execFileSync('python', ['-c', 'import zipfile,sys; z=zipfile.ZipFile(sys.argv[1]); assert all(not n.startswith(("runtime/","portable-data/")) and not n.endswith(("credentials.json","gateway.json")) for n in z.namelist()); z.extractall(sys.argv[2])',
      path.resolve(`dist/Kimi-Relay-Lite-${version}-code-only.zip`), stage]);
    assert.deepEqual(await fs.readFile(credentialsFile), credentials);
    const updated = spawn(runtime, args, { env, windowsHide: true, stdio: 'ignore' });
    entry = await waitFor(async () => JSON.parse(await fs.readFile(path.join(state, 'lite-entry.json'), 'utf8')), 'updated start');
    await waitFor(async () => (await (await api('status')).json()).mode === 'panel', 'code-only update');
    assert.equal((await api('stop', true)).status, 200);
    await once(updated, 'exit');
  }
  console.log('Packaged Lite: launch script, single instance, browser setup, forwarding, restart, exit and code-only isolation passed.');
} finally {
  try { if (entry) await api('stop', true); } catch {}
  await browser?.close();
  if (launcher?.exitCode === null) launcher.kill();
  upstream.closeAllConnections();
  await new Promise(resolve => upstream.close(resolve));
  if (!path.resolve(state).startsWith(path.resolve(os.tmpdir()) + path.sep)) throw Error('invalid_cleanup_path');
  await fs.rm(state, { recursive: true, force: true });
}
