"""Stage an opt-in CSS-only browser candidate; never read/write or sign an APK."""
from pathlib import Path
import argparse
import hashlib
import json
import os
import shutil
import tempfile

BASELINE_TREE_HASH = "d1f045ab3635f3e3e104714b06fc9a4dc2ac84d1c18fbfce7febfb89186fd911"
REVIEW_TREE_HASHES = {
    "652313defeb61b0d67ac4a1253176456925ce229b32b383c76ac2d5bae8080d5": "original-guarded-presentation-from-v5.10.2",
    "9a4a3d51b27d745ee71b81002c0cf4ad530003c1d99441615381dc678c11a043": "original-retained-v5.11.1-assets",
}
CORRECTION = Path(__file__).resolve().parents[1] / "src/storybook-accessibility-review.css"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def tree_records(root):
    if root.is_symlink() or not root.is_dir():
        raise ValueError("Expected a regular extracted asset directory.")
    result = {}
    for item in sorted(root.rglob("*")):
        if item.is_symlink():
            raise ValueError("Symlinks are not accepted in input asset trees.")
        if item.is_file():
            result[item.relative_to(root).as_posix()] = sha(item.read_bytes())
        elif not item.is_dir():
            raise ValueError("Only regular files and directories are accepted.")
    return result


def tree_hash(records):
    return sha("".join(name + "\0" + value + "\n" for name, value in sorted(records.items())).encode("utf-8"))


def stage(source, output):
    source = Path(source).resolve(strict=True)
    requested_output = Path(output)
    if requested_output.exists() or requested_output.is_symlink():
        raise ValueError("Output must be a new directory; existing files are never replaced.")
    output = requested_output.resolve()
    if output == source or source in output.parents or output in source.parents:
        raise ValueError("Input and output must be disjoint directories.")
    before = tree_records(source / "before")
    after = tree_records(source / "after")
    before_hash, after_hash = tree_hash(before), tree_hash(after)
    if before_hash != BASELINE_TREE_HASH:
        raise ValueError("Expected the exact retained v5.10.2 baseline asset tree.")
    variant = REVIEW_TREE_HASHES.get(after_hash)
    if not variant:
        raise ValueError("Expected an exact original review presentation asset tree; altered or already corrected inputs are rejected.")
    correction = CORRECTION.read_bytes()
    corrected_css = (source / "after/app.css").read_bytes() + b"\n" + correction
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".storybook-candidate-", dir=output.parent) as temporary:
        candidate = Path(temporary) / "candidate"
        shutil.copytree(source / "before", candidate / "before")
        shutil.copytree(source / "after", candidate / "after")
        (candidate / "after/app.css").write_bytes(corrected_css)
        expected_after = {**after, "app.css": sha(corrected_css)}
        if tree_records(candidate / "before") != before or tree_records(candidate / "after") != expected_after:
            raise ValueError("Staged assets changed outside the intended CSS append.")
        if tree_records(source / "before") != before or tree_records(source / "after") != after:
            raise ValueError("Input assets changed during staging; no candidate was published.")
        report = {
            "kind": "opt-in-browser-review-only",
            "sourceVariant": variant,
            "sourceTreeSha256": {"before": before_hash, "after": after_hash},
            "candidateTreeSha256": {"before": before_hash, "after": tree_hash(expected_after)},
            "modifiedFiles": ["after/app.css"],
            "appJsSha256": after["app.js"],
            "originalCssSha256": after["app.css"],
            "correctionCssSha256": sha(correction),
            "candidateCssSha256": sha(corrected_css),
            "apkProduced": False,
            "physicalDeviceAccepted": False,
        }
        (candidate / "presentation-correction.json").write_text(json.dumps(report, indent=2) + "\n")
        if output.exists() or output.is_symlink():
            raise ValueError("Output appeared during staging; it will not be replaced.")
        os.rename(candidate, output)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path, help="Original fixture root containing before/ and after/")
    parser.add_argument("--output", required=True, type=Path, help="New disjoint browser-only fixture directory")
    args = parser.parse_args()
    try:
        result = stage(args.source, args.output)
    except (ValueError, OSError) as error:
        parser.exit(1, str(error) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
