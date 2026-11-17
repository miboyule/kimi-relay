'use strict';
const token = new URLSearchParams(location.hash.slice(1)).get('key') || sessionStorage.getItem('relay-lite-token');
if (token) sessionStorage.setItem('relay-lite-token', token);
history.replaceState(null, '', '/');
const statusLine = document.getElementById('status');
const detail = document.getElementById('detail');
const panel = document.getElementById('panel');
let stopped = false;
async function api(route, post = false) {
  const response = await fetch('/api/' + route, { method: post ? 'POST' : 'GET', headers: { authorization: 'Bearer ' + token } });
  const data = await response.json();
  if (!response.ok) throw Error(data.error === 'unauthorized' ? '会话已失效，请重新双击启动文件。' : '操作未完成，请稍后再试。');
  return data;
}
function trustedURL(value) {
  try { const url = new URL(value); return url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port && !url.username && !url.password; } catch { return false; }
}
async function refresh() {
  if (stopped) return;
  try {
    const state = await api('status');
    if (stopped) return;
    statusLine.textContent = state.error ? '启动失败：' + state.error : ({ panel: state.kimi?.imported ? '网关运行中 · 模型已导入 Kimi' : '网关运行中 · 等待 Kimi 接入', setup: '等待填写供应商', starting: '网关正在启动…', stopped: '网关已停止' }[state.mode] || '正在连接…');
    const connection = document.getElementById('connection');
    if (connection) connection.textContent = state.mode !== 'panel' ? '' : state.kimi?.imported
      ? '请在 Kimi Work 新建任务，选择供应商模型后发送消息。官方 K3 模型仍使用官方服务。'
      : state.kimi?.needsDNS ? '还需启用单域名解析：点击“修改接入”，在更多连接选项中勾选并保存，再到控制面板完成接入。'
      : '打开控制面板查看 Kimi 连接状态，点击“连接 / 重连 Kimi”。仅重启网关不会切换 Kimi 当前模型。';
    panel.hidden = !trustedURL(state.url);
    if (!panel.hidden) { panel.href = state.url; panel.textContent = state.mode === 'setup' ? '填写供应商，开始接入 ↗' : '打开控制面板 ↗'; }
    return state;
  } catch (error) { if (stopped) return; statusLine.textContent = error.message.includes('会话') ? error.message : '网关已停止或连接中断，请重新打开软件。'; panel.hidden = true; }
}
async function ready(mode) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const state = await refresh();
    if (state?.error || state?.mode === 'stopped') throw Error('网关启动未完成，请查看状态后重试。');
    if ((mode ? state?.mode === mode : ['panel', 'setup'].includes(state?.mode)) && trustedURL(state.url)) return state.url;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw Error('启动时间较长，请查看网关状态并点击设置 / 控制面板链接。');
}
for (const button of document.querySelectorAll('[data-action]')) button.addEventListener('click', async () => {
  const action = button.dataset.action;
  const question = action === 'remove-dns' ? '请先在 Kimi 中断开第三方网关。撤销本工具添加的单域名解析？系统可能请求管理员授权。'
    : '请先结束正在运行的 Kimi 任务。继续操作会暂时断开第三方模型连接。';
  if (action !== 'data' && !confirm(question)) return;
  for (const item of document.querySelectorAll('button')) item.disabled = true;
  detail.textContent = '正在处理…';
  try {
    await api(action, true);
    if (action === 'stop') { stopped = true; panel.hidden = true; statusLine.textContent = '网关已停止'; detail.textContent = '可以关闭此页。下次双击启动文件即可恢复。'; }
    else if (action === 'setup') {
      detail.textContent = '正在打开供应商设置…';
      location.assign(await ready('setup'));
    } else if (action === 'restart') {
      await ready();
      detail.textContent = '服务已重启。请打开设置 / 控制面板继续；重启不会切换当前任务的模型。';
    } else { detail.textContent = action === 'remove-dns' ? '单域名解析已撤销，供应商设置已保留。' : '数据目录已打开。'; await refresh(); }
  } catch (error) { detail.textContent = error.message; }
  finally { if (!stopped) for (const item of document.querySelectorAll('button')) item.disabled = false; }
});
void refresh();
setInterval(() => { void refresh(); }, 2000);
