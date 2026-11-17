import os
import pathlib
import subprocess

directory = pathlib.Path('release-assets')
checksums = directory / 'SHA256SUMS'
checksums.write_text(''.join(p.read_text() for p in sorted(directory.glob('SHA256SUMS-*'))), encoding='utf-8')
assets = [str(p) for p in sorted(directory.glob('*.zip'))] + [str(checksums)]
subprocess.run(['gh', 'release', 'create', os.environ['RELEASE_TAG'], '--prerelease',
                '--title', 'Kimi Relay ' + os.environ['RELEASE_TAG'],
                '--notes-file', 'docs/RELEASE.md', *assets], check=True)
