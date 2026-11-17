import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const names = fs.readdirSync('dist').filter(name => name.endsWith('.zip')).sort();
if (!names.length) throw Error('no_release_archives');
const lines = names.map(name => crypto.createHash('sha256').update(fs.readFileSync(path.join('dist', name))).digest('hex') + '  ' + name);
fs.writeFileSync(path.join('dist', `SHA256SUMS-${process.platform}-${process.arch}`), lines.join('\n') + '\n');
