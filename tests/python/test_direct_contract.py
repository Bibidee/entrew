"""Direct Mode tests against the real contract; requires genlayer-test and pytest."""

import base64
import hashlib
import json
import time
from contextlib import contextmanager
from unittest.mock import patch
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[2]
CONTRACT = ROOT / "contracts" / "entrew_registry.py"
CRITERIA = [
    {
        "key": "runtime-check",
        "type": "IMPLEMENTATION",
        "requirement": "The repository exposes a deterministic runtime health check that returns its documented status for a valid request.",
        "evidence_expectations": "A bounded implementation file showing the health check and its returned status.",
    },
    {
        "key": "usage-guide",
        "type": "DOCUMENTATION",
        "requirement": "The repository documents the runtime health check request and the status a caller should expect.",
        "evidence_expectations": "A bounded usage document describing the request and returned status.",
    },
]


def publish(contract, sender, title="A bounded runtime eligibility program"):
    criteria_json = json.dumps(CRITERIA)
    contract_id = contract.publish_program(
        title,
        "Evidence-based review of a public runtime implementation.",
        "Applicants provide exact-revision source evidence for each observable criterion.",
        criteria_json,
        int(time.time()) + 2 * 86400,
    )
    return contract_id


def b64(text):
    return base64.b64encode(text.encode("utf-8")).decode("ascii")


def wallet_address(wallet):
    return "0x" + bytes(wallet).hex()


def git_blob_sha(content):
    return hashlib.sha1(b"blob " + str(len(content)).encode("ascii") + b"\x00" + content).hexdigest()


def github_base64(content, line_wrapped=False):
    encoded = base64.b64encode(content).decode("ascii")
    if not line_wrapped:
        return encoded
    return "\n".join(encoded[index:index + 60] for index in range(0, len(encoded), 60)) + "\n"


def gh_file(path, text, returned_path=None, reported_sha=None, line_wrapped=False):
    content = text.encode("utf-8")
    body = {
        "type": "file",
        "encoding": "base64",
        "content": github_base64(content, line_wrapped),
        "path": returned_path if returned_path is not None else path,
        "sha": reported_sha if reported_sha is not None else git_blob_sha(content),
    }
    return {"status": 200, "body": json.dumps(body)}


def configure_common_web(direct_vm, sha, program_id, applicant, source_a=None, source_b=None, marker_status=200, nonce="a" * 32, marker_encoding="base64", marker_path=None, marker_sha=None, marker_line_wrapped=False):
    repo = "example/registry"
    direct_vm.mock_web(r"api\.github\.com/repos/example/registry/?$", {"status": 200, "body": json.dumps({"full_name": repo})})
    direct_vm.mock_web(r"api\.github\.com/repos/example/registry/commits/" + sha, {"status": 200, "body": json.dumps({"sha": sha})})
    marker = {"program_id": program_id, "wallet": wallet_address(applicant), "repository": repo, "challenge_nonce": nonce}
    if marker_status == 200:
        marker_bytes = json.dumps(marker, separators=(",", ":")).encode("utf-8")
        marker_body = {
            "type": "file",
            "encoding": marker_encoding,
            "content": github_base64(marker_bytes, marker_line_wrapped),
            "path": marker_path if marker_path is not None else ".entrew/claim.json",
            "sha": marker_sha if marker_sha is not None else git_blob_sha(marker_bytes),
        }
        direct_vm.mock_web(r"api\.github\.com/repos/example/registry/contents/\.entrew/claim\.json", {"status": 200, "body": json.dumps(marker_body)})
    else:
        direct_vm.mock_web(r"api\.github\.com/repos/example/registry/contents/\.entrew/claim\.json", {"status": marker_status, "body": "{}"})
    direct_vm.mock_web(r"api\.github\.com/repos/example/registry/contents/src/runtime\.py", source_a or gh_file("src/runtime.py", "def health():\n    return 'ok'\n"))
    direct_vm.mock_web(r"api\.github\.com/repos/example/registry/contents/docs/usage\.md", source_b or gh_file("docs/usage.md", "# Runtime health\nCall /health; a valid request returns ok.\n"))


