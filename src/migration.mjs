import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadCore } from './core.mjs';
import { modelRoute } from './policy.mjs';

const { saveSetup, setupPaths } = await loadCore('src/setup.mjs');
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
function readRegular(file) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 4 * 1024 * 1024) throw Error('unsupported_source_file');
  return fs.readFileSync(file);
}

export function backupFiles(files, directory) {
  const sources = [...new Set(files)].filter(file => fs.existsSync(file));
  const snapshots = sources.map(source => ({ source: path.resolve(source), bytes: readRegular(source) }));
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const target = fs.mkdtempSync(path.join(directory, new Date().toISOString().replace(/[:.]/g, '-') + '-'));
  const manifest = { schemaVersion: 1, createdAt: new Date().toISOString(), files: [] };
  snapshots.forEach(({ source, bytes }, index) => {
    const name = String(index + 1).padStart(2, '0') + '-' + path.basename(source);
    fs.writeFileSync(path.join(target, name), bytes, { mode: 0o600, flag: 'wx' });
    if (digest(fs.readFileSync(path.join(target, name))) !== digest(bytes)) throw Error('backup_verification_failed');
    manifest.files.push({ source, name, sha256: digest(bytes), size: bytes.length });
  });
  fs.writeFileSync(path.join(target, 'manifest.json'), JSON.stringify(manifest, null, 2), { mode: 0o600, flag: 'wx' });
  return target;
}

export function kimiBackupFiles(kimiDirectory) {
  return ['config.json', 'byok-providers.json', 'runtime/kimi-code/config.toml', 'runtime/kimi-code/home/config.toml']
    .map(name => path.join(kimiDirectory, name))
    .concat(path.join(path.dirname(path.dirname(kimiDirectory)), 'kimi-agent', 'byok-availability.json'));
}

// Recognize a narrow set of string constants. Never execute a user's old script.
function stringConstant(script, name) {
  const match = new RegExp('\\bconst\\s+' + name + '\\s*=\\s*([\'\"])([^\'\"\\r\\n]*)\\1\\s*;').exec(script);
  if (!match || match[2].includes('\\') || match[2].includes('${')) throw Error('unsupported_legacy_script');
  return match[2];
}

export function inspectLegacy({ configPath, proxyDir }) {
  const script = readRegular(path.join(proxyDir, 'service.js')).toString('utf8');
  const config = JSON.parse(readRegular(configPath).toString('utf8').replace(/^\uFEFF/, ''));
  const mapping = JSON.parse(readRegular(path.join(proxyDir, 'mapping.json')).toString('utf8').replace(/^\uFEFF/, ''));
  const host = stringConstant(script, 'TARGET_HOST');
  const endpoint = stringConstant(script, 'TARGET_PATH');
  const apiKey = stringConstant(script, 'API_KEY');
  if (!/^[a-zA-Z0-9.-]+$/.test(host) || !endpoint.endsWith('/chat/completions') || !endpoint.startsWith('/')
    || /[?#]/.test(endpoint) || !apiKey || !mapping || Array.isArray(mapping)) throw Error('unsupported_legacy_script');
  const baseURL = 'https://' + host + endpoint.slice(0, -'/chat/completions'.length);
  const models = [...new Set(Object.values(mapping))].map(id => {
    if (typeof id !== 'string' || !id.trim()) throw Error('invalid_legacy_mapping');
    const original = Object.keys(mapping).find(key => mapping[key] === id);
    const budget = config.model?.models?.[original]?.maxContextSize;
    return { id: modelRoute(id, 'chat'), name: id, upstreamModelId: id, connectionId: 'relay', protocol: 'chat',
      contextWindow: Number.isSafeInteger(budget) && budget > 0 ? budget : 32768, tools: true,
      // Do not infer reasoning effort or image capability from an old alias.
      reasoning: false, inputModalities: ['text'] };
  });
  if (!models.length || models.length > 32) throw Error('invalid_legacy_mapping');
  return { baseURL, apiKey, models };
}

export function migrateLegacy({ configPath, proxyDir, stateDir }) {
  const paths = setupPaths({ stateDir });
  if (fs.existsSync(paths.config) || fs.existsSync(paths.credentials)) throw Error('relay_already_configured');
  const source = inspectLegacy({ configPath, proxyDir });
  const files = [configPath, path.join(proxyDir, 'service.js'), path.join(proxyDir, 'mapping.json'),
    ...kimiBackupFiles(path.dirname(configPath))];
  const backup = backupFiles(files, path.join(stateDir, 'backups'));
  saveSetup({ paths, config: { connections: [{ id: 'relay', name: '已迁移的第三方供应商', baseURL: source.baseURL }],
    tokenEnv: 'KIMI_WORK_GATEWAY_TOKEN', port: 3426, dns: { enabled: false, port: 53535 }, models: source.models },
  connectionApiKeys: { relay: source.apiKey } });
  return { backup, modelCount: source.models.length, config: paths.config };
}
