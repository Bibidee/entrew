import ast
import hashlib
import json
import re
import unittest
from pathlib import Path
from types import SimpleNamespace


ROOT = Path(__file__).resolve().parents[2]
CONTRACT = ROOT / "contracts" / "entrew_registry.py"
PURE_HELPERS = {
    "_pairs_no_duplicates", "_strict_json", "_hash_text", "_canonical_repo",
    "_canonical_path", "_normalize_snapshot", "_snapshot_digest",
    "_aggregate_outcome", "_validate_criterion_vector", "_validate_review_record", "_read_body",
    "_fetch_response", "_fetch_json", "_provider_issue_code", "_validate_source_content",
    "_api_url", "_is_git_object_sha", "_git_tree_blob_binding",
}
TREE = ast.parse(CONTRACT.read_text(encoding="utf-8"))
FUNCTIONS = [node for node in TREE.body if isinstance(node, ast.FunctionDef) and node.name in PURE_HELPERS]
NAMESPACE = {
    "json": json,
    "hashlib": hashlib,
    "re": re,
    "MAX_EVIDENCE_FILES": 3,
    "MAX_PATH_SEGMENTS": 8,
    "MAX_FILE_CHARS": 12000,
    "MAX_TOTAL_CHARS": 24000,
    "MAX_RESPONSE_CHARS": 20000,
    "MARKER_PATH": ".entrew/claim.json",
    "GITHUB_API": "https://api.github.com",
    "ISSUE_CODES": ("NONE", "REPOSITORY_UNAVAILABLE", "REPOSITORY_IDENTITY_MISMATCH", "COMMIT_UNAVAILABLE", "COMMIT_IDENTITY_MISMATCH", "CLAIM_MARKER_MISSING", "CLAIM_MARKER_INVALID", "EVIDENCE_BUDGET_EXCEEDED", "VALIDATOR_OUTPUT_INVALID", "EVIDENCE_UNAVAILABLE", "GITHUB_RATE_LIMITED", "GITHUB_403_AMBIGUOUS", "PROVIDER_HTTP_ERROR", "PROVIDER_TRANSPORT_ERROR", "PROVIDER_TRANSIENT_FAILURE", "PROVIDER_REDIRECTED", "PROVIDER_RESPONSE_INVALID", "PROVIDER_RESPONSE_TOO_LARGE", "SOURCE_ENCODING_INVALID", "SOURCE_TOO_LARGE", "SOURCE_BINARY_INVALID", "SOURCE_FILE_UNAVAILABLE"),
}
exec(compile(ast.Module(body=FUNCTIONS, type_ignores=[]), str(CONTRACT), "exec"), NAMESPACE)
FAKE_WEB = SimpleNamespace(response=None)
FAKE_WEB.get = lambda url, headers: FAKE_WEB.response
NAMESPACE["GITHUB_HEADERS"] = {}
NAMESPACE["gl"] = SimpleNamespace(nondet=SimpleNamespace(web=FAKE_WEB))


