import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectWindowsApplication } from '../src/windows-processes.mjs';

const application = 'C:\\Programs\\Kimi\\Kimi.exe';
const inspect = rows => inspectWindowsApplication(application, {
  run: () => ({ status: 0, stdout: JSON.stringify(rows.map(row => ({ helper: false, ...row }))) }),
});
test('Windows Kimi helpers belong to one application, not separate installations', () => {
  assert.deepEqual(inspect([
    { pid: 10, parent: 1, executable: application },
    { pid: 11, parent: 10, executable: application, helper: true },
    { pid: 12, parent: 11, executable: application.toLowerCase(), helper: true },
  ]), { pids: [10], nameMatches: 1, total: 3 });
});
test('independent instances and unverified executable paths remain ambiguous', () => {
  assert.deepEqual(inspect([
    { pid: 10, parent: 1, executable: application },
    { pid: 11, parent: 10, executable: application },
    { pid: 12, parent: 10, executable: 'C:\\Other\\Kimi.exe' },
    { pid: 13, parent: 10, executable: null },
  ]), { pids: [10, 11], nameMatches: 4, total: 4 });
});
test('failed or malformed process discovery never proves that Kimi is closed', () => {
  for (const result of [{ status: 1, stdout: '' }, { status: 0, stdout: 'invalid' },
    { status: 0, stdout: '[{"pid":1,"parent":1,"executable":"C:\\\\Kimi.exe","helper":false}]' }]) {
    assert.throws(() => inspectWindowsApplication(application, { run: () => result }));
  }
});
