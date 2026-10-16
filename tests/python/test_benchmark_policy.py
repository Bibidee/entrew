"""Checks benchmark fixture structure and deterministic policy only, not LLM accuracy."""

import ast
import json
import hashlib
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CONTRACT = ROOT / "contracts" / "entrew_registry.py"
CASES = json.loads((ROOT / "tests" / "benchmark" / "cases.json").read_text(encoding="utf-8"))
TREE = ast.parse(CONTRACT.read_text(encoding="utf-8"))
FUNCTIONS = [node for node in TREE.body if isinstance(node, ast.FunctionDef) and node.name == "_aggregate_outcome"]
NAMESPACE = {"hashlib": hashlib, "json": json, "re": re}
exec(compile(ast.Module(body=FUNCTIONS, type_ignores=[]), str(CONTRACT), "exec"), NAMESPACE)


class BenchmarkFixturePolicyTests(unittest.TestCase):
    def test_corpus_has_forty_cases_across_four_categories(self):
        self.assertEqual(len(CASES), 40)
        self.assertEqual({name: sum(case["group"] == name for case in CASES) for name in {case["group"] for case in CASES}}, {
            "qualified": 10, "not_established": 10, "uncertain": 10, "adversarial": 10,
        })
        for case in CASES:
            self.assertEqual(len(case["revision"]["commit_sha"]), 40)
            self.assertEqual(len(case["rubric"]), 2)
            self.assertEqual(set(case["expected"].keys()), {"provenance", "criteria", "outcome"})
            self.assertEqual(len(case["expected"]["criteria"]), 2)

    def test_aggregate_policy_matches_each_fixed_fixture(self):
        aggregate = NAMESPACE["_aggregate_outcome"]
        for case in CASES:
            with self.subTest(case=case["case_id"]):
                self.assertEqual(aggregate(case["expected"]["criteria"], case["expected"]["provenance"]), case["expected"]["outcome"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
