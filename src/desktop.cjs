const path = require('node:path');
const fs = require('node:fs');

function desktopPaths({ packaged, resources, project, executable, userData, env }) {
  const portable = env.KIMI_RELAY_HOME || (fs.existsSync(path.join(path.dirname(executable), 'portable-mode'))
    ? path.join(path.dirname(executable), 'portable-data') : null);
  return {
    state: path.resolve(portable || path.join(userData, 'gateway')),
    node: path.join(packaged ? path.join(resources, 'runtime') : path.join(project, 'runtime'), process.platform === 'win32' ? 'node.exe' : 'node'),
    worker: path.join(packaged ? path.join(resources, 'relay') : path.join(project, 'src'), 'worker.mjs'),
    core: packaged ? path.join(resources, 'core') : path.join(project, 'vendor', 'kimi-work-gateway'),
  };
}

function runtimeEnvironment(env, core) {
  const names = new Set(['path','pathext','systemroot','windir','comspec','temp','tmp','home','userprofile','appdata','localappdata','lang','lc_all','tmpdir','username','user','homedrive','homepath']);
  return { ...Object.fromEntries(Object.entries(env).filter(([key]) => names.has(key.toLowerCase()))), KIMI_RELAY_CORE: core };
}

module.exports = { desktopPaths, runtimeEnvironment };
