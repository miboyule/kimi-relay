import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import { RelaySetup } from '../src/setup-discovery.mjs';

test('setup discovery authenticates and only reuses a saved key for its exact connection URL', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'relay-discovery-'));
  const calls = [];
  const upstream = http.createServer((req, res) => {
    calls.push(req.headers.authorization);
    if (req.url.startsWith('/error/')) { res.writeHead(401); res.end('synthetic-private-upstream-detail'); return; }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ data: [{ id: 'test-k3', reasoning: true, effort: { supported_levels: ['low','high','max'] } }] }));
  }).listen(0, '127.0.0.1');
  await once(upstream, 'listening');
  const baseURL = `http://127.0.0.1:${upstream.address().port}/v1`;
  const server = new RelaySetup({ stateDir: dir, uiDir: path.resolve('ui') });
  const entry = new URL(await server.start());
  t.after(async () => { await server.stop(); upstream.closeAllConnections(); await new Promise(r => upstream.close(r)); await fs.rm(dir, { recursive:true, force:true }); });
  const headers = { authorization: 'Bearer ' + entry.hash.slice(5), origin: entry.origin, 'content-type':'application/json' };
  const request = (body, extra = {}) => fetch(entry.origin + '/api/discover', { method:'POST', headers:{...headers,...extra}, body:JSON.stringify(body) });
  assert.equal((await request({baseURL,apiKey:'synthetic'}, {authorization:'bad'})).status,401);
  assert.equal((await request({baseURL,apiKey:'synthetic'}, {origin:'https://other.invalid'})).status,403);
  const found = await request({baseURL,apiKey:'synthetic',connectionId:'relay'});
  assert.equal(found.status,200);
  assert.deepEqual((await found.json()).models[0].reasoningEfforts,['low','high','max']);
  await server.save({connections:[{id:'relay',name:'test',baseURL,apiKey:'synthetic'}],models:[{id:'relay/kimi-test',upstreamModelId:'test',connectionId:'relay',protocol:'chat',contextWindow:32768,tools:true}],dns:false,installService:false});
  assert.equal((await request({baseURL,connectionId:'relay'})).status,200);
  const before = calls.length;
  assert.equal((await request({baseURL:baseURL+'/other',connectionId:'relay'})).status,400);
  assert.equal(calls.length,before);
  assert.deepEqual(calls,['Bearer synthetic','Bearer synthetic']);
  assert.equal((await request({baseURL:'https://example.com/v1?key=x',apiKey:'synthetic'})).status,400);
  const failed = await request({baseURL:baseURL.replace('/v1','/error'),apiKey:'synthetic'});
  assert.equal(failed.status,502);
  assert.deepEqual(await failed.json(),{error:{code:'discovery_http_error',httpStatus:401}});
});

