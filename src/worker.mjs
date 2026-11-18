import fs from 'node:fs';
import path from 'node:path';
import { lookup } from 'node:dns/promises';
import { fileURLToPath } from 'node:url';
import { loadCore } from './core.mjs';
import { createGuardedOnboarding } from './policy.mjs';
import { backupFiles, kimiBackupFiles } from './migration.mjs';
import { RelayPanelController, RelayPanel } from './panel.mjs';
import { inspectWindowsApplication } from './windows-processes.mjs';
import { RelaySetup } from './setup-discovery.mjs';

const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
if (!args.includes('--state-dir') || !process.send) throw Error('relay_worker_requires_private_ipc');
const stateDir = path.resolve(option('--state-dir'));
const noNative = args.includes('--no-native');
const kimiDir = args.includes('--kimi-dir') ? path.resolve(option('--kimi-dir')) : undefined;
const configFile = path.join(stateDir, 'gateway.json');
const entryFile = path.join(stateDir, 'panel-entry.json');
const send = value => { if (process.connected) process.send(value); };
const { run } = await loadCore('cli.mjs');
const { setupPaths, setupState, writePrivateJson } = await loadCore('src/setup.mjs');
let setup, panelTask, releasePanel, shuttingDown = false;
let activeGateway;
let lastCode = null;

function failure(code) {
  // No upstream messages, URLs, arguments, or credentials cross this channel.
  send({ event: 'failure', code: /^[a-z0-9_]+$/.test(code) ? code : 'gateway_start_failed' });
}

async function startPanel() {
  if (panelTask) return;
  lastCode = null;
  const shutdown = new Promise(resolve => { releasePanel = resolve; });
  // createNativeConnection is synchronous in upstream; load its dependencies
  // before calling run, then provide the already resolved factory.
  let factory;
  if (!noNative) {
    const { createNativeConnection, protectedConnectionEnvNames } = await loadCore('src/native-connection.mjs');
    const { NativeOnboarding } = await loadCore('src/native-onboarding.mjs');
    const { NativeDesktopRuntime } = await loadCore('src/native-desktop-runtime.mjs');
    const { NativeSetupProbe } = await loadCore('src/native-status.mjs');
    const { nativeFlagFile } = await loadCore('src/paths.mjs');
    const { defaultKimiDirectory } = await loadCore('src/paths.mjs');
    backupFiles(kimiBackupFiles(kimiDir || defaultKimiDirectory()), path.join(stateDir, 'backups'));
    factory = options => {
      activeGateway = options.gateway;
      const base = new NativeOnboarding(options);
      const probe = new NativeSetupProbe({ flagFile: nativeFlagFile(options.kimiDir), lookupFn: lookup });
      const onboarding = createGuardedOnboarding({ enabled: options.config.dns.enabled,
        check: () => probe.check(), prepare: input => base.ensure(input),
        reveal: async () => writePrivateJson(base.flagFile, base.setup.flagValue()) });
      const desktop = new NativeDesktopRuntime({ ...options,
        protectedEnvNames: protectedConnectionEnvNames(options.config), gatewayBusy: () => options.gateway.inflight.size });
      if (process.platform === 'win32') {
        desktop.runtime.inspectApplication = application => inspectWindowsApplication(application);
        desktop.runtime.runningPids = application => inspectWindowsApplication(application).pids;
      }
      return createNativeConnection({ ...options, onboarding, desktop });
    };
  }
  panelTask = run(['panel', '--config', configFile, '--credentials', path.join(stateDir, 'credentials.json'),
    '--state-dir', stateDir, '--entry-file', entryFile, '--ui-port', '0',
    ...(kimiDir ? ['--kimi-dir', kimiDir] : []), ...(noNative ? ['--no-native'] : [])], process.env,
  { out: () => {}, err: line => { if (noNative) process.stderr.write(line + '\n'); } }, {
    waitForShutdown: () => shutdown, PanelController: RelayPanelController, GatewayPanel: RelayPanel,
    ...(factory ? { createNativeConnection: factory } : {}),
    ...(noNative ? { contextPolicy: false, mcpManager: false } : {}),
  }).then(code => { lastCode = code; return code; }).catch(() => { lastCode = 3; return 3; });
  for (let attempt = 0; attempt < 150 && !shuttingDown; attempt++) {
    if (lastCode !== null) { panelTask = null; throw Error('gateway_start_failed'); }
    try {
      const entry = JSON.parse(fs.readFileSync(entryFile, 'utf8'));
      if (entry.pid === process.pid && typeof entry.entryURL === 'string') {
        send({ event: 'ready', mode: 'panel', url: entry.entryURL });
        return;
      }
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  releasePanel?.();
  await panelTask;
  panelTask = null;
  throw Error('gateway_start_timeout');
}

async function startSetup() {
  const colocated = fileURLToPath(new URL('./ui/', import.meta.url));
  setup = new RelaySetup({ stateDir, uiDir: fs.existsSync(colocated) ? colocated : fileURLToPath(new URL('../ui/', import.meta.url)),
    onSaved: () => { void startPanel().catch(error => failure(error.message)); } });
  const save = setup.save.bind(setup);
  setup.save = async input => {
    // Back up our own previous settings before an authenticated form can save.
    const existing = [configFile, path.join(stateDir, 'credentials.json'), path.join(stateDir, 'setup-receipt.json')];
    if (existing.some(file => fs.existsSync(file))) backupFiles(existing, path.join(stateDir, 'backups'));
    const saved = await save({ ...input, dns: input.dns === true, installService: false });
    // The browser edition has no Electron navigation listener. Authenticated
    // setup polling waits for the panel started by onSaved, including retries.
    setup.pendingPanel = { reason: 'panel_not_ready', previousEntryURL: null };
    return saved;
  };
  send({ event: 'ready', mode: 'setup', url: await setup.start() });
}

async function stop() {
  if (shuttingDown) return;
  shuttingDown = true;
  await setup?.stop();
  releasePanel?.();
  await panelTask;
}

let finishTask;
function finish() {
  finishTask ??= stop().then(() => {
    process.removeAllListeners('disconnect');
    if (process.connected) process.disconnect();
    process.exitCode = 0;
  });
  return finishTask;
}
process.on('message', message => {
  if (message?.action === 'status') send({ event: 'status', inflight: activeGateway?.inflight.size ?? 0 });
  if (message?.action === 'stop') void finish();
});
process.on('disconnect', () => { void finish(); });
process.on('SIGTERM', () => { void finish(); });
try {
  const configured = setupState({ paths: setupPaths({ stateDir }) }).configured;
  if (configured && !args.includes('--setup')) await startPanel();
  else await startSetup();
} catch (error) { failure(error.message); }
