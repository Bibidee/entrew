import ast
import hashlib
import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
CONTRACT = ROOT / "contracts" / "entrew_registry.py"
PURE_HELPERS = {
    "_pairs_no_duplicates", "_strict_json", "_hash_text", "_canonical_repo",
    "_canonical_path", "_normalize_snapshot", "_snapshot_digest",
    "_aggregate_outcome", "_validate_criterion_vector", "_validate_review_record",
}
TREE = ast.parse(CONTRACT.read_text(encoding="utf-8"))
FUNCTIONS = [node for node in TREE.body if isinstance(node, ast.FunctionDef) and node.name in PURE_HELPERS]
NAMESPACE = {
    "json": json,
    "hashlib": hashlib,
    "re": re,
    "MAX_EVIDENCE_FILES": 3,
    "MARKER_PATH": ".entrew/claim.json",
    "ISSUE_CODES": ("NONE", "REPOSITORY_UNAVAILABLE", "REPOSITORY_IDENTITY_MISMATCH", "COMMIT_UNAVAILABLE", "COMMIT_IDENTITY_MISMATCH", "CLAIM_MARKER_MISSING", "CLAIM_MARKER_UNAVAILABLE", "CLAIM_MARKER_INVALID", "EVIDENCE_BUDGET_EXCEEDED", "VALIDATOR_OUTPUT_INVALID", "EVIDENCE_UNAVAILABLE"),
}
exec(compile(ast.Module(body=FUNCTIONS, type_ignores=[]), str(CONTRACT), "exec"), NAMESPACE)


