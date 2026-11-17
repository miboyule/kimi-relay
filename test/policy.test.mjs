import test from 'node:test';
import assert from 'node:assert/strict';
import { createGuardedOnboarding, modelRoute, trustedPanelURL } from '../src/policy.mjs';

test('Chat and Responses aliases preserve the real model ID', () => {
  assert.equal(modelRoute('deepseek-chat', 'chat'), 'relay/kimi-deepseek-chat');
  assert.equal(modelRoute('vendor/gpt-test', 'responses'), 'relay/resp-vendor%2Fgpt-test');
  assert.throws(() => modelRoute('', 'chat'));
});

test('disabled DNS never executes an administrator operation', async () => {
  let prepared = 0;
  const onboarding = createGuardedOnboarding({ enabled: false,
    check: async () => ({ intranet: { passed: false } }),
    prepare: async () => { prepared++; return { state: 'done' }; } });
  assert.equal((await onboarding.ensure({ retry: true })).reason, 'relay_dns_permission_required');
  assert.equal(prepared, 0);
});

test('enabled DNS delegates once; existing working DNS needs no write', async () => {
  const check = async () => ({ intranet: { passed: true } });
  const prepare = async () => { throw Error('must not prepare'); };
  assert.equal((await createGuardedOnboarding({ enabled: false, check, prepare }).ensure()).state, 'ready');
  const enabled = createGuardedOnboarding({ enabled: true,
    check: async () => ({ intranet: { passed: false } }), prepare: async () => ({ state: 'done' }) });
  assert.equal((await enabled.ensure()).state, 'done');
});

test('desktop accepts only its own HTTP loopback panel', () => {
  assert.equal(trustedPanelURL('http://127.0.0.1:3456/#key=test', 3456), true);
  for (const url of ['https://evil.test', 'http://127.0.0.1:3457/', 'file:///etc/passwd', 'http://x@127.0.0.1:3456/']) {
    assert.equal(trustedPanelURL(url, 3456), false);
  }
});