class ContractPolicyTests(unittest.TestCase):
    def test_genvm_status_code_and_direct_mode_status_fallback(self):
        fetch = NAMESPACE["_fetch_json"]
        url = "https://api.github.com/repos/example/registry"
        FAKE_WEB.response = SimpleNamespace(status_code=200, body=b'{"full_name":"example/registry"}', url=url)
        self.assertEqual(fetch(url), {"availability": "OK", "status": 200, "data": {"full_name": "example/registry"}})

        FAKE_WEB.response = SimpleNamespace(status=404, body=b"{}", url=url)
        self.assertEqual(fetch(url), {"availability": "HTTP_ERROR", "status": 404, "data": {}})


    def test_provider_failures_have_distinct_safe_classifications(self):
        fetch = NAMESPACE["_fetch_response"]
        issue = NAMESPACE["_provider_issue_code"]
        url = "https://api.github.com/repos/example/registry"
        for status, expected in [(429, "GITHUB_RATE_LIMITED"), (403, "GITHUB_403_AMBIGUOUS"), (503, "PROVIDER_TRANSIENT_FAILURE")]:
            FAKE_WEB.response = SimpleNamespace(status_code=status, body=b"provider error", url=url)
            response = fetch(url)
            self.assertEqual(response["availability"], "HTTP_ERROR")
            self.assertEqual(issue(response["availability"], response["status"]), expected)

        FAKE_WEB.response = SimpleNamespace(status_code=200, body=b"ok", url="https://elsewhere.test/")
        response = fetch(url)
        self.assertEqual(issue(response["availability"], response["status"]), "PROVIDER_REDIRECTED")

        FAKE_WEB.response = SimpleNamespace(status_code=200, body=b"\xff", url=url)
        response = NAMESPACE["_fetch_json"](url)
        self.assertEqual(response["availability"], "MALFORMED_JSON")
        self.assertEqual(issue(response["availability"], response["status"]), "PROVIDER_RESPONSE_INVALID")
        self.assertEqual(issue("SOURCE_ENCODING_INVALID"), "SOURCE_ENCODING_INVALID")

        FAKE_WEB.response = SimpleNamespace(status_code=200, body=b"x" * 20001, url=url)
        response = fetch(url)
        self.assertEqual(issue(response["availability"], response["status"]), "PROVIDER_RESPONSE_TOO_LARGE")

        FAKE_WEB.response = SimpleNamespace(status_code=200, body="not JSON", url=url)
        malformed = NAMESPACE["_fetch_json"](url)
        self.assertEqual(malformed["availability"], "MALFORMED_JSON")
        self.assertEqual(issue(malformed["availability"], malformed["status"]), "PROVIDER_RESPONSE_INVALID")

        original_get = FAKE_WEB.get
        def fail_transport(url, headers):
            raise OSError("temporary DNS failure")
        FAKE_WEB.get = fail_transport
        try:
            response = fetch(url)
            self.assertEqual(issue(response["availability"], response["status"]), "PROVIDER_TRANSPORT_ERROR")
        finally:
            FAKE_WEB.get = original_get

    def test_source_file_character_and_binary_boundaries(self):
        validate = NAMESPACE["_validate_source_content"]
        issue = NAMESPACE["_provider_issue_code"]
        self.assertEqual(validate("é" * 12000)["availability"], "OK")
        too_large = validate("a" * 12001)
        self.assertEqual(too_large["availability"], "SOURCE_TOO_LARGE")
        self.assertEqual(issue(too_large["availability"]), "SOURCE_TOO_LARGE")
        binary = validate("valid\x00binary")
        self.assertEqual(binary["availability"], "SOURCE_BINARY_INVALID")
        self.assertEqual(issue(binary["availability"]), "SOURCE_BINARY_INVALID")
    def test_repo_is_normalized_and_rejects_url_syntax(self):
        self.assertEqual(NAMESPACE["_canonical_repo"]("Example-Org", "Data_Set"), ("example-org", "data_set"))
        for owner, repo in [("owner@evil.test", "repo"), ("owner", "../repo"), ("owner", "repo?x=1"), ("..", "repo")]:
            with self.subTest(owner=owner, repo=repo), self.assertRaises(ValueError):
                NAMESPACE["_canonical_repo"](owner, repo)

    def test_repository_api_url_has_no_trailing_slash_and_routes_remain_exact(self):
        api_url = NAMESPACE["_api_url"]
        repository = "https://api.github.com/repos/bibidee/entrew-fixtures"
        self.assertEqual(api_url("bibidee", "entrew-fixtures", ""), repository)
        self.assertNotEqual(api_url("bibidee", "entrew-fixtures", ""), repository + "/")
        self.assertEqual(
            api_url("bibidee", "entrew-fixtures", "git/commits/" + "a" * 40),
            repository + "/git/commits/" + "a" * 40,
        )
        self.assertEqual(
            api_url("bibidee", "entrew-fixtures", "git/trees/" + "b" * 40),
            repository + "/git/trees/" + "b" * 40,
        )
        self.assertEqual(
            api_url("bibidee", "entrew-fixtures", "contents/.entrew/claim.json?ref=" + "c" * 40),
            repository + "/contents/.entrew/claim.json?ref=" + "c" * 40,
        )

    def test_tree_binding_reuses_immutable_tree_response_within_one_review(self):
        bind = NAMESPACE["_git_tree_blob_binding"]
        root = "a" * 40
        source = "b" * 40
        first_blob = "c" * 40
        second_blob = "d" * 40
        responses = {
            "https://api.github.com/repos/example/registry/git/trees/" + root: {
                "sha": root, "truncated": False, "tree": [{"path": "src", "type": "tree", "sha": source}],
            },
            "https://api.github.com/repos/example/registry/git/trees/" + source: {
                "sha": source, "truncated": False, "tree": [
                    {"path": "first.py", "type": "blob", "sha": first_blob},
                    {"path": "second.py", "type": "blob", "sha": second_blob},
                ],
            },
        }
        calls = []
        original_get = FAKE_WEB.get

        def counted_get(url, headers):
            calls.append(url)
            return SimpleNamespace(status_code=200, body=json.dumps(responses[url]), url=url)

        FAKE_WEB.get = counted_get
        try:
            cache = {}
            self.assertEqual(bind("example", "registry", root, "src/first.py", first_blob, cache)["availability"], "OK")
            self.assertEqual(bind("example", "registry", root, "src/second.py", second_blob, cache)["availability"], "OK")
            self.assertEqual(calls, list(responses))
        finally:
            FAKE_WEB.get = original_get

    def test_paths_reject_traversal_encoded_separators_and_arbitrary_hosts(self):
        canonical = NAMESPACE["_canonical_path"]
        for path in ["../secret", "src/../../secret", "%2e%2e/secret", "src%2fsecret", "\\\\server\\file", "https://evil.test/file", ".entrew/claim.json"]:
            with self.subTest(path=path), self.assertRaises(ValueError):
                canonical(path)
        self.assertEqual(canonical("src/parser.py"), "src/parser.py")
        self.assertEqual(canonical("a/b/c/d/e/f/g/h"), "a/b/c/d/e/f/g/h")
        with self.assertRaises(ValueError):
            canonical("a/b/c/d/e/f/g/h/i")

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

