import { inspectLegacy, migrateLegacy } from '../src/migration.mjs';
const args = process.argv.slice(2);
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const options = { configPath: option('--config'), proxyDir: option('--proxy-dir'), stateDir: option('--state-dir') };
if (!options.configPath || !options.proxyDir || !options.stateDir) {
  console.error('Usage: node scripts/migrate.mjs --config <Kimi config.json> --proxy-dir <legacy proxy> --state-dir <Relay data> [--apply]');
  process.exitCode = 2;
} else {
  try {
    if (args.includes('--apply')) console.log(JSON.stringify(migrateLegacy(options), null, 2));
    else {
      const inspected = inspectLegacy(options);
      console.log(JSON.stringify({ mode: 'read-only', modelCount: inspected.models.length,
        protocol: 'chat', apiKeyDetected: Boolean(inspected.apiKey), changes: 'none; add --apply to back up and import' }, null, 2));
    }
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