class ContractPolicyTests(unittest.TestCase):
    def test_repo_is_normalized_and_rejects_url_syntax(self):
        self.assertEqual(NAMESPACE["_canonical_repo"]("Example-Org", "Data_Set"), ("example-org", "data_set"))
        for owner, repo in [("owner@evil.test", "repo"), ("owner", "../repo"), ("owner", "repo?x=1"), ("..", "repo")]:
            with self.subTest(owner=owner, repo=repo), self.assertRaises(ValueError):
                NAMESPACE["_canonical_repo"](owner, repo)

    def test_paths_reject_traversal_encoded_separators_and_arbitrary_hosts(self):
        canonical = NAMESPACE["_canonical_path"]
        for path in ["../secret", "src/../../secret", "%2e%2e/secret", "src%2fsecret", "\\\\server\\file", "https://evil.test/file", ".entrew/claim.json"]:
            with self.subTest(path=path), self.assertRaises(ValueError):
                canonical(path)
        self.assertEqual(canonical("src/parser.py"), "src/parser.py")

    def test_snapshot_digest_ignores_path_and_mapping_order(self):
        digest = NAMESPACE["_snapshot_digest"]
        paths = ["src/a.py", "docs/usage.md"]
        first = {"0": ["src/a.py"], "1": ["docs/usage.md", "src/a.py"]}
        second = {"1": ["src/a.py", "docs/usage.md"], "0": ["src/a.py"]}
        a = digest("Org", "Repo", "A" * 40, paths, first)
        b = digest("org", "repo", "a" * 40, list(reversed(paths)), second)
        self.assertEqual(a, b)

    def test_snapshot_digest_rejects_duplicate_paths_and_unbound_mapping(self):
        digest = NAMESPACE["_snapshot_digest"]
        with self.assertRaises(ValueError):
            digest("org", "repo", "a" * 40, ["src/a.py", "src/a.py"], {"0": ["src/a.py"], "1": ["src/a.py"]})
        with self.assertRaises(ValueError):
            digest("org", "repo", "a" * 40, ["src/a.py"], {"0": ["other.py"], "1": ["src/a.py"]})

    def test_deterministic_aggregation_precedence(self):
        aggregate = NAMESPACE["_aggregate_outcome"]
        self.assertEqual(aggregate([{"status": "MET"}, {"status": "MET"}], "REVISION_BOUND"), "QUALIFIED")
        self.assertEqual(aggregate([{"status": "NOT_MET"}, {"status": "UNVERIFIABLE"}], "INSUFFICIENT"), "NOT_ESTABLISHED")
        self.assertEqual(aggregate([{"status": "UNVERIFIABLE"}, {"status": "MET"}], "PROVIDER_UNAVAILABLE"), "INCONCLUSIVE")
        self.assertEqual(aggregate([{"status": "MET"}, {"status": "MET"}], "MISMATCH"), "NOT_ESTABLISHED")

    def test_strict_json_rejects_duplicate_keys(self):
        with self.assertRaises(ValueError):
            NAMESPACE["_strict_json"]('{"criteria":[],"criteria":[]}')

    def test_criterion_parser_requires_complete_closed_vector(self):
        parse = NAMESPACE["_validate_criterion_vector"]
        criteria = [{"key": "a"}, {"key": "b"}]
        mapping = {"0": ["src/a.py"], "1": ["docs/a.md"]}
        good = json.dumps({"criteria": [
            {"index": 1, "status": "MET", "evidence_paths": ["docs/a.md"], "explanation": "Matches the described usage."},
            {"index": 0, "status": "NOT_MET", "evidence_paths": ["src/a.py"], "explanation": "The cited implementation returns the wrong value."},
        ]})
        parsed = parse(good, criteria, mapping)
        self.assertEqual([row["index"] for row in parsed], [0, 1])
        self.assertEqual(parsed[0]["status"], "NOT_MET")

    def test_criterion_parser_rejects_missing_duplicate_extra_bad_enum_and_unbound(self):
        parse = NAMESPACE["_validate_criterion_vector"]
        criteria = [{"key": "a"}, {"key": "b"}]
        mapping = {"0": ["src/a.py"], "1": ["docs/a.md"]}
        row = {"index": 0, "status": "MET", "evidence_paths": ["src/a.py"], "explanation": "Bound evidence."}
        invalid = [
            {"criteria": [row]},
            {"criteria": [row, row]},
            {"criteria": [row, {**row, "index": 1, "status": "MAYBE", "evidence_paths": ["docs/a.md"]}]},
            {"criteria": [row, {**row, "index": 1, "evidence_paths": ["unmapped.py"]}]},
            {"criteria": [row, {**row, "index": 1, "evidence_paths": []}]},
            {"criteria": [row, {**row, "index": 1, "explanation": "x" * 241, "evidence_paths": ["docs/a.md"]}]},
            {"criteria": [row, {**row, "index": 1, "evidence_paths": ["docs/a.md"]}], "extra": True},
        ]
        for candidate in invalid:
            with self.subTest(candidate=candidate), self.assertRaises(ValueError):
                parse(json.dumps(candidate), criteria, mapping)

    def test_persisted_review_parser_rejects_bad_binding_schema_and_provenance(self):
        parse = NAMESPACE["_validate_review_record"]
        mapping = {"0": ["src/a.py"], "1": ["docs/a.md"], "all_paths": ["src/a.py", "docs/a.md"]}
        review = {
            "provenance": "REVISION_BOUND", "issue_code": "NONE", "repo": "org/repo", "commit_sha": "a" * 40,
            "marker_sha256": "b" * 64,
            "files": [
                {"path": "src/a.py", "sha256": "c" * 64, "classification": "REVISION_BOUND"},
                {"path": "docs/a.md", "sha256": "d" * 64, "classification": "REVISION_BOUND"},
            ],
            "criteria": [
                {"index": 0, "status": "MET", "evidence_paths": ["src/a.py"], "explanation": "Bound implementation."},
                {"index": 1, "status": "MET", "evidence_paths": ["docs/a.md"], "explanation": "Bound documentation."},
            ],
        }
        self.assertIs(parse(review, 2, "org/repo", "a" * 40, mapping), review)
        invalid = [
            {**review, "issue_code": "UNRECOGNIZED"},
            {**review, "repo": "org/fork"},
            {**review, "marker_sha256": ""},
            {**review, "files": review["files"][:1]},
            {**review, "files": [review["files"][0], {**review["files"][1], "classification": "INSUFFICIENT"}]},
            {**review, "criteria": review["criteria"][:1]},
        ]
        for candidate in invalid:
            with self.subTest(candidate=candidate), self.assertRaises(ValueError):
                parse(candidate, 2, "org/repo", "a" * 40, mapping)

    def test_insufficient_evidence_can_carry_only_partial_verified_provenance(self):
        parse = NAMESPACE["_validate_review_record"]
        mapping = {"0": ["src/a.py"], "1": ["docs/a.md"], "all_paths": ["src/a.py", "docs/a.md"]}
        review = {
            "provenance": "INSUFFICIENT", "issue_code": "EVIDENCE_UNAVAILABLE", "repo": "org/repo", "commit_sha": "a" * 40,
            "marker_sha256": "b" * 64,
            "files": [
                {"path": "src/a.py", "sha256": "c" * 64, "classification": "REVISION_BOUND"},
                {"path": "docs/a.md", "sha256": "", "classification": "PROVIDER_UNAVAILABLE"},
            ],
            "criteria": [
                {"index": 0, "status": "NOT_MET", "evidence_paths": ["src/a.py"], "explanation": "Bound implementation disproves the requirement."},
                {"index": 1, "status": "UNVERIFIABLE", "evidence_paths": [], "explanation": "Source unavailable."},
            ],
        }
        self.assertIs(parse(review, 2, "org/repo", "a" * 40, mapping), review)


if __name__ == "__main__":
    unittest.main(verbosity=2)

