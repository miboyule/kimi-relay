# Kimi Relay

[简体中文](README.md) · [Preview downloads](https://github.com/miboyule/kimi-relay/releases) · [Customer FAQ](docs/CUSTOMER-FAQ.md) · [Changes and recovery](docs/CHANGES-AND-RECOVERY.md)

Bring your own third-party model provider to Kimi Work. **A top-up at an API relay funds that relay's API balance. It does not add official Kimi credits.**

This desktop derivative uses [Kimi Work Gateway](https://github.com/wssz527/kimi-work-gateway) under MIT. It reuses the native model import, gateway and control panel, adding a bundled runtime, first-run setup, lifecycle controls, backups and legacy migration. Upstream source, revision and copyright are preserved under `vendor/`. This project is independent of Kimi / Moonshot.

**Recommended: Lite.** Uses your default browser instead of bundling Electron. Full archives are under 50 MB; subsequent updates can replace Relay application files using a roughly 0.51 MB code-only ZIP. Historical Electron builds remain available. See [Lite usage and file replacement](docs/LITE.md).

beta.7 includes provider defaults, a searchable live model picker and per-model reasoning effort settings. See the [bilingual model picker guide](docs/MODEL-PICKER.md).

## Quick start

1. Download the ZIP for your system and extract the entire archive. On Windows, open `Start Kimi Relay.vbs` (or `.cmd`). On macOS, open `Kimi Relay Lite.app` (or `.command`), keeping the entire extracted folder together. Do not move only the small `.app` launcher. Your default browser opens the manager. Node/npm installation is not required.
2. Setup defaults to Qiyue API and three Kimi models. Enter your API key, fetch the catalog, search and check models to populate IDs and capabilities. Other providers and manual IDs remain supported. The three presets use a 256K budget and low / high / max reasoning efforts with high as default; unknown models start at 32K with capabilities to be declared.
3. Finish the native connection in the control panel, then select the imported model in Kimi Work. Keep Relay running. Closing browser tabs leaves the gateway running; Stop and exit in the manager stops it. Launch again to reopen the manager.

If native onboarding requires domain resolution, open Edit connection from the manager (old Electron edition: application menu), expand the advanced options and explicitly enable it. Windows adds one marked hosts pair; macOS adds a domain-specific resolver. The OS requests administrator authorization. This option is off by default.

After changing a connection or API key, use the manager’s Restart gateway button instead of the upstream terminal instructions. Finish running Work tasks before restarting.

## Scope

Kimi installation files, `app.asar`, executable and signatures remain unchanged. Native import writes Kimi user settings for gateway visibility, connection and model catalog; the main configuration and two runtime TOML files are backed up before native connection. Relay stores its own configuration and separate credentials in its own data directory. No service or login item is installed automatically. Domain resolution is the only optional system-level change and has a removal menu.

The upstream integration uses a private local debugging pipe to call Kimi's own import API. It does not expose a public debug port. Taking over launch may require an idle or closed Kimi instance. Future Kimi updates can change this private interface.

Supports Windows x64 and macOS arm64 / x64 builds. OpenAI Chat Completions and Responses are supported; no conversion from native Anthropic Messages or Chat-only endpoints to Responses is provided. Local aliases preserve the provider's real model ID.

The Windows Kimi 3.2.27 catalog parser accepted all five built-in sample models. Local integration tests exercise authenticated setup, model mapping, ordinary and streamed forwarding, Responses, and shutdown. **This is not evidence of a completed paid model call inside a signed-in Kimi account.** Use one test conversation to check the model selector, tool use and your relay's request records. Official membership, search, media, memory and account services retain Kimi's own requirements.

Preview builds currently have no publisher signing or Apple notarization configured. Your OS may ask you to confirm their source.

## Data and portability

Use Open data directory under More options in the manager to locate the actual state folder. Typical locations are `%APPDATA%/Kimi Relay/gateway` on Windows and `~/Library/Application Support/Kimi Relay/gateway` on macOS.

**Lite uses `KIMI_RELAY_HOME` for an alternate data folder and reuses desktop state by default. See the Lite guide for updates and runtime reuse.** The following marker applies only to the older Electron edition: a `portable-mode` marker beside the Windows executable puts gateway data in adjacent `portable-data/`; desktop cache still uses the system user-data folder. `KIMI_RELAY_HOME` selects a separate directory for both gateway data and desktop cache. Kimi's own data remains in its existing location.

Credentials are stored separately and are readable by the current OS user; additional keychain encryption is not implemented. Do not share credentials, backup folders or panel links containing session fragments.

## Legacy migration and recovery

The migration helper statically recognizes fixed `service.js` and `mapping.json` proxies. It never executes the old script. It backs up first, then imports endpoint, key and mappings into a separate Relay directory. The source files remain unchanged. Stop the old proxy and any automatic rewrite task before switching to native import.

```sh
node scripts/migrate.mjs --config /path/to/config.json --proxy-dir /path/to/old-proxy --state-dir /path/to/relay-data
# Add --apply to create verified backups and import.
```

For rollback and the exact list of file changes, see [Changes and recovery](docs/CHANGES-AND-RECOVERY.md). Existing multi-connection or mixed-protocol configurations are maintained in the full control panel; first-run setup refuses to overwrite them.

## Development

```sh
npm ci
npm run check
npm test
npm run runtime
npm start
npm run build:lite
npm run smoke:lite
npm run build:win  # Optional legacy Electron edition
npm run build:mac
npm run smoke
```

Node is downloaded from a pinned official release and checked against official SHA256 checksums. Tag builds produce Lite platform ZIPs (hard limit: 50,000,000 bytes), a universal code-only update (under 2,000,000 bytes) and checksums as prereleases. See the [roadmap](docs/ROADMAP.md). MIT; retain this project's and upstream licenses in derivative distributions.
