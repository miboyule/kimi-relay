Kimi Relay **Lite 轻量预览版**：移除内置 Electron 浏览器，沿用现有网关，改为系统默认浏览器管理。Windows 完整包约 **35.5 MB**（上一版约 187.5 MB），代码更新包约 **0.51 MB**。三个系统完整包均强制小于 50,000,000 字节。

**首次使用：** 下载对应系统的 `win-x64`、`mac-x64` 或 `mac-arm64` 完整 ZIP，全部解压。Windows 双击 `Start Kimi Relay.vbs`（备用 `.cmd`）；Mac 双击 `Kimi Relay Lite.app`（备用 `.command`）。保留整个解压文件夹，不要单独移动 `.app`。点击管理页里的设置 / 控制面板完成接入。关闭网页仍继续运行，点击“停止并退出”停止网关。

**只替换文件：** 已有 Lite 用户停止网关后，备份旧程序，再用 `code-only.zip` 覆盖 Relay 自己的程序文件；保留 `runtime/` 和数据。已有旧 Electron 大包也可以将其中 `resources/runtime/` 复制成 Lite 根目录的 `runtime/`，再解压代码包，免下载新运行环境。不要把代码包当作 Kimi 程序补丁。完整步骤见 [轻量版与替换说明](https://github.com/miboyule/kimi-relay/blob/main/docs/LITE.md)。

默认沿用旧版配置与备份，先退出旧 Relay，再启动 Lite。Kimi 安装文件不修改；系统解析需明确允许，并可撤销。**API 中转站余额不是 Kimi 官方积分**，本工具不会充值官方账号。

跨平台原生构建、实际随包启动脚本、浏览器设置、模型转发、单实例、重启与退出检查通过才发布。Windows 还验证代码包覆盖更新与凭据保留。使用隔离合成数据，不代表已登录 Kimi 的真实付费任务已全部验收。发行包未配置签名或 Apple 公证。附件 SHA256SUMS 用于校验下载。

---

**Lite preview:** removes bundled Electron and uses your default browser with the existing local gateway. The full Windows ZIP is about **35.5 MB**, down from 187.5 MB; the universal code-only update is about **0.51 MB**. Every full platform archive must be below 50,000,000 bytes.

For first use, extract the matching full ZIP. On Windows, launch `Start Kimi Relay.vbs` (fallback `.cmd`). On Mac, open `Kimi Relay Lite.app` (fallback `.command`) while keeping all extracted files together. The small `.app` is a launcher, so do not move it by itself. Open setup/panel through the manager. Closing browser tabs leaves the gateway running; Stop and exit shuts it down.

For later updates, stop Relay, back up its application files, then extract `code-only.zip` over the Lite folder. Preserve `runtime/` and all state. Owners of the old desktop ZIP can reuse `resources/runtime/` as Lite’s `runtime/`, then extract the code-only package. This updates Relay, not Kimi files. See the [bilingual Lite guide](https://github.com/miboyule/kimi-relay/blob/main/docs/LITE.md).

Existing default credentials and backups carry over; exit the old Relay first. DNS is opt-in and reversible. **Relay API balance does not add official Kimi credits.** Native platform build and delivered-launcher/browser tests gate release. Synthetic tests do not replace signed-in real-provider task validation. Packages are unsigned and not notarized. Verify downloads with SHA256SUMS.
