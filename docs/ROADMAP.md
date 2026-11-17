# 维护路线图 / Roadmap

首版聚焦：客户自己的第三方 API → Kimi Work 模型推理。维护不以覆盖所有官方功能为目标。

- [x] 固定上游版本、保留 MIT 署名，原生目录结构兼容检查。
- [x] Windows / macOS 桌面壳和附带运行环境，最小首设流程。
- [x] 独立凭据、先备份后迁移、默认不改系统解析。
- [x] 模拟上游 Chat / SSE / Responses 和隔离桌面构建检查。
- [ ] 收集不同 Kimi 正式版本与第三方供应商的完整桌面调用结果；在兼容表中注明版本、平台和验证层级。
- [ ] 提供受支持配置导出、带脱敏检查的诊断包。
- [ ] 原生 UI 的中英文切换、操作系统凭据加密、发布者签名与 macOS 公证。
- [ ] 提供普通用户可操作的旧配置迁移预览与恢复向导，继续保留备份。
- [ ] 基于实际需求评估附加协议适配；不能静默把不支持的功能声明为支持。

持续更新流程：先导入上游固定提交 → 运行回归 → 重新检查 Kimi 本机结构 → 小范围真实会话验收 → 预发布 → 根据反馈决定稳定版。升级不会自动覆盖正在运行的程序。

The first release focuses on third-party model inference in Kimi Work. Maintenance priorities are compatibility evidence, clearer diagnostics, bilingual native UI, encrypted credential storage, signing/notarization, and a guided migration/restore flow. Import upstream commits deliberately, test, verify native structure, validate real conversations, then publish previews before stable releases.
