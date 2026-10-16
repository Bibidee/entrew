"""Small mutation harness proving key pure-policy assertions detect regressions."""

import ast
import hashlib
import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CONTRACT = ROOT / "contracts" / "entrew_registry.py"
HELPERS = {
    "_pairs_no_duplicates", "_strict_json", "_hash_text", "_canonical_repo",
    "_canonical_path", "_normalize_snapshot", "_snapshot_digest", "_aggregate_outcome",
    "_validate_criterion_vector",
}
SOURCE = CONTRACT.read_text(encoding="utf-8")


def load_mutant(old, new):
    if old not in SOURCE:
        raise AssertionError(f"mutation target not found: {old}")
    mutated = SOURCE.replace(old, new, 1)
    tree = ast.parse(mutated)
    functions = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in HELPERS]
    namespace = {"json": json, "hashlib": hashlib, "re": re, "MAX_EVIDENCE_FILES": 3, "MARKER_PATH": ".entrew/claim.json"}
    exec(compile(ast.Module(body=functions, type_ignores=[]), str(CONTRACT), "exec"), namespace)
    return namespace


class MutationSmokeTests(unittest.TestCase):
    def test_mismatch_override_mutant_is_killed(self):
        mutant = load_mutant('if provenance == "MISMATCH":', 'if False and provenance == "MISMATCH":')
        actual = mutant["_aggregate_outcome"]([{"status": "MET"}, {"status": "MET"}], "MISMATCH")
        self.assertNotEqual(actual, "NOT_ESTABLISHED")

    def test_negative_precedence_mutant_is_killed(self):
        mutant = load_mutant('if "NOT_MET" in statuses:', 'if False and "NOT_MET" in statuses:')
        actual = mutant["_aggregate_outcome"]([{"status": "NOT_MET"}, {"status": "UNVERIFIABLE"}], "INSUFFICIENT")
        self.assertNotEqual(actual, "NOT_ESTABLISHED")

    def test_unbound_evidence_mutant_is_killed(self):
        mutant = load_mutant('if any(path not in allowed for path in evidence_paths):', 'if False:')
        raw = json.dumps({"criteria": [
            {"index": 0, "status": "MET", "evidence_paths": ["outside.py"], "explanation": "Bound claim."},
            {"index": 1, "status": "MET", "evidence_paths": ["docs/a.md"], "explanation": "Bound claim."},
        ]})
        criteria = [{"key": "a"}, {"key": "b"}]
        result = mutant["_validate_criterion_vector"](raw, criteria, {"0": ["src/a.py"], "1": ["docs/a.md"]})
        self.assertEqual(result[0]["evidence_paths"], ["outside.py"])

    def test_order_dependent_digest_mutant_is_killed(self):
        mutant = load_mutant('"evidence_paths": sorted(canonical_paths),', '"evidence_paths": canonical_paths,')
        digest = mutant["_snapshot_digest"]
        first = digest("org", "repo", "a" * 40, ["src/a.py", "docs/a.md"], {"0": ["src/a.py"], "1": ["docs/a.md"]})
        reordered = digest("org", "repo", "a" * 40, ["docs/a.md", "src/a.py"], {"1": ["docs/a.md"], "0": ["src/a.py"]})
        self.assertNotEqual(first, reordered)


if __name__ == "__main__":
    unittest.main(verbosity=2)
