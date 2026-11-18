# Kimi Relay Lite / 轻量版

## 中文

轻量版移除内置 Electron 浏览器，使用系统默认浏览器管理，保留本机网关、首次设置、备份、迁移兼容和可撤销解析。完整 ZIP 强制小于 **50,000,000 字节**；代码包强制小于 **2,000,000 字节**。无需安装 Node、npm 或浏览器插件。

### 首次使用

1. 下载与你系统匹配的 `Lite-版本-win-x64.zip`、`mac-x64.zip` 或 `mac-arm64.zip`，**完整解压**。不要把 ZIP 内的文件单独拖出来运行。
2. Windows 双击 `Start Kimi Relay.vbs`，无需保持黑色窗口；若系统禁用了 VBS，可双击同名 `.cmd`。Mac 双击 `Kimi Relay Lite.app`，并保留它旁边的 `app/`、`runtime/`；备用入口是 `Start Kimi Relay.command`。移动时移动整个发行文件夹，不要只移动 `.app`。
3. 默认浏览器打开本机管理页。点击“填写供应商”或“打开控制面板”，填写 API 地址、自己的 Key、真实模型 ID，然后在控制面板完成 Kimi 接入。
4. 关闭网页，网关仍继续运行。再次双击启动文件可以重新打开管理页；点击“停止并退出”才会停止网关。没有托盘图标，也不自动开机运行。

### 点了没有生效时

- **修改供应商**：点击“修改接入”后会直接打开设置表单。修改 Base URL、模型 ID 后保存；API Key 留空会保留原值。设置保存后自动进入控制面板。旧版 beta.6 只改变绿色链接，点击后还需要再点“填写供应商”。
- **网关运行不等于已选用**：先确认管理页显示“模型已导入 Kimi”。若提示单域名解析，在“修改接入 → 更多连接选项”明确勾选并保存，按系统提示授权，再到控制面板连接 Kimi。
- **在 Kimi 选择模型**：进入 **Work → 新建任务 → 输入框下方的模型按钮 → 第三方网关**，选择你添加的真实模型，例如 `kimi-k3-1`。列表中的官方 `K3`、`K3.1 Pro` 仍使用官方服务。旧任务不会因为重启网关而自动切换。
- **第一次连接卡在退出**：Windows 的关闭按钮可能仅将 Kimi 隐藏到托盘。先结束任务，再从 Kimi 托盘菜单完全退出，然后在 Relay 控制面板启动并连接 Kimi。工具不自动强制结束任务。
- **确认实际调用**：发送“只回复：连接成功”，并在控制面板请求记录中确认模型 ID、成功状态和第三方供应商。导入成功仅证明模型目录接入，不证明某次任务或工具调用成功。

若使用过上一版 Electron 桌面版，先从它的托盘退出，再启动 Lite。数据目录相同，已有供应商设置与备份无需重填。不要同时运行两个版本。已下载的大包内 `resources/runtime/` 也可以复制为 Lite 根目录的 `runtime/`，再解压代码包，即可复用原有 Node；复制后可删除不再使用的大包。

### 后续只替换程序文件

下载 `Lite-版本-code-only.zip`。这是 **Lite 的更新包，不含 Node 运行环境**；首次使用请下载完整包，或按上文从旧桌面包复用运行环境。

1. 结束 Kimi 任务，在管理页“停止并退出”。
2. 备份当前 Lite 文件夹中的 `app/`、启动文件和 `VERSION.json`，例如复制到 `previous-version/`。
3. 将更新包解压到原 Lite 文件夹，覆盖 `app/`、启动文件、版本和说明文件；**不要覆盖或删除 `runtime/`，不要修改 Kimi 安装文件**。
4. 重新启动。设置和备份保留；要回退，先停止，再复制回上一步备份的程序文件。

当前代码包适用于 Node 24。未来若需要更换运行环境，将在版本说明中注明，并使用对应平台的完整包更新。代码包不是对 Kimi 的补丁，也不能直接覆盖旧 Electron 包的 `resources/`。

