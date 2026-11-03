#!/usr/bin/env python3
"""Preserve bundled artwork outside the build output before a source rebuild."""
import json
from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[3]
source=root/'mobile/arctic-play/android/app/src/main/assets/art'
destination=root/'recovery/artwork'
manifest=source/'covers/manifest.json'
if not manifest.is_file() or len(json.loads(manifest.read_text()))!=7:
    raise SystemExit('All seven bundled game covers are required.')
shutil.copytree(source,destination,dirs_exist_ok=True)
print('Rebuild artwork prepared:',destination)
