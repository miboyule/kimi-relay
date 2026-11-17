# 开源调研与二开选择 / Research and derivative choice

检查日期：2026-11-17。通过 GitHub 仓库搜索、仓库文件与 Releases 读取核对。搜索结果仅代表当时可检索项目。

| 项目 | 方向 | 与本需求的关系 |
|---|---|---|
| [wssz527/kimi-work-gateway](https://github.com/wssz527/kimi-work-gateway) | 普通 Kimi Work 原生 BYOK、本地网关、Web 面板 | 高度匹配。MIT 允许二开，复用核心 |
| [wssz527/magpie-agent-kimi-work-byok](https://github.com/wssz527/magpie-agent-kimi-work-byok) | Magpie 插件方式接入 | 适合已有 Magpie 的用户；本项目无需该宿主 |
| [kupakupar/kimi-work-provider](https://github.com/kupakupar/kimi-work-provider) | 用本机 Work 登录作为 Magpie 的供应商 | 方向相反，不是把任意第三方 API 接入 Work |
| [romangalaxys10-spec/ai-work-desktop](https://github.com/romangalaxys10-spec/ai-work-desktop) | 另建 AI 桌面工作台 | 不是保留现有 Kimi 客户端的接入层 |

选定上游 0.9.0、提交 `934438a457c46b0249b6d317a01db86431ed7aa4`。接入已有项目合理，重点投入普通客户交付问题：免装环境、简化首设、托盘生命周期、最小权限、旧代理迁移、备份恢复、中英文客户解释。不同于上游的功能范围见 README 和改动说明。

Windows 上只读检查 Kimi 3.2.27 的真实 `app.asar`：5 个样例模型均通过目录解析器；本地旧配置迁移后的 3 个模型也通过。只分发适配器源码，不分发 Kimi 安装包和提取出的私有代码。安装包哈希、用户路径、真实供应商凭据不进入公共项目。

The closest match was Kimi Work Gateway, so rebuilding its protocol integration would add maintenance cost without solving the customer handoff. Relay preserves the MIT upstream core and focuses on self-contained desktop distribution, explicit system-change consent, verified backups, migration and bilingual operating guidance. Parser evidence is distinct from real signed-in inference evidence.