def submit(contract, direct_vm, direct_bob, program_id, sha, nonce="a" * 32):
    direct_vm.sender = direct_bob
    return contract.submit_entry(
        program_id,
        "example",
        "registry",
        sha,
        json.dumps(["src/runtime.py", "docs/usage.md"]),
        json.dumps({"0": ["src/runtime.py"], "1": ["docs/usage.md"]}),
        nonce,
    )


def test_publish_entry_authorization_and_public_pagination(direct_vm, direct_deploy, direct_alice, direct_bob):
    direct_vm.check_pickling = True
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    assert json.loads(contract.get_program(program_id))["organizer"] == wallet_address(direct_alice)
    assert contract.get_program_count() == 1
    entry_id = submit(contract, direct_vm, direct_bob, program_id, "a" * 40)
    assert json.loads(contract.get_entry(entry_id))["applicant"] == wallet_address(direct_bob)
    assert contract.get_wallet_entry_count(wallet_address(direct_bob)) == 1
    with direct_vm.expect_revert("only the applicant wallet"):
        direct_vm.sender = direct_alice
        contract.submit_revision(entry_id, "b" * 40, '["src/runtime.py","docs/usage.md"]', '{"0":["src/runtime.py"],"1":["docs/usage.md"]}', "b" * 32)
    assert not hasattr(contract, "set_outcome")


