#!/usr/bin/env python3
"""Prepare public update metadata only after a signed APK is built and verified."""
import argparse,datetime,hashlib,json,pathlib

parser=argparse.ArgumentParser()
parser.add_argument('--build-info',required=True,type=pathlib.Path)
parser.add_argument('--notes',required=True,type=pathlib.Path,help='JSON array of release-note strings')
parser.add_argument('--output',required=True,type=pathlib.Path)
args=parser.parse_args()
info=json.loads(args.build_info.read_text())
config=json.loads((pathlib.Path(__file__).resolve().parents[1]/'release-config.json').read_text())
notes=json.loads(args.notes.read_text())
apk=args.build_info.parent/info['file']
digest=hashlib.sha256(apk.read_bytes()).hexdigest()
if info['package']!=config['packageName'] or info['version']!=config['versionName'] or info['versionCode']!=config['versionCode']:raise SystemExit('Build and release config do not match.')
if digest!=info['sha256'] or apk.stat().st_size!=info['bytes']:raise SystemExit('APK checksum or size does not match the verified build.')
if not isinstance(notes,list) or len(notes)>12 or any(not isinstance(n,str) or not n.strip() or len(n)>300 for n in notes):raise SystemExit('Release notes must be an array of at most 12 short strings.')
metadata={'schemaVersion':1,'packageName':config['packageName'],'versionName':config['versionName'],'versionCode':config['versionCode'],'downloadUrl':'https://raw.githubusercontent.com/defiventurers/articweb3/arctic-play-releases/releases/'+info.get('updateFile',apk.name),'sizeBytes':info['bytes'],'sha256':digest,'publishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00','Z'),'releaseNotes':notes}
args.output.parent.mkdir(parents=True,exist_ok=True)
args.output.write_text(json.dumps(metadata,indent=2)+'\n')
print(f'Prepared {args.output} for {apk.name}')
