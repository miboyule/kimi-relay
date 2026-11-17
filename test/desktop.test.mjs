import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { desktopPaths, runtimeEnvironment } = require('../src/desktop.cjs');

test('separate data directory does not adopt Kimi or gateway credentials from the environment', () => {
  const environment = runtimeEnvironment({ PATH: '/bin', HOME: '/home/test', KIMI_API_KEY: 'synthetic',
    KIMI_WORK_GATEWAY_TOKEN: 'synthetic', OTHER_SECRET: 'synthetic' }, '/core');
  assert.equal(environment.PATH, '/bin');
  assert.equal(environment.OTHER_SECRET, undefined);
  assert.equal(environment.KIMI_API_KEY, undefined);
  assert.equal(environment.KIMI_WORK_GATEWAY_TOKEN, undefined);
  const data = path.resolve('separate-data');
  const paths = desktopPaths({ packaged: true, resources: path.resolve('resources'), project: path.resolve('.'),
    executable: path.resolve('Relay.exe'), userData: path.resolve('default-data'), env: { KIMI_RELAY_HOME: data } });
  assert.equal(paths.state, data);
  assert.equal(paths.worker, path.resolve('resources/relay/worker.mjs'));
});
