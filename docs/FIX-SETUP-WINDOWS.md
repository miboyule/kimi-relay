# Settings and Windows connection fix / 设置与 Windows 接入修正

## 中文

问题：Lite 的“修改接入”只重启设置服务、更新链接，没有打开设置表单；“重启网关”在工作进程就绪前报告完成。Windows 接入核心还把同一路径的 Electron 渲染/GPU/后台 Node 子进程算成多个 Kimi 客户端，导致 `translation_application_ambiguous`。

修正：修改接入等待设置服务就绪后直接进入表单；重启等待面板就绪并提示当前任务不会自动换模型；管理页分别显示网关运行和模型导入状态。Windows 仅把同一路径、父子关系明确、命令行识别为 Electron / Daimon helper 的进程归属于客户端，独立客户端、不同安装、未知路径和未知子进程仍保留歧义保护。任务空闲检查和凭据隔离保持生效。

涉及文件：`src/windows-processes.mjs`（新增）、`src/worker.mjs`、`src/lite.mjs`、`ui/lite.js`、`ui/lite.html`；另有回归测试与双语说明。无需替换 Kimi 安装文件、无需新依赖。

更新与回退：停止 Relay，备份旧 `app/`，用代码包覆盖后启动；回退时停止并恢复旧 `app/`。个人接入配置与模型导入需按《改动与恢复》单独撤销，不要将私人备份上传 GitHub。若窗口关闭后连接仍等待，请从 Kimi 托盘菜单完全退出。

验证范围：自动回归覆盖表单导航、保存后跳转、凭据保留、网关转发和 Windows 主进程判定。一次 Windows 3.2.27 本机验证确认三个模型已显示在 Kimi 的第三方网关列表，真实供应商通过本机网关返回 HTTP 200 / `RELAY_OK`。此次桌面鼠标和截图接口失败，未完成 Kimi 内选模型后发送任务的最终验证；Mac 原生客户端接入仍需单独验证。

## English

Previously, Modify connection only restarted the setup service and changed a link. Restart reported completion before the worker was ready. On Windows, the upstream process inspector also counted Electron renderers, GPU processes and the Daimon Node helper as separate Kimi applications, blocking connection with `translation_application_ambiguous`.

Modify now waits and opens the actual form; restart waits for a ready panel. The manager distinguishes gateway availability from model import and explains that existing tasks keep their selected model. Windows groups only recognized helper processes under a parent with the same verified executable path. Independent instances, unknown children, other installations and unreadable paths retain ambiguity checks. Live task-idleness checks and credential isolation remain enabled.

Changed files: new `src/windows-processes.mjs`, plus `src/worker.mjs`, `src/lite.mjs`, `ui/lite.js`, `ui/lite.html`, regression tests and bilingual documentation. No Kimi installation patch or new dependency is needed.

Update by stopping Relay, backing up `app/`, and extracting the code-only update. Roll back by stopping and restoring that directory. Restore personal Kimi configuration separately using the recovery guide; never publish private backups. Fully quit Kimi through its tray menu if closing its window only hides it.

Validation: automated form navigation, save/redirect, credential retention, forwarding and Windows application detection. One local Windows 3.2.27 check showed three imported models in Kimi's third-party picker; a real provider request through the local gateway returned HTTP 200 / `RELAY_OK`. Desktop mouse/screenshot control failed before the final in-Kimi inference demonstration. Native macOS integration requires separate validation.
