# 改动与恢复 / Changes and recovery

## 中文

本项目对上游 Kimi Work Gateway 0.9.0 的核心源码保持原样，二开内容位于 `src/`、`ui/`、`scripts/` 与 `.github/`。`vendor/UPSTREAM.json` 固定来源提交。新增桌面托盘壳、独立 Node 运行时、简化首设、默认权限守卫、系统 hosts 一致性检查、自动备份、狭义旧代理迁移以及双平台发布检查。

桌面适配层还将面板名称改为 Kimi Relay，并关闭上游 CLI 的独立核心更新入口，防止只更新核心而使桌面包版本不一致。完整桌面版本从应用菜单跳转至本项目 Releases 下载。面板的“准备原生设置”也受单域名解析开关约束。

### 文件变更范围

| 位置 | 可能的变更 | 恢复方式 |
|---|---|---|
| Kimi 安装目录 | 无 | 无需恢复 |
| Relay 数据目录 | `gateway.json`、`credentials.json`、回执、状态和备份 | 退出后保留目录以保留设置；卸载时可自行删除 |
| Kimi Work 主配置 | 原生导入更新网关和模型；上游按归属同步关联配置 | 优先在 Kimi 内断开；需要精确回退时使用接入前备份 |
| `byok-providers.json` | Kimi 自己保存原生第三方供应商资料 | 在 Kimi 内断开；必要时连同主配置恢复同一次备份 |
| `kimi-agent/byok-availability.json` | 显示原生接入入口 | 备份存在则恢复原值；此前不存在时可在退出 Kimi 后移除新建文件 |
| 两份 runtime TOML | 通常由 Kimi 根据主配置生成；启用高级面板功能可能增加受管项 | 使用面板恢复继承，或退出后恢复同批备份 |
| Kimi 用户目录中的 `.kimi-work-*` 文件与回执 | 原生通道的锁、会话/账号证明与归属记录 | 停止 Relay 后依照上游归属规则清理；不要删除其他正在使用的网关记录 |
| Windows hosts / macOS resolver | 只有启用单域名解析时才写 | Relay 菜单“撤销单域名解析” |

### 一般恢复：回到官方模型

1. 结束正在运行的 Work 任务。在 Kimi 中切回原有模型，并在“第三方模型网关”设置中断开。
2. 如果启用过单域名解析，使用 Relay 菜单“撤销单域名解析”并完成系统授权。没有启用则跳过。
3. 如果使用过子代理池或其他原生高级配置，在面板切回继承并确认撤销完成。再从托盘菜单退出 Kimi Relay。
4. 重新打开 Kimi。保留 Relay 数据目录即可保留供应商设置；删除发行文件夹只移除软件，不会删除 Kimi。

### 精确恢复：回到某次备份

Relay 在启用原生接入前，备份当时存在的 Kimi 主配置、原生供应商资料、可见性文件与两份运行时 TOML；每份备份目录包含 `manifest.json`，记录原路径、备份文件名、SHA-256 和时间。设置保存前也备份已有的 Relay 配置与凭据。

1. 先执行一般恢复中的断开和撤销步骤，再完全退出 Kimi、Relay 以及旧的自动重写代理。
2. 在数据目录的 `backups/` 选择**接入前**的同一次备份。以 manifest 的 `source` 为目标、`name` 为备份文件，并核对 SHA-256。先另外备份当前文件，再逐个复制回原位置。
3. 备份中没有的文件当时可能不存在；不要凭猜测覆盖其他配置。若本次新增了可见性文件而接入前不存在，退出后只移除该文件即可。原生供应商资料优先通过 Kimi 的断开操作清理。
4. 主配置可能含当时的登录令牌。恢复很久以前的备份后若登录失效，重新登录 Kimi 即可。不要把备份发给客服或上传 GitHub。

迁移器只导入 Relay 自身目录，不会停用旧脚本、停止旧进程或删除开机项。旧脚本若仍每隔一段时间覆盖配置，会与新接入互相覆盖；应先结束旧脚本，再使用新接入。

## English

The upstream core is preserved under `vendor/kimi-work-gateway/` at the commit recorded in `vendor/UPSTREAM.json`. Our additions are the desktop tray application, bundled Node runtime, simplified setup, explicit permission guard, OS-consistent Windows resolution check, verified backups, narrow legacy migration and platform build checks.

Kimi installation files are untouched. Native import changes Kimi user settings: the connection/model catalog, `byok-providers.json`, visibility flag and generated runtime configuration. The upstream local bridge also maintains ownership/session records. Relay's own configuration, separate credentials and backups stay in its data directory. Only an explicitly enabled single-domain resolver changes system files.

### Return to original Kimi models

1. Finish active Work tasks. Select an original Kimi model and disconnect the third-party model gateway in Kimi settings.
2. If you enabled domain resolution, use Relay's Remove domain resolution menu and complete OS authorization.
3. If advanced native subagent settings were used, restore inheritance in the panel and confirm completion. Quit Relay from its tray menu.
4. Reopen Kimi. Keep Relay's data directory to preserve provider settings, or remove it separately when no longer needed.

### Restore an exact snapshot

Before native connection, Relay backs up the existing Kimi configuration, native provider store, visibility flag and both runtime TOML files. Before saving Relay settings, it also snapshots its existing configuration and credentials. Each `backups/` snapshot has a manifest with source paths, backup names, timestamps and SHA-256 hashes.

Disconnect and remove optional resolution first. Fully exit Kimi, Relay and any old rewrite proxy. Select a complete pre-connection snapshot, verify its hashes, separately back up current files, then copy each recorded `name` to its original `source` path. A missing manifest entry may mean the file did not exist; do not guess which unrelated files to overwrite. Prefer Kimi's own Disconnect action for cleaning the native provider profile. Old login tokens may require signing in again after restoration.

Legacy migration never disables the old proxy or removes its startup entries. Stop that proxy before switching to the new native connection. Backup folders contain credentials; keep them private.