def test_actual_page_index_scales_past_one_hundred_entries(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    for index in range(121):
        publish(contract, direct_alice, title=f"Runtime eligibility program number {index:03d}")
    assert contract.get_program_count() == 121
    assert len(json.loads(contract.get_programs_page(0, 25))) == 25
    assert len(json.loads(contract.get_programs_page(100, 25))) == 21
    with direct_vm.expect_revert("page bounds"):
        contract.get_programs_page(0, 26)


def test_real_contract_review_persists_only_final_qualified_result(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    sha = "c" * 40
    entry_id = submit(contract, direct_vm, direct_bob, program_id, sha)
    configure_common_web(direct_vm, sha, program_id, direct_bob)
    direct_vm.mock_llm(r".*", json.dumps({"criteria": [
        {"index": 0, "status": "MET", "evidence_paths": ["src/runtime.py"], "explanation": "The function returns the documented status."},
        {"index": 1, "status": "MET", "evidence_paths": ["docs/usage.md"], "explanation": "The guide states the request and response."},
    ]}))
    attempt_id = contract.evaluate_revision(entry_id, entry_id + ":r1")
    result = json.loads(contract.get_review(attempt_id))
    assert result["outcome"] == "QUALIFIED", {key: result.get(key) for key in ("outcome", "provenance", "issue_code", "files", "criteria")}
    assert [row["status"] for row in result["criteria"]] == ["MET", "MET"]
    assert len(json.loads(contract.get_program_qualified_page(program_id, 0, 25))) == 1
    with direct_vm.expect_revert("qualified entries are terminal"):
        direct_vm.sender = direct_bob
        contract.submit_revision(entry_id, "b" * 40, '["src/runtime.py","docs/usage.md"]', '{"0":["src/runtime.py"],"1":["docs/usage.md"]}', "b" * 32)
    assert contract.get_entry_revision_count(entry_id) == 1


def test_negative_proof_survives_an_unavailable_other_criterion(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    sha = "d" * 40
    entry_id = submit(contract, direct_vm, direct_bob, program_id, sha)
    configure_common_web(
        direct_vm,
        sha,
        program_id,
        direct_bob,
        source_a=gh_file("src/runtime.py", "def health():\\n    return 'failure'\\n"),
        source_b={"status": 503, "body": "unavailable"},
    )
    direct_vm.mock_llm(r".*", json.dumps({"criteria": [
        {"index": 0, "status": "NOT_MET", "evidence_paths": ["src/runtime.py"], "explanation": "The implementation returns failure instead of the documented ok status."},
    ]}))
    attempt_id = contract.evaluate_revision(entry_id, entry_id + ":r1")
    result = json.loads(contract.get_review(attempt_id))
    assert result["outcome"] == "NOT_ESTABLISHED", {key: result.get(key) for key in ("outcome", "provenance", "issue_code", "files", "criteria")}
    assert json.loads(contract.get_program_qualified_page(program_id, 0, 25)) == []


def test_proven_missing_marker_is_not_qualified(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    sha = "e" * 40
    entry_id = submit(contract, direct_vm, direct_bob, program_id, sha)
    configure_common_web(direct_vm, sha, program_id, direct_bob, marker_status=404)
    attempt_id = contract.evaluate_revision(entry_id, entry_id + ":r1")
    result = json.loads(contract.get_review(attempt_id))
    assert result["outcome"] == "NOT_ESTABLISHED"
    assert result["issue_code"] == "CLAIM_MARKER_MISSING"
    assert json.loads(contract.get_program_qualified_page(program_id, 0, 25)) == []


def test_provider_outage_is_product_inconclusive(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    sha = "f" * 40
    entry_id = submit(contract, direct_vm, direct_bob, program_id, sha)
    configure_common_web(direct_vm, sha, program_id, direct_bob, source_a={"status": 503, "body": "unavailable"}, source_b={"status": 429, "body": "rate limited"})
    attempt_id = contract.evaluate_revision(entry_id, entry_id + ":r1")
    result = json.loads(contract.get_review(attempt_id))
    assert result["outcome"] == "INCONCLUSIVE"
    assert result["provenance"] == "INSUFFICIENT"
    assert json.loads(contract.get_program_qualified_page(program_id, 0, 25)) == []


def test_github_line_wrapped_contents_are_revision_bound(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    sha = "a" * 40
    entry_id = submit(contract, direct_vm, direct_bob, program_id, sha)
    configure_common_web(
        direct_vm,
        sha,
        program_id,
        direct_bob,
        source_a=gh_file("src/runtime.py", "def health():\n    return 'ok'\n", line_wrapped=True),
        source_b=gh_file("docs/usage.md", "# Runtime health\nCall /health; a valid request returns ok.\n", line_wrapped=True),
        marker_line_wrapped=True,
    )
    _positive_llm(direct_vm)

    attempt_id = contract.evaluate_revision(entry_id, entry_id + ":r1")
    result = json.loads(contract.get_review(attempt_id))
    assert result["outcome"] == "QUALIFIED", {key: result.get(key) for key in ("outcome", "provenance", "issue_code")}
    assert result["provenance"] == "REVISION_BOUND"



@pytest.mark.parametrize(
    ("marker_path", "marker_sha"),
    [
        (".entrew/other.json", None),
        (None, "0" * 40),
    ],
)
def test_marker_metadata_mismatch_is_inconclusive(direct_vm, direct_deploy, direct_alice, direct_bob, marker_path, marker_sha):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    sha = "7" * 40
    entry_id = submit(contract, direct_vm, direct_bob, program_id, sha)
    configure_common_web(direct_vm, sha, program_id, direct_bob, marker_path=marker_path, marker_sha=marker_sha)
    _positive_llm(direct_vm)

    attempt_id = contract.evaluate_revision(entry_id, entry_id + ":r1")
    result = json.loads(contract.get_review(attempt_id))
    assert result["outcome"] == "INCONCLUSIVE", {key: result.get(key) for key in ("outcome", "provenance", "issue_code")}
    assert result["issue_code"] == "PROVIDER_RESPONSE_INVALID"


@pytest.mark.parametrize(
    ("returned_path", "reported_sha"),
    [
        ("src/other.py", None),
        (None, "0" * 40),
    ],
)
def test_evidence_metadata_mismatch_is_inconclusive(direct_vm, direct_deploy, direct_alice, direct_bob, returned_path, reported_sha):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    sha = "9" * 40
    entry_id = submit(contract, direct_vm, direct_bob, program_id, sha)
    source_a = gh_file(
        "src/runtime.py",
        "def health():\n    return 'ok'\n",
        returned_path=returned_path,
        reported_sha=reported_sha,
    )
    configure_common_web(direct_vm, sha, program_id, direct_bob, source_a=source_a)
    direct_vm.mock_llm(r".*", json.dumps({"criteria": [
        {"index": 0, "status": "MET", "evidence_paths": ["docs/usage.md"], "explanation": "The guide states the required status."},
    ]}))

    attempt_id = contract.evaluate_revision(entry_id, entry_id + ":r1")
    result = json.loads(contract.get_review(attempt_id))
    assert result["outcome"] == "INCONCLUSIVE", {key: result.get(key) for key in ("outcome", "provenance", "issue_code")}
    assert result["issue_code"] == "PROVIDER_RESPONSE_INVALID"

def test_raw_malformed_marker_cannot_reject_without_verified_repository(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    sha = "8" * 40
    entry_id = submit(contract, direct_vm, direct_bob, program_id, sha)

    direct_vm.mock_web(r"api\.github\.com/repos/example/registry/?$", {"status": 403, "body": "rate limited"})
    raw = r"raw\.githubusercontent\.com/example/registry/" + sha + r"/"
    # A hostile or stale raw marker could otherwise turn an API outage into a
    # conclusive mismatch, despite no repository/commit identity proof.
    direct_vm.mock_web(raw + r"\.entrew/claim\.json$", {"status": 200, "body": '{"repository":"attacker/other"}'})

    attempt_id = contract.evaluate_revision(entry_id, entry_id + ":r1")
    result = json.loads(contract.get_review(attempt_id))
    assert result["outcome"] == "INCONCLUSIVE", {key: result.get(key) for key in ("outcome", "provenance", "issue_code")}
    assert result["provenance"] == "PROVIDER_UNAVAILABLE"
    assert result["issue_code"] == "GITHUB_403_AMBIGUOUS"
    assert json.loads(contract.get_program_qualified_page(program_id, 0, 25)) == []


def test_raw_positive_marker_and_evidence_cannot_qualify_without_verified_commit(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    sha = "9" * 40
    entry_id = submit(contract, direct_vm, direct_bob, program_id, sha)

    direct_vm.mock_web(r"api\.github\.com/repos/example/registry/?$", {"status": 200, "body": json.dumps({"full_name": "example/registry"})})
    direct_vm.mock_web(r"api\.github\.com/repos/example/registry/commits/" + sha, {"status": 403, "body": "rate limited"})
    marker = {
        "program_id": program_id,
        "wallet": wallet_address(direct_bob),
        "repository": "example/registry",
        "challenge_nonce": "a" * 32,
    }
    raw = r"raw\.githubusercontent\.com/example/registry/" + sha + r"/"
    direct_vm.mock_web(raw + r"\.entrew/claim\.json$", {"status": 200, "body": json.dumps(marker, separators=(",", ":"))})
    direct_vm.mock_web(raw + r"src/runtime\.py$", {"status": 200, "body": "def health():\n    return 'ok'\n"})
    direct_vm.mock_web(raw + r"docs/usage\.md$", {"status": 200, "body": "# Runtime health\nCall /health; a valid request returns ok.\n"})
    direct_vm.mock_llm(r".*", json.dumps({"criteria": [
        {"index": 0, "status": "MET", "evidence_paths": ["src/runtime.py"], "explanation": "The function returns the documented status."},
        {"index": 1, "status": "MET", "evidence_paths": ["docs/usage.md"], "explanation": "The guide states the request and response."},
    ]}))

    attempt_id = contract.evaluate_revision(entry_id, entry_id + ":r1")
    result = json.loads(contract.get_review(attempt_id))
    assert result["outcome"] == "INCONCLUSIVE", {key: result.get(key) for key in ("outcome", "provenance", "issue_code", "criteria")}
    assert result["provenance"] == "PROVIDER_UNAVAILABLE"
    assert result["issue_code"] == "GITHUB_403_AMBIGUOUS"
    assert all(item["status"] == "UNVERIFIABLE" for item in result["criteria"])
    assert json.loads(contract.get_program_qualified_page(program_id, 0, 25)) == []


def test_raw_positive_evidence_cannot_override_commit_sha_mismatch(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    sha = "5" * 40
    entry_id = submit(contract, direct_vm, direct_bob, program_id, sha)

    direct_vm.mock_web(r"api\.github\.com/repos/example/registry/?$", {"status": 200, "body": json.dumps({"full_name": "example/registry"})})
    direct_vm.mock_web(r"api\.github\.com/repos/example/registry/commits/" + sha, {"status": 200, "body": json.dumps({"sha": "4" * 40})})
    marker = {
        "program_id": program_id,
        "wallet": wallet_address(direct_bob),
        "repository": "example/registry",
        "challenge_nonce": "a" * 32,
    }
    raw = r"raw\.githubusercontent\.com/example/registry/" + sha + r"/"
    direct_vm.mock_web(raw + r"\.entrew/claim\.json$", {"status": 200, "body": json.dumps(marker, separators=(",", ":"))})
    direct_vm.mock_web(raw + r"src/runtime\.py$", {"status": 200, "body": "def health():\n    return 'ok'\n"})
    direct_vm.mock_web(raw + r"docs/usage\.md$", {"status": 200, "body": "# Runtime health\nCall /health; a valid request returns ok.\n"})
    direct_vm.mock_llm(r".*", json.dumps({"criteria": [
        {"index": 0, "status": "MET", "evidence_paths": ["src/runtime.py"], "explanation": "The function returns the documented status."},
        {"index": 1, "status": "MET", "evidence_paths": ["docs/usage.md"], "explanation": "The guide states the request and response."},
    ]}))

    attempt_id = contract.evaluate_revision(entry_id, entry_id + ":r1")
    result = json.loads(contract.get_review(attempt_id))
    assert result["outcome"] == "NOT_ESTABLISHED", {key: result.get(key) for key in ("outcome", "provenance", "issue_code", "criteria")}
    assert result["provenance"] == "MISMATCH"
    assert result["issue_code"] == "COMMIT_IDENTITY_MISMATCH"
    assert all(item["status"] == "UNVERIFIABLE" for item in result["criteria"])
    assert json.loads(contract.get_program_qualified_page(program_id, 0, 25)) == []


def test_malformed_api_evidence_does_not_recover_from_unbound_raw_bytes(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    sha = "7" * 40
    entry_id = submit(contract, direct_vm, direct_bob, program_id, sha)
    configure_common_web(direct_vm, sha, program_id, direct_bob, source_a={"status": 200, "body": "not JSON"})

    marker = {
        "program_id": program_id,
        "wallet": wallet_address(direct_bob),
        "repository": "example/registry",
        "challenge_nonce": "a" * 32,
    }
    raw = r"raw\.githubusercontent\.com/example/registry/" + sha + r"/"
    direct_vm.mock_web(raw + r"\.entrew/claim\.json$", {"status": 200, "body": json.dumps(marker, separators=(",", ":"))})
    direct_vm.mock_web(raw + r"src/runtime\.py$", {"status": 200, "body": "def health():\n    return 'ok'\n"})
    direct_vm.mock_web(raw + r"docs/usage\.md$", {"status": 200, "body": "# Runtime health\nCall /health; a valid request returns ok.\n"})
    direct_vm.mock_llm(r".*", json.dumps({"criteria": [
        {"index": 0, "status": "MET", "evidence_paths": ["docs/usage.md"], "explanation": "The guide states the request and response."},
    ]}))

    attempt_id = contract.evaluate_revision(entry_id, entry_id + ":r1")
    result = json.loads(contract.get_review(attempt_id))
    assert result["outcome"] == "INCONCLUSIVE", {key: result.get(key) for key in ("outcome", "provenance", "issue_code", "files", "criteria")}
    assert result["provenance"] == "INSUFFICIENT"
    failed_source = next(item for item in result["files"] if item["path"] == "src/runtime.py")
    assert not failed_source["sha256"]
    assert failed_source["classification"] != "REVISION_BOUND"
    assert result["issue_code"] == "PROVIDER_RESPONSE_INVALID"
    assert json.loads(contract.get_program_qualified_page(program_id, 0, 25)) == []


def test_malformed_marker_encoding_is_inconclusive(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    sha = "6" * 40
    entry_id = submit(contract, direct_vm, direct_bob, program_id, sha)
    configure_common_web(direct_vm, sha, program_id, direct_bob, marker_encoding="utf-8")
    raw = r"raw\.githubusercontent\.com/example/registry/" + sha + r"/"
    direct_vm.mock_web(raw + r"\.entrew/claim\.json$", {"status": 404, "body": "not found"})

    attempt_id = contract.evaluate_revision(entry_id, entry_id + ":r1")
    result = json.loads(contract.get_review(attempt_id))
    assert result["outcome"] == "INCONCLUSIVE", {key: result.get(key) for key in ("outcome", "provenance", "issue_code")}
    assert result["issue_code"] == "PROVIDER_RESPONSE_INVALID"

@contextmanager
def _warp_to(direct_vm, timestamp):
    # Direct Mode's warp changes its message timestamp; patch Python's clock
    # because this contract intentionally uses time.time() for GenVM time.
    with patch("time.time", return_value=timestamp):
        yield


def _inconclusive_web(direct_vm, sha, program_id, applicant):
    configure_common_web(
        direct_vm,
        sha,
        program_id,
        applicant,
        source_a={"status": 503, "body": "temporarily unavailable"},
        source_b={"status": 503, "body": "temporarily unavailable"},
    )
    raw = r"raw\.githubusercontent\.com/example/registry/" + sha + r"/"
    direct_vm.mock_web(raw + r"\.entrew/claim\.json$", {"status": 503, "body": "temporarily unavailable"})


def _negative_llm(direct_vm):
    direct_vm.mock_llm(r".*", json.dumps({"criteria": [
        {"index": 0, "status": "NOT_MET", "evidence_paths": ["src/runtime.py"], "explanation": "The implementation returns failure instead of the required status."},
        {"index": 1, "status": "MET", "evidence_paths": ["docs/usage.md"], "explanation": "The documentation states the required status."},
    ]}))


def _positive_llm(direct_vm):
    direct_vm.mock_llm(r".*", json.dumps({"criteria": [
        {"index": 0, "status": "MET", "evidence_paths": ["src/runtime.py"], "explanation": "The implementation returns the required status."},
        {"index": 1, "status": "MET", "evidence_paths": ["docs/usage.md"], "explanation": "The documentation states the required status."},
    ]}))


def test_unauthorized_assessment_and_conclusive_replay_do_not_write(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    sha = "1" * 40
    entry_id = submit(contract, direct_vm, direct_bob, program_id, sha)
    configure_common_web(direct_vm, sha, program_id, direct_bob)
    _negative_llm(direct_vm)

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("only the applicant wallet"):
        contract.evaluate_revision(entry_id, entry_id + ":r1")
    assert contract.get_revision_attempt_count(entry_id + ":r1") == 0
    assert json.loads(contract.get_entry(entry_id))["current_result"] == "PENDING"

    direct_vm.sender = direct_bob
    attempt_id = contract.evaluate_revision(entry_id, entry_id + ":r1")
    assert json.loads(contract.get_review(attempt_id))["outcome"] == "NOT_ESTABLISHED"
    with direct_vm.expect_revert("a conclusive snapshot cannot be re-evaluated"):
        contract.evaluate_revision(entry_id, entry_id + ":r1")
    assert contract.get_revision_attempt_count(entry_id + ":r1") == 1
    assert contract.get_entry_revision_count(entry_id) == 1
    assert json.loads(contract.get_program_qualified_page(program_id, 0, 25)) == []


def test_inconclusive_retry_obeys_exact_cooldown_and_can_qualify(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    sha = "3" * 40
    entry_id = submit(contract, direct_vm, direct_bob, program_id, sha)
    _inconclusive_web(direct_vm, sha, program_id, direct_bob)
    direct_vm.sender = direct_bob

    first_id = contract.evaluate_revision(entry_id, entry_id + ":r1")
    first = json.loads(contract.get_review(first_id))
    assert first["outcome"] == "INCONCLUSIVE"
    assert first["assessed_at"] > 0
    with direct_vm.expect_revert("cooldown has not elapsed"):
        contract.evaluate_revision(entry_id, entry_id + ":r1")
    with _warp_to(direct_vm, first["assessed_at"] + 599):
        with direct_vm.expect_revert("cooldown has not elapsed"):
            contract.evaluate_revision(entry_id, entry_id + ":r1")
    assert contract.get_revision_attempt_count(entry_id + ":r1") == 1

    direct_vm.clear_mocks()
    configure_common_web(direct_vm, sha, program_id, direct_bob)
    _positive_llm(direct_vm)
    with _warp_to(direct_vm, first["assessed_at"] + 600):
        second_id = contract.evaluate_revision(entry_id, entry_id + ":r1")
    assert json.loads(contract.get_review(second_id))["outcome"] == "QUALIFIED"
    assert len(json.loads(contract.get_program_qualified_page(program_id, 0, 25))) == 1


def test_inconclusive_rechecks_are_capped_after_two_cooldowns(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    sha = "4" * 40
    entry_id = submit(contract, direct_vm, direct_bob, program_id, sha)
    _inconclusive_web(direct_vm, sha, program_id, direct_bob)
    direct_vm.sender = direct_bob

    prior = json.loads(contract.get_review(contract.evaluate_revision(entry_id, entry_id + ":r1")))
    for _ in range(2):
        direct_vm.clear_mocks()
        _inconclusive_web(direct_vm, sha, program_id, direct_bob)
        with _warp_to(direct_vm, prior["assessed_at"] + 600):
            prior = json.loads(contract.get_review(contract.evaluate_revision(entry_id, entry_id + ":r1")))
        assert prior["outcome"] == "INCONCLUSIVE"
    with _warp_to(direct_vm, prior["assessed_at"] + 600):
        with direct_vm.expect_revert("inconclusive recheck cap reached"):
            contract.evaluate_revision(entry_id, entry_id + ":r1")
    assert contract.get_revision_attempt_count(entry_id + ":r1") == 3


def test_deadline_boundary_blocks_assessment_and_revision_writes(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    sha = "5" * 40
    entry_id = submit(contract, direct_vm, direct_bob, program_id, sha)
    deadline = json.loads(contract.get_program(program_id))["deadline"]

    direct_vm.sender = direct_bob
    with _warp_to(direct_vm, deadline):
        with direct_vm.expect_revert("program deadline has passed"):
            contract.evaluate_revision(entry_id, entry_id + ":r1")
        with direct_vm.expect_revert("program deadline has passed"):
            contract.submit_revision(entry_id, "6" * 40, '["src/runtime.py","docs/usage.md"]', '{"0":["src/runtime.py"],"1":["docs/usage.md"]}', "b" * 32)
    assert contract.get_revision_attempt_count(entry_id + ":r1") == 0
    assert contract.get_entry_revision_count(entry_id) == 1


def test_duplicate_snapshot_and_reused_nonce_are_rejected_before_write(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    sha = "7" * 40
    entry_id = submit(contract, direct_vm, direct_bob, program_id, sha)
    configure_common_web(direct_vm, sha, program_id, direct_bob)
    _negative_llm(direct_vm)
    direct_vm.sender = direct_bob
    contract.evaluate_revision(entry_id, entry_id + ":r1")

    with direct_vm.expect_revert("snapshot has already been filed"):
        contract.submit_revision(entry_id, sha, '["docs/usage.md","src/runtime.py"]', '{"1":["docs/usage.md"],"0":["src/runtime.py"]}', "b" * 32)
    with direct_vm.expect_revert("fresh claim nonce"):
        contract.submit_revision(entry_id, "a" * 40, '["src/runtime.py","docs/usage.md"]', '{"0":["src/runtime.py"],"1":["docs/usage.md"]}', "a" * 32)
    assert contract.get_entry_revision_count(entry_id) == 1
    assert json.loads(contract.get_entry(entry_id))["revision_count"] == 1


def test_four_revision_cap_is_enforced_after_distinct_conclusive_results(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    current_sha = "a" * 40
    current_nonce = "a" * 32
    entry_id = submit(contract, direct_vm, direct_bob, program_id, current_sha, current_nonce)

    for revision_number in range(1, 5):
        direct_vm.clear_mocks()
        configure_common_web(direct_vm, current_sha, program_id, direct_bob, nonce=current_nonce)
        _negative_llm(direct_vm)
        direct_vm.sender = direct_bob
        result_id = contract.evaluate_revision(entry_id, entry_id + ":r" + str(revision_number))
        assert json.loads(contract.get_review(result_id))["outcome"] == "NOT_ESTABLISHED"
        if revision_number < 4:
            current_sha = format(revision_number + 1, "x") * 40
            current_nonce = format(revision_number + 1, "x") * 32
            contract.submit_revision(entry_id, current_sha, '["src/runtime.py","docs/usage.md"]', '{"0":["src/runtime.py"],"1":["docs/usage.md"]}', current_nonce)

    with direct_vm.expect_revert("revision cap reached"):
        contract.submit_revision(entry_id, "f" * 40, '["src/runtime.py","docs/usage.md"]', '{"0":["src/runtime.py"],"1":["docs/usage.md"]}', "f" * 32)
    assert contract.get_entry_revision_count(entry_id) == 4
    assert json.loads(contract.get_entry(entry_id))["revision_count"] == 4
