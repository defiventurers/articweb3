"""Synthetic guard fixtures; real pinned asset staging is checked separately."""
from pathlib import Path
import importlib.util
import re
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/prepare-storybook-accessibility-review.py"
spec = importlib.util.spec_from_file_location("storybook_accessibility_review", SCRIPT)
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)


class StorybookAccessibilityReviewTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.source = self.root / "original"
        for name in ("before", "after"):
            tree = self.source / name
            tree.mkdir(parents=True)
            for filename, data in {"app.js": "original runtime " + name, "app.css": "original css " + name,
                                   "bot.js": "unchanged rules", "art/picture.svg": "original artwork"}.items():
                target = tree / filename
                target.parent.mkdir(exist_ok=True)
                target.write_text(data)
        self.before = review.tree_records(self.source / "before")
        self.after = review.tree_records(self.source / "after")
        self.output = self.root / "candidate"

    def allow_fixture(self):
        first = patch.object(review, "BASELINE_TREE_HASH", review.tree_hash(self.before))
        second = patch.object(review, "REVIEW_TREE_HASHES", {review.tree_hash(self.after): "synthetic-original"})
        first.start(); second.start()
        self.addCleanup(first.stop); self.addCleanup(second.stop)

    def test_only_candidate_css_changes_and_originals_are_preserved(self):
        self.allow_fixture()
        original_css = (self.source / "after/app.css").read_bytes()
        report = review.stage(self.source, self.output)
        self.assertEqual(report["modifiedFiles"], ["after/app.css"])
        self.assertFalse(report["apkProduced"])
        self.assertFalse(report["physicalDeviceAccepted"])
        self.assertEqual(review.tree_records(self.source / "before"), self.before)
        self.assertEqual(review.tree_records(self.source / "after"), self.after)
        self.assertEqual(review.tree_records(self.output / "before"), self.before)
        corrected = review.tree_records(self.output / "after")
        self.assertEqual({k: v for k, v in corrected.items() if k != "app.css"},
                         {k: v for k, v in self.after.items() if k != "app.css"})
        self.assertEqual((self.output / "after/app.css").read_bytes(), original_css + b"\n" + review.CORRECTION.read_bytes())

    def test_arbitrary_input_is_not_an_original_artifact(self):
        with self.assertRaisesRegex(ValueError, "exact retained"):
            review.stage(self.source, self.output)
        self.assertFalse(self.output.exists())

    def test_altered_artwork_worker_or_extra_file_is_rejected(self):
        self.allow_fixture()
        for filename in ("art/picture.svg", "bot.js", "unexpected.txt"):
            with self.subTest(filename=filename):
                target = self.source / "after" / filename
                previous = target.read_bytes() if target.exists() else None
                target.write_text("tampered")
                with self.assertRaisesRegex(ValueError, "exact original review"):
                    review.stage(self.source, self.output)
                if previous is None: target.unlink()
                else: target.write_bytes(previous)

    def test_symlink_input_is_rejected(self):
        self.allow_fixture()
        target = self.source / "after/bot.js"
        target.unlink(); target.symlink_to(self.source / "before/bot.js")
        with self.assertRaisesRegex(ValueError, "Symlinks"):
            review.stage(self.source, self.output)

    def test_existing_output_is_never_overwritten(self):
        self.allow_fixture(); self.output.mkdir()
        marker = self.output / "keep.txt"; marker.write_text("keep")
        with self.assertRaisesRegex(ValueError, "new directory"):
            review.stage(self.source, self.output)
        self.assertEqual(marker.read_text(), "keep")

    def test_nested_output_is_rejected_before_writing(self):
        self.allow_fixture()
        with self.assertRaisesRegex(ValueError, "disjoint"):
            review.stage(self.source, self.source / "nested-candidate")

    def test_corrected_input_cannot_be_applied_twice(self):
        self.allow_fixture(); review.stage(self.source, self.output)
        with self.assertRaisesRegex(ValueError, "already corrected"):
            review.stage(self.output, self.root / "second-candidate")

    def test_original_patch_and_css_are_not_imported_or_modified(self):
        source = SCRIPT.read_text()
        self.assertNotIn("patch-storybook-v5102", source)
        self.assertNotIn("storybook-games.css", source)
        css = review.CORRECTION.read_text()
        self.assertNotIn("url(", css)
        self.assertNotIn("!important", css)
        selectors = re.findall(r"(?:^|})\s*([^{}]+)\{", re.sub(r"/\*.*?\*/", "", css, flags=re.S))
        self.assertTrue(selectors)
        self.assertTrue(all(selector.strip().startswith(("html[data-theme=\"light\"] .app[data-tab=\"games\"]", ".app[data-tab=\"games\"]"))
                            for selector in selectors))


if __name__ == "__main__":
    unittest.main()
