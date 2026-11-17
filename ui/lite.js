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
    statusLine.textContent = state.error ? '启动失败：' + state.error : ({ panel: '网关运行中', setup: '等待填写供应商', starting: '网关正在启动…', stopped: '网关已停止' }[state.mode] || '正在连接…');
    panel.hidden = !trustedURL(state.url);
    if (!panel.hidden) { panel.href = state.url; panel.textContent = state.mode === 'setup' ? '填写供应商，开始接入 ↗' : '打开控制面板 ↗'; }
  } catch (error) { statusLine.textContent = error.message.includes('会话') ? error.message : '网关已停止或连接中断，请重新打开软件。'; panel.hidden = true; }
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
    else { detail.textContent = action === 'remove-dns' ? '单域名解析已撤销，供应商设置已保留。' : '已完成。管理页可以关闭，网关继续运行。'; await refresh(); }
  } catch (error) { detail.textContent = error.message; }
  finally { if (!stopped) for (const item of document.querySelectorAll('button')) item.disabled = false; }
});
void refresh();
setInterval(() => { void refresh(); }, 2000);