### 数据与恢复

默认数据目录沿用桌面版：Windows `%APPDATA%/Kimi Relay/gateway`；Mac `~/Library/Application Support/Kimi Relay/gateway`。可在管理页打开。设置 `KIMI_RELAY_HOME` 可指定其他目录；Lite 不读取旧版 exe 旁的 `portable-mode` 标记，使用该模式的用户需通过 `KIMI_RELAY_HOME` 指向原 `portable-data/`。

管理页“修改接入”“重启网关”“撤销单域名解析”对应旧版应用菜单。默认不改系统解析；明确允许后才操作，撤销仍需系统授权。恢复官方模型时先在 Kimi 切回原模型并断开，再撤销可选解析、停止 Relay。精确恢复见 [改动与恢复](https://github.com/miboyule/kimi-relay/blob/main/docs/CHANGES-AND-RECOVERY.md)。

本机链接包含管理会话，凭据与备份包含 Key，不要分享这些文件或链接。中转站余额不会增加 Kimi 官方积分。版本仍是预览版，真实供应商推理与工具能力需自行验证；发行包未签名或公证。

## English

Lite removes the bundled Electron browser and uses your default browser. It retains the local gateway, setup, verified backups and opt-in reversible DNS. Full ZIPs must be below **50,000,000 bytes**; code-only ZIPs below **2,000,000 bytes**. No separate Node/npm installation is required for a full package.

Extract the full archive for your OS and architecture. On Windows, double-click `Start Kimi Relay.vbs` (or `.cmd` if VBS is disabled). On macOS, open `Kimi Relay Lite.app` **beside** `app/` and `runtime/`, or use `Start Kimi Relay.command`. Move the entire extracted folder, not just the small `.app` launcher. Use the browser manager to open setup/control panel and connect Kimi. Closing browser tabs leaves the gateway running. Launch again to reopen the manager; **Stop and exit** stops it. There is no tray or automatic startup.

Exit the previous Electron edition before running Lite. They share the same default data folder, so provider credentials and backups carry over. To reuse an already downloaded desktop package, copy its `resources/runtime/` to the Lite folder as `runtime/`, then extract the code-only ZIP into that folder. No further runtime download is needed.

**If clicking appears to do nothing:** Modify connection now navigates directly to the setup form. Edit the Base URL and model IDs; leave API Key empty to keep it. In beta.6, click the updated green setup link after Modify. A running gateway does not select a model in Kimi: use **Work → New task → model picker → Third-party gateway**, then choose an imported model. Official K3 entries still use the official service, and restarting the gateway does not switch existing tasks. Enable the optional single-domain resolver in setup if requested. If the first connection waits for Kimi to exit on Windows, finish tasks and fully quit Kimi from its tray menu; closing the window may only hide it. Then launch/connect from the Relay panel. The tool does not force-kill tasks. Verify a small reply and its successful provider request record; catalog import alone does not prove inference or tool execution.

For later updates, stop the gateway, back up `app/`, launchers and `VERSION.json`, then extract the code-only ZIP over the existing Lite folder. Keep `runtime/` and all data. Roll back by stopping and restoring the saved application files. Code-only packages currently require Node 24; future runtime changes will be documented. They are **not Kimi application patches** and must not be extracted into an Electron package's `resources/` folder.

Default data paths: Windows `%APPDATA%/Kimi Relay/gateway`; macOS `~/Library/Application Support/Kimi Relay/gateway`. Override with `KIMI_RELAY_HOME`. Lite does not use the Electron `portable-mode` marker; point that environment variable at the previous portable data if needed. The manager replaces desktop menu commands, including DNS removal. See the bilingual recovery guide for reverting Kimi settings. Keep keys, backups and authenticated local URLs private. Relay balance is not official Kimi credit. Unsigned preview; a signed-in real-provider task still needs validation.


beta.7 默认供应商、在线模型选择、思考档位保存与使用说明 / Provider defaults, live selection and reasoning setup: [MODEL-PICKER.md](MODEL-PICKER.md).
