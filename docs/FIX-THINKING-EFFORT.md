# 第三方模型提示 Thinking effort "high" / Unsupported thinking effort

> 后续已验证供应商推理能力，并为本机三个模型启用 `low / high / max`、默认 `high`。下文记录最初以 `off` 恢复连通的阶段；当前设置、验证及 New API 配置见 [思考档位与 New API](REASONING-AND-NEWAPI.md)。
>
> Follow-up: upstream reasoning was verified, and the three local models now declare `low / high / max`, defaulting to `high`. The text below records the initial conservative recovery. See [Thinking efforts and New API](REASONING-AND-NEWAPI.md) for the current configuration.

## 中文

### 原因与识别

Kimi Work 3.2.27 的某些任务会继承官方模型的 `high` 思考档位。若第三方模型没有声明可配置的推理能力，Kimi 只允许 `off`，会在本机报错：

```text
Thinking effort "high" is not supported by model "byok-kth-kimi/...". Supported efforts: off.
```

这时请求还没有到达网关，重新填写 API Key、给中转站充值或重启网关不能解决这个档位冲突。网关的转发测试通过，也不能证明 Kimi 任务已经通过。

### 正确设置

- 为只支持 `off` 的第三方模型选择 `off`，同时修正任务自身保存的思考设置。
- 新任务使用的默认模型和默认思考档位也必须匹配。只修改全局设置不会覆盖旧任务的设置。
- Kimi 的本机接口 `conversations.setThinking` 支持全局设置，也支持通过 `conversationKey` 设置单个任务，并能应用到已加载的会话。全局模型通过 `conversations.setModel` 设置。
- 操作前备份主配置和会话设置，确认相关任务没有正在运行；通过 Kimi 自身的接口修改，不直接修改正在使用的会话数据库。
- 不要为了消除报错，给没有验证过的模型虚构 `high`、`max` 等能力。`off` 在这里表示 Kimi 不要求配置思考档位；供应商可能仍按其默认策略返回推理内容。

上述接口属于 Kimi 本机接口，不是稳定的公开产品 API，后续客户端版本需重新确认兼容性。此文记录的是配置修复；当前 Relay 没有自动扫描和改写全部任务思考档位的功能。

### 本机验证记录：2026-11-18

修复前，日志在 01:19、01:24 和 01:53 记录了第三方 K3-1 / K2.8 被 `high` 档位拦截的错误。

在备份后，通过 Kimi 自身的接口进行了以下修改：

1. 将三个使用第三方模型的报错任务设为 `off`。
2. 将新任务默认模型设为已导入的第三方 K3-1，默认思考档位设为 `off`。
3. 保持模型实际能力声明不变。

完整 Kimi 任务验证通过：

| 任务 | 实际模型 | 结果 |
| --- | --- | --- |
| 接入验证成功 · K3-1 | 第三方 `kimi-k3-1` | 返回 `RELAY_THINKING_OK`，任务完成 |
| 接入验证成功 · K2.8 | 第三方 `kimi-k2.8-preview` | 返回 `RELAY_K28_OK`，任务完成 |

K3-1 测试发送时没有传入临时模型或思考档位覆盖，验证了新任务默认设置。K2.8 测试验证了任务自身保存的模型和 `off` 档位。验证期间未出现新的上述档位错误。K3.1 Pro 未在本次进行完整任务推理测试。

### 改动与恢复

此次改变了 Kimi 主配置中的默认模型、默认思考档位，以及三个相关任务的思考设置。Kimi 自身同时更新了其生成的模型运行配置，并新增了两个验证任务。没有修改 Kimi 安装文件，也没有改动本次接入的 API Key、供应商地址或模型能力声明。

恢复默认选择时，使用 Kimi 自身设置接口分别设置原来的默认模型和思考档位。需要恢复单个任务时，只恢复该任务的模型/思考设置；不要将整份旧配置覆盖回去，以免覆盖新的登录信息，也不要在 Kimi 运行中替换整个会话数据库。恢复 `high` 到只支持 `off` 的模型会再次触发原错误。

后续若把一个保存了 `high` 的旧官方任务切换到只支持 `off` 的第三方模型，仍需将该任务的档位改为 `off`。建议从已匹配第三方模型的默认设置新建任务。当前配置修复不等于给 Kimi 客户端增加了自动档位适配功能。

## English

### Cause

Some Kimi Work 3.2.27 conversations inherit the official model's `high` thinking effort. A third-party model without declared configurable reasoning only supports `off`. Kimi rejects the request locally before it reaches the relay. Changing the API key, adding relay credit, or restarting the gateway does not resolve this mismatch.

### Configuration fix

Set the affected conversations to `off` and use a compatible default model/effort pair for new conversations. Global settings do not override preferences saved in existing conversations.

Kimi's local `conversations.setThinking` method supports both global defaults and per-conversation settings through `conversationKey`, including loaded sessions. `conversations.setModel` selects the default model. Back up configuration and conversation preferences first, confirm that affected conversations are idle, and use Kimi's own interface rather than editing its live database.

Do not advertise unverified reasoning efforts to bypass validation. Here, `off` means that Kimi does not request a configurable thinking effort; the upstream provider may still return reasoning according to its own defaults. These are internal Kimi interfaces and require compatibility checks after client updates. Relay currently does not automatically scan or rewrite thinking settings in all conversations.

### Verified on November 18, 2026

Three affected third-party conversations were set to `off`. The default model was changed to the imported third-party K3-1 with default effort `off`. Model capabilities remained unchanged.

- A full Kimi conversation using the new defaults completed with `RELAY_THINKING_OK` from third-party K3-1. No per-request model or effort override was supplied.
- A full Kimi conversation using saved K2.8 / `off` preferences completed with `RELAY_K28_OK`.
- No new occurrence of this thinking-effort error appeared during verification. K3.1 Pro was not tested with a full conversation in this repair.

### Changes and recovery

This repair changed default model/effort settings and thinking preferences in three affected conversations. Kimi also regenerated its runtime model configuration. Two verification conversations were added. Kimi installation files, provider credentials, upstream URL, and declared model capabilities were not changed.

Restore individual model/effort settings through Kimi's own interface. Avoid replacing the complete configuration, which could overwrite newer login credentials, or replacing the live conversation database. Restoring `high` on an `off`-only model recreates the error.

An old official-model conversation with saved `high` preferences can still need adjustment when switched to an `off`-only third-party model. Start a new conversation with compatible defaults or explicitly update that conversation's effort. This local configuration repair does not add automatic effort adaptation to Kimi.
