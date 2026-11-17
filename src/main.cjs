const { app, BrowserWindow, Tray, Menu, nativeImage, dialog, shell } = require('electron');
const { fork, execFile } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { desktopPaths, runtimeEnvironment } = require('./desktop.cjs');

app.setName('Kimi Relay');
// Test runs have their own Chromium storage as well as their own gateway data.
if (process.env.KIMI_RELAY_HOME) app.setPath('userData', path.join(path.resolve(process.env.KIMI_RELAY_HOME), 'desktop'));
const single = app.requestSingleInstanceLock();
if (!single) app.quit();
let window, tray, worker, quitting = false, paths, currentURL;
const allowedOrigins = new Set();
const testMode = process.argv.includes('--relay-smoke');
const project = path.resolve(__dirname, '..');
const iconFile = path.join(project, 'assets', 'icon.png');

function allowed(value) {
  try { const u = new URL(value); return u.protocol === 'http:' && u.hostname === '127.0.0.1'
    && !u.username && !u.password && allowedOrigins.has(u.origin); } catch { return false; }
}

function show() { if (!window || window.isDestroyed()) return; window.show(); window.focus(); }

async function stopWorker() {
  const owned = worker;
  worker = null;
  if (!owned || owned.exitCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => { owned.kill(); resolve(); }, 10000);
    owned.once('exit', () => { clearTimeout(timer); resolve(); });
    if (owned.connected) owned.send({ action: 'stop' });
    else owned.kill();
  });
}

async function startWorker(setup = false) {
  await stopWorker();
  const child = fork(paths.worker, ['--state-dir', paths.state, ...(setup ? ['--setup'] : []),
    ...(testMode ? ['--no-native', '--kimi-dir', path.join(paths.state, 'test-kimi')] : [])], {
    execPath: paths.node, execArgv: [], windowsHide: true,
    env: runtimeEnvironment(process.env, paths.core), stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  worker = child;
  child.on('message', message => {
    if (child !== worker) return;
    if (message.event === 'ready') {
      const u = new URL(message.url);
      if (u.protocol !== 'http:' || u.hostname !== '127.0.0.1' || !u.port || u.username || u.password) return;
      allowedOrigins.add(u.origin);
      currentURL = message.url;
      window.loadURL(currentURL).catch(() => {});
      if (tray) tray.setToolTip(`Kimi Relay · ${message.mode === 'panel' ? '网关运行中' : '等待配置'}`);
    } else if (message.event === 'failure') {
      dialog.showMessageBox(window, { type: 'error', title: 'Kimi Relay', message: '网关暂未启动',
        detail: '请检查网关端口是否被占用、配置与凭据是否完整。可以从菜单重新打开首次设置。\n错误代码：' + message.code });
    }
  });
  child.on('error', () => { if (!quitting) dialog.showErrorBox('Kimi Relay', '无法启动附带的运行环境，请重新解压完整发行包。'); });
  child.on('exit', () => {
    if (worker === child && !quitting) {
      worker = null;
      tray?.setToolTip('Kimi Relay · 网关已停止');
      dialog.showMessageBox(window, { type: 'error', message: '网关进程已停止', detail: '请从应用菜单重启网关。配置会保留。' });
    }
  });
}

async function restart(setup = false) {
  const { response } = await dialog.showMessageBox(window, { type: 'question', message: setup ? '打开首次设置？' : '重启本机网关？',
    detail: '请先结束正在运行的 Kimi 任务。重启期间第三方模型连接会短暂断开。',
    buttons: ['取消', '继续'], defaultId: 0, cancelId: 0 });
  if (response === 1) { show(); await startWorker(setup); }
}

async function removeDNS() {
  const { response } = await dialog.showMessageBox(window, { type: 'question', message: '撤销本工具添加的单域名解析？',
    detail: '请先在 Kimi 的第三方模型网关设置中断开连接。此操作只删除归属匹配的条目，系统可能请求管理员授权。',
    buttons: ['取消', '撤销解析'], defaultId: 0, cancelId: 0 });
  if (response !== 1) return;
  execFile(paths.node, [path.join(paths.core, 'bin', 'kimi-work-gateway.mjs'), 'remove-dns', '--state-dir', paths.state],
    { env: runtimeEnvironment(process.env, paths.core), windowsHide: true, timeout: 200000 }, (error) => {
      dialog.showMessageBox(window, { type: error ? 'error' : 'info', message: error ? '解析撤销未完成' : '单域名解析已撤销',
        detail: error ? '可能取消了系统授权，或条目已被修改。原有内容已保留，可参考恢复说明处理。' : '模型配置和 API Key 已保留在数据目录中。' });
    });
}

app.on('second-instance', show);
app.on('activate', show);
app.on('before-quit', event => {
  if (quitting) return;
  event.preventDefault(); quitting = true;
  void stopWorker().finally(() => app.quit());
});

if (single) app.whenReady().then(async () => {
  paths = desktopPaths({ packaged: app.isPackaged, resources: process.resourcesPath, project,
    executable: process.execPath, userData: app.getPath('userData'), env: process.env });
  fs.mkdirSync(paths.state, { recursive: true, mode: 0o700 });
  window = new BrowserWindow({ width: 1120, height: 860, minWidth: 760, minHeight: 660, title: 'Kimi Relay', icon: iconFile,
    backgroundColor: '#f4f3ef', webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true,
      partition: 'relay-' + process.pid, devTools: !app.isPackaged } });
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  window.webContents.session.setPermissionCheckHandler(() => false);
  window.webContents.on('will-navigate', (event, url) => { if (!allowed(url)) event.preventDefault(); });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (allowed(url)) { window.loadURL(url).catch(() => {}); show(); }
    else { try { if (new URL(url).protocol === 'https:') void shell.openExternal(url); } catch {} }
    return { action: 'deny' };
  });
  window.on('close', event => { if (!quitting && tray) { event.preventDefault(); window.hide(); } });
  const menu = Menu.buildFromTemplate([
    { label: 'Kimi Relay', submenu: [
      { label: '打开控制面板', click: () => { if (currentURL) window.loadURL(currentURL).catch(() => {}); show(); } },
      { label: '首次设置 / 修改接入', click: () => { void restart(true); } },
      { label: '重启网关', click: () => { void restart(); } },
      { type: 'separator' },
      { label: '打开数据目录', click: () => { void shell.openPath(paths.state); } },
      { label: '撤销单域名解析', click: () => { void removeDNS(); } },
      { label: '说明与更新', click: () => { void shell.openExternal('https://github.com/miboyule/kimi-relay'); } },
      { type: 'separator' }, { label: '退出 Kimi Relay', click: () => app.quit() },
    ] },
    { label: '编辑', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
  ]);
  Menu.setApplicationMenu(menu);
  try {
    const icon = nativeImage.createFromPath(iconFile).resize({ width: process.platform === 'darwin' ? 18 : 24, height: process.platform === 'darwin' ? 18 : 24 });
    tray = new Tray(icon); tray.setToolTip('Kimi Relay · 正在启动');
    tray.setContextMenu(menu); tray.on('double-click', show); tray.on('click', show);
  } catch {}
  if (!fs.existsSync(paths.node)) {
    dialog.showErrorBox('Kimi Relay', '附带的 Node 运行环境缺失。源码开发请先运行 npm run runtime；普通用户请重新解压完整发行包。');
    app.quit(); return;
  }
  await startWorker();
});
