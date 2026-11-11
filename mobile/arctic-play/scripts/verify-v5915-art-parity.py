#!/usr/bin/env python3
"""Fail a candidate APK if approved v5.9.15 artwork or launcher/loading art regresses.

Run before native signing/release verification, in addition to the device QA suite.
This verifies archive bytes and the embedded version, NOT Android installation.
"""
import argparse
import hashlib
import io
import json
import struct
import sys
import zipfile

BASELINE_SHA256 = "27ab56bc1c8f2575f6d6ea0573432ac354102283e725d5bb33d1ed37b3cc2488"
CERT_SHA256 = "20d0b3350e4ce0db32b5df678dbaea4967de560ac4da59db0a57154213c7ec37"
REQUIRED = ("res/drawable/launch_ice.xml", "res/drawable-nodpi-v4/launch_ice_texture.webp",
            "assets/art/brand/lantern-loading-reference.webp", "assets/app.js",
            "assets/game-assets.json", "assets/app-version.json", "resources.arsc")
ROSTER = ("Xiangqi", "Shogi", "Sannin Shogi", "Sanguo Qi", "San You Qi",
          "Sanguo Yan Yi Qi", "Chaturanga", "Cờ Tư Lệnh", "Shanshui Xiangqi")

def same_launcher_pixels(a, b):
    """Accept lossless PNG re-encoding, not a visual redesign.

    Pillow is optional; without it this check fails closed when bytes differ.
    """
    try:
        from PIL import Image, ImageChops
        with Image.open(io.BytesIO(a)) as first, Image.open(io.BytesIO(b)) as second:
            if first.size != second.size:
                return False
            return ImageChops.difference(first.convert("RGBA"), second.convert("RGBA")).getbbox() is None
    except (ImportError, OSError, ValueError):
        return False

def fingerprint(data):
    return hashlib.sha256(data).hexdigest()

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("approved_v5915")
    p.add_argument("candidate_apk")
    p.add_argument("--min-version-code", type=int, default=105)
    p.add_argument("--approved-art-change", action="append", default=[], metavar="APK_ENTRY")
    args = p.parse_args()
    problems = []
    if fingerprint(open(args.approved_v5915, "rb").read()) != BASELINE_SHA256:
        sys.exit("ERROR: expected the exact approved v5.9.15 binary")
    with zipfile.ZipFile(args.approved_v5915) as original, zipfile.ZipFile(args.candidate_apk) as candidate:
        if candidate.testzip() is not None:
            problems.append("ZIP CRC failure")
        before, after = set(original.namelist()), set(candidate.namelist())
        for name in REQUIRED:
            if name not in after:
                problems.append("Missing required entry: " + name)
        protected = sorted(name for name in before if
                           name.startswith(("assets/art/", "res/mipmap", "res/drawable")))
        for name in protected:
            if name in args.approved_art_change:
                continue
            if name not in after:
                problems.append("Protected resource missing: " + name)
                continue
            before_bytes, after_bytes = original.read(name), candidate.read(name)
            if before_bytes == after_bytes:
                continue
            if "ic_launcher" in name and name.endswith(".png") and same_launcher_pixels(before_bytes, after_bytes):
                continue
            problems.append("Protected resource changed visually or bytewise: " + name)
        for name in args.approved_art_change:
            if name not in protected:
                problems.append("Unrecognized artwork exception: " + name)
        try:
            old = json.loads(original.read("assets/app-version.json"))
            new = json.loads(candidate.read("assets/app-version.json"))
            if (old["version"], old["versionCode"]) != ("5.9.15", 103):
                problems.append("Embedded approved metadata mismatch")
            if not isinstance(new["versionCode"], int) or new["versionCode"] < args.min_version_code:
                problems.append("Candidate versionCode must exceed distributed v5.10.0 / 104")
            if new.get("version") in ("5.9.15", "5.10.0"):
                problems.append("Candidate version name unchanged or rejected")
            warm = json.loads(candidate.read("assets/game-assets.json"))
            if warm.get("version") != new.get("version"):
                problems.append("Asset manifest release version mismatch")
            code = candidate.read("assets/app.js").decode("utf-8", "replace").lower()
            for label in ROSTER:
                if label.lower() not in code:
                    problems.append("Nine-game roster label absent: " + label)
        except (KeyError, ValueError) as err:
            problems.append("Release metadata: " + str(err))
        if "resources.arsc" in after:
            info = candidate.getinfo("resources.arsc")
            with open(args.candidate_apk, "rb") as f:
                f.seek(info.header_offset)
                header = f.read(30)
            length = struct.unpack_from("<HH", header, 26) if len(header) == 30 else (0, 0)
            aligned = ((info.header_offset + 30 + sum(length)) % 4 == 0)
            if info.compress_type != zipfile.ZIP_STORED or not aligned:
                problems.append("resources.arsc not STORED and 4-byte aligned")
    print(json.dumps({"approved_baseline": BASELINE_SHA256,
                      "version_gate_minimum": args.min_version_code,
                      "protected_resources_count": len(protected),
                      "asset_parity_passed": not problems,
                      "problems": problems,
                      "mandatory_next_steps": ["apksigner verify --verbose --print-certs",
                          "aapt2 dump badging; match package/version/code",
                          "compare signer certificate SHA-256 against " + CERT_SHA256,
                          "install in-place on an Android device with v5.9.15 data",
                          "exercise all nine games, sign-in, loading, reconnect and update"]}, indent=2))
    return 1 if problems else 0

if __name__ == "__main__":
    sys.exit(main())
