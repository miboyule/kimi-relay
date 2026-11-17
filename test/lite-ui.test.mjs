import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

test('modify connection waits for setup readiness and actually opens the form', async () => {
  const elements = Object.fromEntries(['status', 'detail', 'panel'].map(id => [id, {}]));
  let click, mode = 'panel', polls = 0, destination;
  const button = { dataset: { action: 'setup' }, addEventListener: (_, handler) => { click = handler; } };
  vm.runInNewContext(fs.readFileSync(new URL('../ui/lite.js', import.meta.url), 'utf8'), {
    URL, URLSearchParams, sessionStorage: { getItem() {}, setItem() {} }, history: { replaceState() {} },
    location: { hash: '#key=synthetic', assign: url => { destination = url; } },
    document: { getElementById: id => elements[id], querySelectorAll: () => [button] },
    confirm: () => true, setInterval() {}, setTimeout: callback => { callback(); },
    fetch: async (_route, options) => {
      if (options.method === 'POST') { mode = 'starting'; return { ok: true, json: async () => ({ ok: true }) }; }
      const current = mode === 'starting' && ++polls > 1 ? (mode = 'setup') : mode;
      return { ok: true, json: async () => ({ mode: current, url: current === 'starting' ? null : 'http://127.0.0.1:3456/#key=synthetic' }) };
    },
  });
  await click();
  assert.equal(destination, 'http://127.0.0.1:3456/#key=synthetic');
  assert.match(elements.detail.textContent, /设置/);
});
