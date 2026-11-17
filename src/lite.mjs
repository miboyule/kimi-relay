import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { fork, spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { LiteControl, liteStateDirectory } from './lite-control.mjs';
import { createRequire } from 'node:module';
const { runtimeEnvironment } = createRequire(import.meta.url)('./desktop.cjs');
const execute = promisify(execFile);
const script = fileURLToPath(import.meta.url);
const project = fileURLToPath(new URL('../', import.meta.url));
const flags = process.argv.slice(2);
const directory = liteStateDirectory();
const record = path.join(directory, 'lite-entry.json');
const lock = path.join(directory, 'lite.lock');
const instance = crypto.randomBytes(16).toString('hex');
const core = path.join(project, 'vendor/kimi-work-gateway');
let control, child, stopping = false, ownedLock = false;
let snapshot = { mode: 'starting', url: null, error: null };

async function open(target, folder = false) {
  if (flags.includes('--headless')) return;
  if (process.platform === 'win32') await execute(folder ? 'explorer.exe' : 'rundll32.exe', folder ? [target] : ['url.dll,FileProtocolHandler', target], { windowsHide: true });
  else await execute('/usr/bin/open', [target]);
}
function privateJson(file, value) {
  const temporary = file + '.' + instance + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(value), { mode: 0o600, flag: 'wx' });
  fs.renameSync(temporary, file);
}
async function reuse() {
  try {
    const saved = JSON.parse(fs.readFileSync(record, 'utf8'));
    const url = new URL(saved.url);
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.username || url.password
      || !/^[a-f0-9]{64}$/.test(url.hash.slice(5))) return false;
    const response = await fetch(url.origin + '/api/status', { headers: { authorization: 'Bearer ' + url.hash.slice(5) }, signal: AbortSignal.timeout(1500) });
    if (!response.ok || (await response.json()).product !== 'Kimi Relay Lite') return false;
    await open(saved.url);
    return true;
  } catch { return false; }
}
async function stopWorker() {
  const previous = child;
  child = null;
  if (!previous || previous.exitCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => { previous.kill(); resolve(); }, 10000);
    previous.once('exit', () => { clearTimeout(timer); resolve(); });
    if (previous.connected) previous.send({ action: 'stop' });
    else previous.kill();
  });
}
async function startWorker(setup = false) {
  await stopWorker();
  snapshot = { mode: 'starting', url: null, error: null };
  child = fork(path.join(project, 'src/worker.mjs'), ['--state-dir', directory, ...(setup ? ['--setup'] : []),
    ...(flags.includes('--smoke') ? ['--no-native', '--kimi-dir', path.join(directory, 'test-kimi')] : [])], {
    execPath: process.execPath, execArgv: [], windowsHide: true,
    env: runtimeEnvironment(process.env, core), stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  const current = child;
  current.on('message', message => {
    if (current !== child || stopping) return;
    if (message.event === 'ready') {
      try {
        const url = new URL(message.url);
        if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port || url.username || url.password) return;
        snapshot = { mode: message.mode, url: message.url, error: null };
      } catch {}
    }
    if (message.event === 'failure') snapshot = { mode: 'stopped', url: null, error: /^[a-z0-9_]+$/.test(message.code) ? message.code : 'gateway_start_failed' };
  });
  current.on('error', () => { if (current === child) snapshot = { mode: 'stopped', url: null, error: 'worker_start_failed' }; });
  current.on('exit', () => { if (current === child && !stopping) snapshot = { mode: 'stopped', url: null, error: 'worker_stopped' }; });
}
async function stop() {
  if (stopping) return;
  stopping = true;
  await stopWorker();
  await control?.stop();
  if (ownedLock) {
    try { if (JSON.parse(fs.readFileSync(record, 'utf8')).instance === instance) fs.rmSync(record); } catch {}
    try { if (JSON.parse(fs.readFileSync(lock, 'utf8')).instance === instance) fs.rmSync(lock); } catch {}
  }
}
async function action(name) {
  if (name === 'stop') return stop();
  if (name === 'restart' || name === 'setup') return startWorker(name === 'setup');
  if (name === 'data') return open(directory, true);
  if (name === 'remove-dns') await execute(process.execPath,
    [path.join(core, 'bin/kimi-work-gateway.mjs'), 'remove-dns', '--state-dir', directory],
    { env: runtimeEnvironment(process.env, core), windowsHide: true, timeout: 200000 });
}
async function main() {
  if (flags.includes('--detach')) {
    const detached = spawn(process.execPath, [script, ...flags.filter(flag => flag !== '--detach')], {
      detached: true, stdio: 'ignore', windowsHide: true, env: process.env,
    });
    await new Promise((resolve, reject) => { detached.once('spawn', resolve); detached.once('error', reject); });
    detached.unref();
    return;
  }
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (await reuse()) return;
  // An exclusive lock prevents two workers from rewriting the same data during
  // simultaneous clicks. A live lock is never stolen, even before HTTP is ready.
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, instance }), { flag: 'wx', mode: 0o600 });
      ownedLock = true; break;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let previous;
      try { previous = JSON.parse(fs.readFileSync(lock, 'utf8')); } catch {}
      if (Number.isInteger(previous?.pid) && previous.pid > 0) {
        try { process.kill(previous.pid, 0); }
        catch (error) { if (error.code === 'ESRCH') { fs.rmSync(lock); continue; } }
      }
      if (await reuse()) return;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  if (!ownedLock) throw Error('lite_instance_busy');
  control = new LiteControl({ snapshot: () => snapshot, action });
  await control.start();
  privateJson(record, { url: control.entryURL, pid: process.pid, instance });
  process.on('SIGTERM', () => { void stop(); });
  process.on('SIGINT', () => { void stop(); });
  await startWorker();
  await open(control.entryURL);
}
try { await main(); }
catch {
  await stop();
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const errorFile = path.join(directory, 'lite-error.txt');
  fs.writeFileSync(errorFile, 'Kimi Relay Lite 启动未完成。请退出旧版 Relay，完整解压轻量版后重试。\nStartup failed. Exit the previous Relay and extract the complete Lite archive.\n', { mode: 0o600 });
  if (!flags.includes('--headless')) {
    try { await execute(process.platform === 'win32' ? 'notepad.exe' : '/usr/bin/open', [errorFile], { windowsHide: true }); } catch {}
  }
  process.exitCode = 1;
}
