"""Direct Mode tests against the real contract; requires genlayer-test and pytest."""

import base64
import json
import time
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


def gh_file(text):
    return {"status": 200, "body": json.dumps({"type": "file", "encoding": "base64", "content": b64(text)})}


def configure_common_web(direct_vm, sha, program_id, applicant, source_a=None, source_b=None, marker_status=200):
    repo = "example/registry"
    direct_vm.mock_web(r"api\.github\.com/repos/example/registry/?$", {"status": 200, "body": json.dumps({"full_name": repo})})
    direct_vm.mock_web(r"api\.github\.com/repos/example/registry/commits/" + sha, {"status": 200, "body": json.dumps({"sha": sha})})
    marker = {"program_id": program_id, "wallet": wallet_address(applicant), "repository": repo, "challenge_nonce": "a" * 32}
    if marker_status == 200:
        marker_body = {"type": "file", "encoding": "base64", "content": b64(json.dumps(marker, separators=(",", ":")))}
        direct_vm.mock_web(r"api\.github\.com/repos/example/registry/contents/\.entrew/claim\.json", {"status": 200, "body": json.dumps(marker_body)})
    else:
        direct_vm.mock_web(r"api\.github\.com/repos/example/registry/contents/\.entrew/claim\.json", {"status": marker_status, "body": "{}"})
    direct_vm.mock_web(r"api\.github\.com/repos/example/registry/contents/src/runtime\.py", source_a or gh_file("def health():\n    return 'ok'\n"))
    direct_vm.mock_web(r"api\.github\.com/repos/example/registry/contents/docs/usage\.md", source_b or gh_file("# Runtime health\nCall /health; a valid request returns ok.\n"))


def submit(contract, direct_vm, direct_bob, program_id, sha):
    direct_vm.sender = direct_bob
    return contract.submit_entry(
        program_id,
        "example",
        "registry",
        sha,
        json.dumps(["src/runtime.py", "docs/usage.md"]),
        json.dumps({"0": ["src/runtime.py"], "1": ["docs/usage.md"]}),
        "a" * 32,
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
        source_a=gh_file("def health():\\n    return 'failure'\\n"),
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


def test_raw_github_fallback_recovers_when_api_is_unavailable(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(str(CONTRACT))
    direct_vm.sender = direct_alice
    program_id = publish(contract, direct_alice)
    sha = "9" * 40
    entry_id = submit(contract, direct_vm, direct_bob, program_id, sha)

    direct_vm.mock_web(r"api\.github\.com/repos/example/registry/?$", {"status": 403, "body": "rate limited"})
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
    assert result["outcome"] == "QUALIFIED", {key: result.get(key) for key in ("outcome", "provenance", "issue_code", "files", "criteria")}
    assert result["provenance"] == "REVISION_BOUND"
    assert len(result["marker_sha256"]) == 64
    assert all(item["classification"] == "REVISION_BOUND" for item in result["files"])
    assert len(json.loads(contract.get_program_qualified_page(program_id, 0, 25))) == 1
