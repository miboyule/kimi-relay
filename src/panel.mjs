import { loadCore } from './core.mjs';
import { allowLocalPageNavigation } from './browser.mjs';
const { PanelController, PanelError } = await loadCore('src/panel-controller.mjs');
const { GatewayPanel } = await loadCore('src/panel.mjs');

// Keep desktop releases atomic: the upstream CLI updater must not replace only
// the core beneath a separately versioned desktop package.
export class RelayPanelController extends PanelController {
  constructor(options) {
    super({ ...options, updater: { inspect: () => null } });
  }

  async action(input) {
    if (['check-update', 'install-update', 'rollback-update'].includes(input?.action)) {
      throw new PanelError('relay_use_desktop_release', 409,
        { message: '请通过 Kimi Relay 的“说明与更新”下载发行版。Lite 支持仅替换程序文件更新。' });
    }
    if (input?.action === 'prepare-native' && this.config.dns.enabled !== true) {
      throw new PanelError('relay_dns_permission_required', 409,
        { message: '请先通过管理页“修改接入”（桌面版：应用菜单的首次设置）明确启用单域名解析，保存并重启网关后再操作。' });
    }
    return super.action(input);
  }
}

export class RelayPanel extends GatewayPanel {
  handle(req, res) { allowLocalPageNavigation(req); return super.handle(req, res); }

  async start(options) {
    const url = await super.start(options);
    const html = this.assets.get('/');
    html.content = Buffer.from(html.content.toString().replaceAll('Kimi++', 'Kimi Relay')
      .replace('<h2>网关版本</h2>', '<h2>Kimi Relay 更新</h2>')
      .replace('目录保存后自动同步。首次接入需要登录 Kimi，并可能请求系统授权。',
        '先打开并登录 Kimi Work。若接入需要单域名解析，请从管理页“修改接入”（桌面版：应用菜单的首次设置）明确启用；默认不会修改系统解析。')
      .replace('只读取 GitHub 上的正式发布；检查、下载和回退都需要你在这里点击，下载完成后重启网关才会生效。',
        '请通过“说明与更新”查看 GitHub 发行版。Lite 可用代码包替换程序文件。更新前结束任务并退出应用；配置和备份会保留。'));
    const css = this.assets.get('/styles.css');
    css.content = Buffer.concat([css.content, Buffer.from('\n#update-panel > :not(.panel__head){display:none!important}\n')]);
    const script = this.assets.get('/app.js');
    script.content = Buffer.from(script.content.toString().replace('function nativeConnectionText(data) {',
      'function nativeConnectionText(data) {\n'
      + '  if (data.integration?.preparation?.state === "waiting-permission" || data.integration?.nativeImport?.reason === "native_setup_waiting-permission") '
      + 'return "需要启用单域名解析：在管理页打开修改接入（桌面版：应用菜单的首次设置），在更多连接选项中勾选后保存。";'));
    return url;
  }
}
