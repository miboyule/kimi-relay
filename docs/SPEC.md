# Kimi Relay 0.1

目标：复用 MIT 的 Kimi Work Gateway 0.9.0，提供 Windows x64、macOS arm64 / x64 桌面分发。用户解压运行，无须安装 Node/npm、执行命令或改 Kimi 安装包。

默认假设：用户已有普通 Kimi 桌面客户端和自己的 OpenAI-compatible API。第一版支持 Chat Completions / Responses；原生 Anthropic Messages 与媒体服务不属于首版。保留 Kimi 登录与权限行为。

## 验收

- 只读检测本机安装包，报告版本和真实解析器结果；3.2.27 的 5 个样例已通过。
- 首设输入地址、Key、模型 ID 和协议即可保存，并打开已有模型面板。
- 任意 Chat 模型生成 `relay/kimi-<encoded ID>` 本地别名；真实 ID 单独保存和转发。
- 默认不写系统文件、不安装服务、不添加开机项；DNS 调整必须显式勾选。撤销沿用上游归属检查。
- 仅监听 loopback；会话鉴权、Origin/Host 校验、凭据单独保存；桌面页面无 Node 权限。
- 关闭窗口缩入托盘；明确退出关闭自己持有的网关，保留用户 Kimi。
- 支持独立数据目录和便携目录；不采用工作区中现有私人配置。
- 自动测试涵盖首设、请求转发、拒绝越权来源、DNS 禁用无提权、失败启动与进程退出。
- 双平台 CI 生成 zip 和 SHA256SUMS；首发为预览版，明确构建验证与真实模型验收的区别。

## 结构与命令

`src/main.cjs` 桌面入口；`src/worker.mjs` 独立 Node 网关宿主；`src/policy.mjs` 默认权限边界；`ui/` 首设页；`scripts/` 构建验证；`test/` 集成测试；`docs/` 调研与维护记录。

开发 `npm ci && npm start`。检查 `npm run check`，测试 `npm test`，运行时 `npm run runtime`，构建 `npm run build:win` / `npm run build:mac`，发行包检查 `npm run smoke`。

风格：原生 JS 模块，无 UI 框架，桌面壳与网关通过私有 IPC 传递状态，密钥不上报父进程。示例：`const result = await onboarding.ensure();`。

## 实施次序

1. 调研与安装包只读兼容性检查。
2. 先写默认权限与真实 HTTP 首设/转发回归，再实现独立宿主。
3. 首设界面、托盘壳和独立 Node 发行运行时。
4. Windows 实际构建、界面启动及模拟上游回归。
5. 许可证、维护文档和 GitHub 双平台构建发布。

始终：保留上游版权，锁定版本/完整性，只读安装目录，测试使用合成凭证和隔离目录。发布不含个人配置、对话、安装包或私有接口代码。用户自行启用的系统解析使用上游最小单域名方案并保留撤销入口。
