# 模型选择与默认供应商 / Model picker and provider defaults

## 中文

beta.7 首次设置默认连接名称为“七月 API”，地址为 `https://token-api.qiyue999.com/v1`。预置真实 ID：`kimi-k3-1`、`kimi-k3.1-pro`、`kimi-k2.8-preview`；工具调用开启，思考支持 `low / high / max`，默认 `high`，上下文预算保守设为 262144。图片能力未默认开启。默认值是可编辑的本地预设，不代表此 Key 一定拥有这三个模型的权限。

1. 管理页点击“修改接入”（新用户直接打开设置），输入供应商 Key。已有连接留空可保留并用于拉取。
2. 点击“拉取模型列表”，从供应商的 `/models` 读取当前 Key 可见模型；搜索后勾选，自动填入真实 ID。列表显示已声明能力，未知能力不会只凭模型名称猜测。
3. 点击模型右侧“设置”，可分别修改协议、上下文预算、工具、图片、支持的思考档位和默认档位。三个预置模型从新设置中选择后可直接使用 `high`。
4. 点击“保存并打开控制面板”。已有设置自动备份。然后通过控制面板接入 Kimi，在 Kimi 中选择第三方模型。

已有配置优先保留：拉取列表不会重置已选模型的能力。若旧配置仍声明 `off`，请逐个点“设置”，勾选“支持思考”，填 `low, high, max` 并选择默认 `high` 后保存。仅对供应商确认支持的模型启用。在 Kimi 中现有会话的思考档位可能需要重新选择；本次界面升级不会改写会话数据库。

可改用其他供应商。更换地址会清空旧候选和已选列表，需重新拉取 / 手动添加；已保存的 Key 只会在地址与连接完全匹配且有本工具归属记录时复用，不会自动发送到新地址。手动输入保留在折叠区域中。拉取失败可以重试或手动添加，原有选择会保留。

拉取只读取模型目录，不发送聊天请求；保存不会修改 New API 后台。New API 接入及 `thinking.effort` / `reasoning_effort` 参数区别见 [思考与 New API](REASONING-AND-NEWAPI.md)。API 余额不等于 Kimi 官方积分。

本次变更：Relay 的 `ui/setup.html`、新增发现接口适配层 `src/setup-discovery.mjs` 与 worker 连接、相关测试和说明。没有新增依赖，没有修改 Kimi 安装包或系统解析文件。保存或接入时的用户配置变更仍按已有备份机制执行。

更新与恢复：停止 Relay，备份程序目录，用 code-only ZIP 覆盖 Relay 自身文件后重开。恢复时停止 Relay，将备份的程序文件复制回去；运行环境与私人配置不在更新包内。用户配置恢复详见 [变更与恢复](CHANGES-AND-RECOVERY.md)。

## English

beta.7 defaults to “七月 API” at `https://token-api.qiyue999.com/v1`, with the exact IDs `kimi-k3-1`, `kimi-k3.1-pro`, and `kimi-k2.8-preview`. These editable local presets enable tools and reasoning (`low / high / max`, default `high`) with a conservative 262144-token budget. Image input is not enabled by default. Presets do not grant API access.

Open Modify connection, enter your provider key, then Fetch models. Search the live catalog and check the models you want. IDs and declared capabilities are filled automatically. Use each model’s Settings button to adjust protocol, context budget, tools, vision and reasoning efforts. Save to open the panel, then connect to Kimi and select the third-party model there.

Existing declarations take precedence and are not reset when fetching. For an old `off` declaration, enable reasoning and explicitly enter the provider-supported levels and default. Existing Kimi conversation preferences are not rewritten by this UI update. Unknown capabilities are not inferred from names. Manual IDs remain available under a disclosure.

Changing the address clears the previous catalog and selection. A stored key is reused only for the matching owned connection and exact URL. Fetching reads the model catalog without a chat request or New API administration changes. Keys stay in private local state. Provider API balance does not add official Kimi credits.

Changed files belong to Relay: setup page, discovery adapter, worker integration, tests and documentation. No dependencies were added and no Kimi installation or system resolver files were changed by this update. Existing backup behavior applies when saving or connecting. To roll back, stop Relay and restore the backed-up application files; keep runtime and private state separate. See [changes and recovery](CHANGES-AND-RECOVERY.md).
