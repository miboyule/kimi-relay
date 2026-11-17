import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Electron uses Kimi.exe for its renderer, GPU and Node runner too. Group only
// known helpers of the SAME verified executable. Independent installations and
// unreadable paths still count towards the supervisor's ambiguity check.
export function inspectWindowsApplication(application, { run = spawnSync } = {}) {
  const executable = path.win32.resolve(application).toLowerCase();
  const name = path.win32.basename(application).replaceAll("'", "''");
  const result = run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    `$rows = @(Get-CimInstance Win32_Process -Filter "Name='${name}'" -ErrorAction Stop | ForEach-Object { `
      + '[pscustomobject]@{pid=[int]$_.ProcessId;parent=[int]$_.ParentProcessId;executable=$_.ExecutablePath;'
      + 'helper=[bool]($_.CommandLine -match " --type=" -or ($_.CommandLine -match " -e " -and $_.CommandLine -match "DaimonStartGate"))} }); '
      + 'ConvertTo-Json -InputObject $rows -Compress'], { encoding: 'utf8', timeout: 10000, windowsHide: true });
  if (result.error || result.status !== 0) throw Error('translation_process_check_failed');
  let rows;
  try { rows = JSON.parse(result.stdout); } catch { throw Error('translation_process_check_failed'); }
  if (!Array.isArray(rows) || rows.some(row => !Number.isInteger(row?.pid) || row.pid <= 0
    || !Number.isInteger(row.parent) || row.parent < 0 || row.pid === row.parent
    || typeof row.helper !== 'boolean'
    || row.executable !== null && (typeof row.executable !== 'string' || !path.win32.isAbsolute(row.executable)))
    || new Set(rows.map(row => row.pid)).size !== rows.length) throw Error('translation_process_check_failed');
  const byPid = new Map(rows.map(row => [row.pid, row]));
  const normalized = row => typeof row?.executable === 'string' ? path.win32.resolve(row.executable).toLowerCase() : null;
  for (const row of rows) {
    const visited = new Set([row.pid]);
    for (let parent = byPid.get(row.parent); parent; parent = byPid.get(parent.parent)) {
      if (visited.has(parent.pid)) throw Error('translation_process_check_failed');
      visited.add(parent.pid);
    }
  }
  const roots = rows.filter(row => !row.helper || !normalized(row) || normalized(row) !== normalized(byPid.get(row.parent)));
  return { pids: roots.filter(row => normalized(row) === executable).map(row => row.pid),
    nameMatches: roots.length, total: rows.length };
}
