import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { inspectLegacy, migrateLegacy, backupFiles } from '../src/migration.mjs';

test('migration backs up first, preserves original files, and separates secrets from models', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'relay-migrate-'));
  try {
    const proxyDir = path.join(root, 'proxy');
    await fs.mkdir(proxyDir);
    const configPath = path.join(root, 'config.json');
    const config = JSON.stringify({ model: { models: { 'old-name': { maxContextSize: 32768 } } } });
    await fs.writeFile(configPath, config);
    await fs.writeFile(path.join(proxyDir, 'service.js'), "const TARGET_HOST = 'api.example.com';\nconst TARGET_PATH = '/v1/chat/completions';\nconst API_KEY = 'synthetic-legacy-key';\nthrow Error('never execute me');");
    await fs.writeFile(path.join(proxyDir, 'mapping.json'), JSON.stringify({ 'old-name': 'deepseek-chat' }));
    const source = inspectLegacy({ configPath, proxyDir });
    assert.equal(source.baseURL, 'https://api.example.com/v1');
    const stateDir = path.join(root, 'relay');
    const result = migrateLegacy({ configPath, proxyDir, stateDir });
    assert.equal(await fs.readFile(configPath, 'utf8'), config);
    assert.equal(result.modelCount, 1);
    const saved = await fs.readFile(path.join(stateDir, 'gateway.json'), 'utf8');
    assert.equal(saved.includes('synthetic-legacy-key'), false);
    assert.equal(JSON.parse(saved).models[0].upstreamModelId, 'deepseek-chat');
    assert.ok(JSON.parse(await fs.readFile(path.join(result.backup, 'manifest.json'), 'utf8')).files.length >= 3);
    assert.throws(() => migrateLegacy({ configPath, proxyDir, stateDir }), /relay_already_configured/);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test('backups preserve exact bytes with a manifest and SHA256', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'relay-backup-'));
  try {
    const file = path.join(root, 'input');
    await fs.writeFile(file, 'test');
    const backup = backupFiles([file], path.join(root, 'backups'));
    const manifest = JSON.parse(await fs.readFile(path.join(backup, 'manifest.json'), 'utf8'));
    assert.equal(manifest.files[0].sha256.length, 64);
    assert.equal(await fs.readFile(path.join(backup, manifest.files[0].name), 'utf8'), 'test');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
