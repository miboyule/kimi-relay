# 客户说明 / Customer FAQ

## 中文：可直接发送的简短答复

我们提供的是第三方模型 API 中转服务，充值到账的是中转站余额，不是 Kimi 官方积分。如果你想在 Kimi Work 桌面客户端里使用这份额度，可以通过 Kimi Relay 接入：打开软件，填写我们提供的 API 地址、API Key 和模型名称，再在 Kimi Work 中选择该模型即可。使用时请保持 Kimi Relay 运行，模型请求按中转站规则计费。Kimi 官方账号、会员和其他官方功能仍按官方规则使用。

## English: ready-to-send reply

We provide a third-party model API relay. Your top-up adds balance to our relay account, not official Kimi credits. To use that balance inside the Kimi Work desktop client, open Kimi Relay, enter the API URL, API key and model name we provide, then select the imported model in Kimi Work. Keep Kimi Relay running while you work. Model requests are billed under the relay's pricing. Your Kimi account, membership and other official features remain subject to Kimi's own rules.

## 三个常见问题

**为什么 Kimi 官方积分没有增加？**

这次购买的是中转站 API 额度。接入后，所选第三方模型的推理请求使用中转站余额；Kimi 官方积分面板不会因此增加。已有官方模型的用量和第三方模型的用量分别由各自平台记录。

**需要改 Kimi 软件文件吗？**

不修改 Kimi 安装包和可执行文件。工具使用 Kimi 现有的模型网关入口，在用户配置中保存接入信息。必要时需由你启用一项可撤销的单域名解析，软件会在界面中说明。

**接入就等于所有官方功能都能用吗？**

接入覆盖支持的模型推理请求。工具调用取决于模型能力；搜索、生图、记忆等独立服务以及官方会员权益仍由 Kimi 和对应服务管理。若某个模型或版本不兼容，可切回 Kimi 原模型并断开第三方网关。

## Three common questions

**Why did my official Kimi credit balance not increase?**

The purchase is API balance at the relay. Requests to the selected third-party model consume that balance. The official Kimi credit display does not increase; usage is recorded by the respective provider.

**Does this modify Kimi application files?**

No application archive or executable is modified. The tool uses Kimi's existing model gateway interface and saves connection information in user settings. Some installations require an explicitly enabled, reversible domain-resolution entry.

**Does this include every official Kimi feature?**

It covers supported model inference requests. Tool use depends on the selected model. Search, image generation, memory and membership benefits retain their respective official requirements. If a model or version is incompatible, switch back to an original Kimi model and disconnect the third-party gateway.

## 给运营人员的交付清单 / Operator handoff

提供给客户的连接资料只需：Base URL、客户自己的 API Key、模型 ID、接口协议、已确认的工具/图片能力。不要发送运营方的管理 Key，不要把 API 充值商品命名为“Kimi 官方积分充值”。建议名称：“第三方模型 API 额度（可通过 Kimi Relay 接入 Kimi Work）”。

Give customers their Base URL, individual API key, model ID, protocol, and verified tool/image capabilities. Do not distribute an administrator key or label the product as an official Kimi credit top-up. Suggested product name: “Third-party model API balance — usable in Kimi Work through Kimi Relay.”
