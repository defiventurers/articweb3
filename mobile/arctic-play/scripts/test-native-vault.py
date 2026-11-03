#!/usr/bin/env python3
"""Exercise the actual native storage classes using JVM AES and private preference fixtures."""
import argparse,pathlib,subprocess,tempfile
p=argparse.ArgumentParser()
p.add_argument('--compiler-jar',required=True,type=pathlib.Path)
p.add_argument('--android-jar',required=True,type=pathlib.Path)
p.add_argument('--json-jar',required=True,type=pathlib.Path)
a=p.parse_args()
root=pathlib.Path(__file__).resolve().parents[1]
native=root/'android/app/src/main/java/xyz/arcticdominion/play'
with tempfile.TemporaryDirectory(prefix='vault-test-') as directory:
 sources=[native/'CloudVault.java',native/'SessionCredential.java',*sorted((root/'tests/native').rglob('*.java'))]
 subprocess.run(['java','-jar',str(a.compiler_jar),'-source','8','-target','8','-classpath',str(a.json_jar)+':'+str(a.android_jar),'-d',directory,*map(str,sources)],check=True)
 subprocess.run(['java','-cp',directory+':'+str(a.json_jar)+':'+str(a.android_jar),'xyz.arcticdominion.play.VaultRegression'],check=True)
