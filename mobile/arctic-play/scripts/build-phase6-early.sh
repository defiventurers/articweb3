#!/usr/bin/env bash
set -euo pipefail

# The final URL path is selected by the host: the output uses relative paths.
# Usage: build-phase6-early.sh /path/v5.9.15.apk /path/v5.10.2.apk /path/output
[[ $# == 3 ]] || { echo 'Usage: build-phase6-early.sh BASELINE_APK SIGNED_5102_APK OUTPUT' >&2; exit 2; }
baseline=$(realpath "$1")
release=$(realpath "$2")
output=$(realpath -m "$3")
root=$(cd "$(dirname "$0")/../../.." && pwd)
[[ $(sha256sum "$baseline" | cut -d' ' -f1) == 27ab56bc1c8f2575f6d6ea0573432ac354102283e725d5bb33d1ed37b3cc2488 ]] || { echo 'Incorrect baseline APK' >&2; exit 1; }
[[ $(sha256sum "$release" | cut -d' ' -f1) == 275cf9bf69aadfa4f4d844ff412e0885d8a5a656539f4bb583af27bfc95e8ecd ]] || { echo 'Incorrect v5.10.2 APK' >&2; exit 1; }
overlay=$(mktemp -d)
trap 'rm -rf "$overlay"' EXIT
python3 - "$baseline" "$release" "$overlay" <<'PY'
import pathlib, sys, zipfile
with zipfile.ZipFile(sys.argv[1]) as old, zipfile.ZipFile(sys.argv[2]) as new:
    old_names = set(old.namelist())
    for info in new.infolist():
        name = info.filename
        if not name.startswith('assets/') or info.is_dir(): continue
        rel = pathlib.PurePosixPath(name).relative_to('assets')
        if rel.is_absolute() or '..' in rel.parts: raise ValueError('Unsafe APK path')
        data = new.read(info)
        if name in old_names and old.read(name) == data: continue
        if str(rel) in ('index.html', 'startup.js', 'theme-init.js'):
            raise ValueError('Protected loading file differs')
        dest = pathlib.Path(sys.argv[3], *rel.parts)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
PY
node "$root/mobile/arctic-play/scripts/build-incremental-web.mjs" --baseline-apk "$baseline" --runtime-dir "$overlay" --output "$output" --version 5.10.2 --version-code 106 --apk-download-page downloads/
node "$root/mobile/arctic-play/scripts/package-web-download.mjs" --apk "$release" --web-output "$output" --version 5.10.2 --version-code 106 --expected-sha256 275cf9bf69aadfa4f4d844ff412e0885d8a5a656539f4bb583af27bfc95e8ecd
