"""Allowlisted Lite payload; ZIPs never collect local credentials or node_modules."""
import json
import pathlib
import shutil
import stat
import tempfile
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
DIST.mkdir(exist_ok=True)
version = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
runtime = json.loads((ROOT / 'runtime/version.json').read_text(encoding='utf-8'))
platform = 'win' if runtime['platform'] == 'win32' else 'mac'
arch = runtime['arch']
name = f'Kimi-Relay-Lite-{version}-{platform}-{arch}'


def archive(source, target, runtime_included):
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
        for file in sorted(source.rglob('*')):
            relative = file.relative_to(source).as_posix()
            if file.is_file() and (runtime_included or not relative.startswith('runtime/')):
                entry = zipfile.ZipInfo.from_file(file, relative)
                executable = relative.endswith('.command') or relative.endswith('/MacOS/launch') or relative == 'runtime/node'
                entry.create_system = 3
                entry.external_attr = (stat.S_IFREG | (0o755 if executable else 0o644)) << 16
                bundle.writestr(entry, file.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    limit = 50_000_000 if runtime_included else 2_000_000
    if target.stat().st_size >= limit:
        raise RuntimeError(f'{target.name} exceeds size budget {limit}')
    print(f'{target.name}: {target.stat().st_size:,} bytes')


with tempfile.TemporaryDirectory(prefix='lite-build-', dir=DIST) as temporary:
    stage = pathlib.Path(temporary)
    app = stage / 'app'
    (app / 'src').mkdir(parents=True)
    for file in (ROOT / 'src').iterdir():
        if file.suffix == '.mjs' or file.name == 'desktop.cjs':
            shutil.copy2(file, app / 'src' / file.name)
    shutil.copytree(ROOT / 'ui', app / 'ui')
    upstream = ROOT / 'vendor/kimi-work-gateway'
    core = app / 'vendor/kimi-work-gateway'
    for directory in ['src', 'ui', 'bin']:
        shutil.copytree(upstream / directory, core / directory)
    for file in ['cli.mjs', 'package.json', 'LICENSE']:
        shutil.copy2(upstream / file, core / file)
    shutil.copy2(ROOT / 'vendor/UPSTREAM.json', app / 'vendor/UPSTREAM.json')
    for file in ['LICENSE', 'THIRD_PARTY_NOTICES.md']:
        shutil.copy2(ROOT / file, stage / file)
    shutil.copy2(ROOT / 'docs/LITE.md', stage / 'README.md')
    for file in ['MODEL-PICKER.md', 'REASONING-AND-NEWAPI.md', 'CHANGES-AND-RECOVERY.md']:
        shutil.copy2(ROOT / 'docs' / file, stage / file)
    (stage / 'VERSION.json').write_text(json.dumps({'edition': 'lite', 'version': version,
        'runtimeMajor': 24, 'runtimeVersion': runtime['version']}, indent=2) + '\n', encoding='utf-8')
    # These launchers remain in updates; all persistent data lives outside app/.
    (stage / 'Start Kimi Relay.vbs').write_text('''Option Explicit
Dim fso, sh, root, node, entry, result
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
root = fso.GetParentFolderName(WScript.ScriptFullName)
node = fso.BuildPath(root, "runtime\\node.exe")
entry = fso.BuildPath(root, "app\\src\\lite.mjs")
If Not fso.FileExists(node) Then
  MsgBox "Please extract the complete Kimi Relay Lite package first.", 48, "Kimi Relay Lite"
  WScript.Quit 1
End If
result = sh.Run(Chr(34) & node & Chr(34) & " " & Chr(34) & entry & Chr(34) & " --detach", 0, True)
If result <> 0 Then MsgBox "Kimi Relay Lite failed to start. Please extract the complete package.", 48, "Kimi Relay Lite"
''', encoding='ascii', newline='\r\n')
    (stage / 'Start Kimi Relay.cmd').write_text('@echo off\n"%~dp0runtime\\node.exe" "%~dp0app\\src\\lite.mjs" --detach\n', encoding='ascii', newline='\r\n')
    command = stage / 'Start Kimi Relay.command'
    command.write_text('#!/bin/sh\nset -eu\ncd -- "$(dirname -- "$0")"\nexec ./runtime/node ./app/src/lite.mjs --detach\n', encoding='utf-8')
    command.chmod(0o755)
    # Finder launcher: keep this small .app in the extracted folder beside runtime/.
    mac = stage / 'Kimi Relay Lite.app/Contents'
    (mac / 'MacOS').mkdir(parents=True)
    (mac / 'Info.plist').write_text('''<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>CFBundleExecutable</key><string>launch</string>
<key>CFBundleIdentifier</key><string>org.kimirelay.lite</string>
<key>CFBundleName</key><string>Kimi Relay Lite</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleVersion</key><string>1</string></dict></plist>\n''', encoding='utf-8')
    launch = mac / 'MacOS/launch'
    launch.write_text('#!/bin/sh\nset -eu\ncd -- "$(dirname -- "$0")/../../.."\nexec ./runtime/node ./app/src/lite.mjs --detach\n', encoding='utf-8')
    launch.chmod(0o755)
    # On Windows chmod cannot express Unix execution bits; set them on ZIP entries.
    patch = DIST / f'Kimi-Relay-Lite-{version}-code-only.zip'
    archive(stage, patch, False)
    shutil.copytree(ROOT / 'runtime', stage / 'runtime', ignore=shutil.ignore_patterns('.download-*'))
    archive(stage, DIST / (name + '.zip'), True)
    # Keep an unpacked payload for tests of the actual delivered files.
    unpacked = DIST / f'lite-{platform}-{arch}'
    if unpacked.exists():
        if unpacked.resolve().parent != DIST.resolve():
            raise RuntimeError('invalid_cleanup_path')
        shutil.rmtree(unpacked)
    shutil.copytree(stage, unpacked)
