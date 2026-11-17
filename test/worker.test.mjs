import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const wait = (child, predicate) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { cleanup(); reject(Error('worker_timeout')); }, 15000);
  const listener = value => {
    if (value.event === 'failure') { cleanup(); reject(Error(value.code)); }
    else if (predicate(value)) { cleanup(); resolve(value); }
  };
  const cleanup = () => { clearTimeout(timer); child.off('message', listener); };
  child.on('message', listener);
});

test('isolated setup, real chat + SSE + Responses forwarding, authentication and shutdown', { timeout: 45000 }, async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'kimi-relay-test-'));
  const requests = [];
  const upstream = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const payload = JSON.parse(Buffer.concat(chunks).toString());
    requests.push({ path: req.url, key: req.headers.authorization, payload });
    if (payload.stream) {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.end('data: {"choices":[{"delta":{"content":"relay-ok"}}]}\n\ndata: [DONE]\n\n');
    } else {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ id: 'synthetic-response', object: req.url.includes('responses') ? 'response' : 'chat.completion',
        choices: [{ message: { role: 'assistant', content: 'relay-ok' } }] }));
    }
  });
  upstream.listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const reservation = http.createServer().listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const port = reservation.address().port;
  await new Promise(resolve => reservation.close(resolve));
  const child = fork(path.join(root, 'src/worker.mjs'), ['--state-dir', directory, '--kimi-dir', path.join(directory, 'kimi'), '--no-native'],
    { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  let output = '';
  child.stdout.on('data', value => { output += value; });
  child.stderr.on('data', value => { output += value; });
  t.after(async () => {
    if (child.connected) child.send({ action: 'stop' });
    if (child.exitCode === null) await Promise.race([once(child, 'exit'), new Promise(resolve => setTimeout(resolve, 5000))]);
    if (child.exitCode === null) child.kill();
    upstream.closeAllConnections();
    await new Promise(resolve => upstream.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  });
  const setup = await wait(child, message => message.event === 'ready');
  assert.equal(setup.mode, 'setup');
  const url = new URL(setup.url);
  const key = new URLSearchParams(url.hash.slice(1)).get('key');
  const origin = url.origin;
  const unauthorized = await fetch(origin + '/api/state');
  assert.equal(unauthorized.status, 401);
  const headers = { 'authorization': 'Bearer ' + key, 'content-type': 'application/json', origin };
  const crossSite = await fetch(origin + '/api/save', { method: 'POST', headers: { ...headers, origin: 'https://other.invalid' }, body: '{}' });
  assert.equal(crossSite.status, 403);
  const ready = wait(child, message => message.event === 'ready' && message.mode === 'panel');
  const result = await fetch(origin + '/api/save', { method: 'POST', headers,
    body: JSON.stringify({ connections: [{ id: 'relay', name: 'Synthetic', baseURL: `http://127.0.0.1:${upstream.address().port}/v1`, apiKey: 'synthetic-upstream-key' }],
      port, dns: false, installService: false, models: [
        { id: 'relay/kimi-deepseek-chat', name: 'Test Chat', upstreamModelId: 'deepseek-chat', connectionId: 'relay', protocol: 'chat', contextWindow: 32768, tools: true },
        { id: 'relay/resp-gpt-test', upstreamModelId: 'gpt-test', connectionId: 'relay', protocol: 'responses', contextWindow: 32768 },
      ] }) });
  assert.equal(result.status, 200, await result.text());
  const panel = await ready.catch(error => { throw Error(error.message + ': ' + output); });
  assert.equal(panel.mode, 'panel');
  const credentials = JSON.parse(await fs.readFile(path.join(directory, 'credentials.json'), 'utf8'));
  const gateway = `http://127.0.0.1:${port}/v1`;
  assert.equal((await fetch(gateway + '/models')).status, 401);
  const auth = { 'authorization': 'Bearer ' + credentials.gatewayToken, 'content-type': 'application/json' };
  const catalog = await (await fetch(gateway + '/models', { headers: auth })).json();
  assert.equal(catalog.data.length, 2);
  for (const stream of [false, true]) {
    const response = await fetch(gateway + '/chat/completions', { method: 'POST', headers: auth,
      body: JSON.stringify({ model: 'relay/kimi-deepseek-chat', stream, messages: [{ role: 'user', content: 'synthetic test' }] }) });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /relay-ok/);
  }
  const response = await fetch(gateway + '/responses', { method: 'POST', headers: auth,
    body: JSON.stringify({ model: 'relay/resp-gpt-test', input: 'synthetic test' }) });
  assert.equal(response.status, 200);
  assert.equal(requests.length, 3);
  assert.equal(requests[0].payload.model, 'deepseek-chat');
  assert.equal(requests[2].path, '/v1/responses');
  assert.equal(requests[2].payload.model, 'gpt-test');
  assert.equal(requests[0].key, 'Bearer synthetic-upstream-key');
  const state = await (await fetch(origin + '/api/state', { headers: { authorization: 'Bearer ' + key } })).text();
  assert.equal(state.includes('synthetic-upstream-key'), false);
  assert.equal(output.includes('synthetic-upstream-key'), false);
  assert.equal(output.includes(credentials.gatewayToken), false);
  const exited = once(child, 'exit');
  child.send({ action: 'stop' });
  assert.equal((await exited)[0], 0, output);
  assert.equal(await fs.access(path.join(directory, 'panel-entry.json')).then(() => true, () => false), false);
});
