import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.join(root, 'runtime');
const version = 'v24.22.3';
const platform = process.argv.find(x => x.startsWith('--platform='))?.split('=')[1] || process.platform;
const arch = process.argv.find(x => x.startsWith('--arch='))?.split('=')[1] || process.arch;
if (!['win32', 'darwin'].includes(platform) || !['x64', 'arm64'].includes(arch)) throw Error('unsupported_runtime');
const binary = platform === 'win32' ? 'node.exe' : 'node';
const archiveName = `node-${version}-${platform === 'win32' ? 'win' : 'darwin'}-${arch}.${platform === 'win32' ? 'zip' : 'tar.gz'}`;
const sha256 = data => crypto.createHash('sha256').update(data).digest('hex');
try {
  const stamp = JSON.parse(await fs.readFile(path.join(directory, 'version.json'), 'utf8'));
  if (stamp.version === version && stamp.platform === platform && stamp.arch === arch
    && sha256(await fs.readFile(path.join(directory, binary))) === stamp.binarySHA256) {
    console.log(`Runtime ready: Node ${version} ${platform}/${arch}`);
    process.exit(0);
  }
} catch {}
await fs.mkdir(directory, { recursive: true });
async function download(name) {
  const response = await fetch(`https://nodejs.org/dist/${version}/${name}`, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw Error('runtime_download_failed_' + response.status);
  return Buffer.from(await response.arrayBuffer());
}
console.log(`Downloading official Node ${version} ${platform}/${arch}…`);
const [archive, checksums] = await Promise.all([download(archiveName), download('SHASUMS256.txt')]);
const expected = checksums.toString().split(/\r?\n/).find(line => line.endsWith('  ' + archiveName))?.split(/\s+/)[0];
if (!expected || sha256(archive) !== expected) throw Error('runtime_checksum_mismatch');
const temporary = await fs.mkdtemp(path.join(directory, '.download-'));
try {
  const archiveFile = path.join(temporary, archiveName);
  await fs.writeFile(archiveFile, archive);
  if (platform === 'win32') {
    const literal = value => "'" + value.replaceAll("'", "''") + "'";
    execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      `Expand-Archive -LiteralPath ${literal(archiveFile)} -DestinationPath ${literal(temporary)}`], { windowsHide: true });
  } else execFileSync('tar', ['-xzf', archiveFile, '-C', temporary]);
  const extracted = path.join(temporary, archiveName.replace(/\.(zip|tar.gz)$/, ''));
  const executable = path.join(extracted, platform === 'win32' ? binary : 'bin/node');
  const bytes = await fs.readFile(executable);
  await fs.writeFile(path.join(directory, binary), bytes, { mode: 0o755 });
  if (platform !== 'win32') await fs.chmod(path.join(directory, binary), 0o755);
  await fs.copyFile(path.join(extracted, 'LICENSE'), path.join(directory, 'LICENSE'));
  await fs.writeFile(path.join(directory, 'version.json'), JSON.stringify({ version, platform, arch,
    archiveSHA256: expected, binarySHA256: sha256(bytes), source: `https://nodejs.org/dist/${version}/${archiveName}` }, null, 2));
} finally {
  if (!path.resolve(temporary).startsWith(path.resolve(directory) + path.sep)) throw Error('invalid_cleanup_path');
  await fs.rm(temporary, { recursive: true, force: true });
}
console.log('Runtime checksum verified.');
