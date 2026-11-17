# 思考档位与 New API / Thinking efforts and New API

## 中文

`Supported efforts: off` 描述 Kimi 收到的本地能力声明，不能据此判断供应商模型没有推理能力。迁移时为避免推测模型能力，使用了 `reasoning: false`，导致 Kimi 将模型视为仅支持 `off`。

设置入口：Lite 管理页 → 打开控制面板 → 模型目录 → 编辑模型。在“声明能力”中勾选“支持思考档位”，填写 `low, high, max`，默认档位选择 `high`，点击“保存目录”。模型能力需要同步到 Kimi；仅改全局档位而不更新模型声明，会再次触发校验错误。首次设置页的推理复选框不提供完整分档，应在控制面板维护档位。

Relay 对应的模型配置字段为：

```json
{
  "reasoning": true,
  "reasoningEfforts": ["low", "high", "max"],
  "defaultEffort": "high"
}
```

在 Kimi 中选择第三方模型后，选择需要的思考档位。旧任务有单独的档位设置。页面保留旧能力信息时，重新打开 Kimi 后检查。

### 本机修改与验证：2026-11-18

备份后，为三个供应商模型开启推理声明和 `low / high / max`，默认 `high`。更新 Kimi 的 BYOK 对应模型能力元数据，通过 Kimi 本机配置接口同步生成的运行配置。本次自动原生导入通道不可用，因此采用配置修复；未修改 Kimi 安装文件。新任务默认档位及先前三个报错任务都改为 `high`。

实际测试：

- 三个模型分别使用 `reasoning_effort: "high"`，均返回 HTTP 200、`REASONING_OK` 和推理内容。
- K3-1 的 `low`、`max` 请求均返回 HTTP 200、`EFFORT_OK` 和推理内容。
- 完整 Kimi 会话使用第三方 K3-1 和全局 `high` 默认设置，返回 `K3_HIGH_OK`，带思考内容，任务完成。任务名为“思考 high 验证成功 · K3-1”。

HTTP 接受某个档位不证明上游实际按不同强度执行。要核实档位是否被覆盖或忽略，需要检查 New API 发出的请求及最终供应商收到的参数。

### New API 设置

本机现有接口已通过以上测试，不需要为原来的本机校验错误添加特殊规则。

1. 渠道协议与上游实际接口一致，三个模型 ID 正确映射。无需为启用思考添加 `-high`、`-thinking` 等模型后缀。
2. 不要通过参数覆盖固定或删除客户端的 `thinking` / `reasoning_effort`。
3. 当前 Kimi 的 Kimi Chat 协议使用以下请求参数；这是请求体示意，不是要求粘贴进 New API 参数覆盖：

```json
{
  "thinking": { "type": "enabled", "effort": "high" }
}
```

其他 OpenAI 兼容客户端可能使用顶层 `reasoning_effort: "high"`。使用哪一种，取决于上游实际协议。

4. 保留 `reasoning_content`、工具调用及流式输出结构。建议关闭“思考内容转正文”（`thinking_to_content`），让 Kimi 分别处理思考与正文。
5. 新版 New API 支持 `reasoning_effort`，也以原始 JSON 保留 `thinking`。只有旧版本或自定义渠道确实过滤字段时，才考虑升级或该渠道的请求体透传，无需无条件启用全局透传。

参考：[请求字段](https://github.com/QuantumNous/new-api/blob/main/relaykit/dto/openai_request.go)、[渠道设置](https://github.com/QuantumNous/new-api/blob/main/relaykit/dto/channel_settings.go)、[思考转正文说明](https://github.com/QuantumNous/new-api/blob/main/docs/channel/other_setting.md)。这是检查时的上游主分支实现，不代表已核实用户部署的版本。

### 恢复

本机备份清单保存了原文件及 SHA256。退回保守设置时，按模型恢复 Relay 与 Kimi BYOK 的原能力元数据，并将相应任务和默认档位设为 `off`。避免覆盖整份主配置中的新登录信息。

## English

`Supported efforts: off` reflects imported local capabilities, not proof that the provider lacks reasoning. The migration used conservative `reasoning: false` metadata.

Open the Relay control panel, edit the model catalog, enable thinking, enter `low, high, max`, choose default `high`, and save. Synchronize capabilities to Kimi before choosing a non-off effort. Existing conversations have separate effort preferences.

After backup, the three local model declarations and Kimi BYOK metadata were updated, and Kimi's local configuration interface regenerated runtime settings. Automatic native import was unavailable during this repair. No installation files were modified. New-conversation defaults and the three previously affected conversations now use `high`.

All three models accepted `reasoning_effort: "high"` with HTTP 200 and reasoning output. K3-1 also accepted `low` and `max`. A complete Kimi conversation using third-party K3-1 and the global `high` default returned `K3_HIGH_OK` with reasoning content.

The existing New API endpoint passed these tests. Match the actual upstream protocol and model IDs, preserve effort parameters, and preserve structured reasoning, tools, and streams. Current Kimi Chat uses `thinking: {"type":"enabled","effort":"high"}`; other clients may use `reasoning_effort: "high"`. Avoid forcing a single parameter dialect across unrelated providers.

Current New API source supports a string `reasoning_effort` and raw JSON `thinking`. Upgrade or enable channel-specific body passthrough only if an older/custom deployment drops required fields. Prefer leaving thinking-to-content conversion disabled.

Accepted requests do not prove distinct upstream effort execution. Inspect outgoing New API requests and final-provider logs to establish that parameters are preserved and honored. The source references describe upstream main, not a verified version of the user's deployment. For recovery, restore model capability fields and set affected/default efforts back to `off`, preserving newer login data.
