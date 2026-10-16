from __future__ import annotations
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
repository = manifest["repository"]
nonce_values = []
rows = []
counts = {"full_commit_sha": 0, "program_id": 0, "applicant_wallet": 0, "marker_binding": 0}


def valid_sha(value):
    return isinstance(value, str) and bool(re.fullmatch(r"[0-9a-fA-F]{40}", value))


def valid_wallet(value):
    return isinstance(value, str) and bool(re.fullmatch(r"0x[0-9a-fA-F]{40}", value))


def valid_program(value):
    return isinstance(value, str) and bool(value.strip()) and not value.startswith("PENDING_")


for fixture in manifest["fixtures"]:
    revisions = fixture.get("revisions")
    cases = revisions if revisions is not None else [fixture]
    for revision in cases:
        rel = fixture["target_path"]
        if revision is not fixture:
            rel += "/" + revision["revision"]
        marker_path = ROOT / "remote-layout" / rel / ".entrew" / "claim.template.json"
        marker = json.loads(marker_path.read_text(encoding="utf-8"))
        assert marker.get("repository") == repository == "Bibidee/entrew-fixtures", marker_path
        nonce = revision["challenge_nonce"]
        assert marker.get("challenge_nonce") == nonce, marker_path
        assert re.fullmatch(r"[0-9a-f]{32}", nonce), marker_path
        nonce_values.append(nonce)

        sha_ready = valid_sha(revision.get("commit_sha"))
        program_id = fixture.get("program_id")
        program_ready = valid_program(program_id)
        wallet = fixture.get("applicant_wallet")
        wallet_ready = valid_wallet(wallet)
        if sha_ready:
            counts["full_commit_sha"] += 1
        if program_ready:
            counts["program_id"] += 1
        if wallet_ready:
            counts["applicant_wallet"] += 1
        bound = (
            program_ready and marker.get("program_id") == program_id
            and wallet_ready and str(marker.get("wallet", "")).lower() == wallet.lower()
            and marker.get("repository") == repository
            and marker.get("challenge_nonce") == nonce
        )
        if bound:
            counts["marker_binding"] += 1
        rows.append((fixture, revision, marker, sha_ready, program_ready, wallet_ready, bound))

assert len(nonce_values) == len(set(nonce_values)), "fixture nonces must be unique"
assert len(rows) == 6, f"expected six unique marker revisions, got {len(rows)}"
corrected = next(item for item in manifest["fixtures"] if item["fixture_id"] == "corrected-revision")
corrected_revisions = corrected.get("revisions", [])
corrected_commits_distinct = (
    len(corrected_revisions) == 2
    and all(valid_sha(revision.get("commit_sha")) for revision in corrected_revisions)
    and corrected_revisions[0]["commit_sha"].lower() != corrected_revisions[1]["commit_sha"].lower()
)
unauthorized = next(item for item in manifest["fixtures"] if item["fixture_id"] == "unauthorized-action")
actor = unauthorized.get("unauthorized_wallet")
applicant = unauthorized.get("applicant_wallet")
unauthorized_distinct = bool(valid_wallet(actor) and valid_wallet(applicant) and actor.lower() != applicant.lower())
write_authorized = manifest.get("fixture_write_authorized") is True
has_target_entry = isinstance(unauthorized.get("target_entry_id"), str) and bool(unauthorized["target_entry_id"].strip())
ready = all(counts[key] == len(rows) for key in counts) and corrected_commits_distinct and unauthorized_distinct and has_target_entry and write_authorized

print(json.dumps({
    "repository_verified": len(rows),
    "unique_fresh_nonces": len(set(nonce_values)),
    "marker_revisions": len(rows),
    "full_commit_sha_ready": counts["full_commit_sha"],
    "program_id_ready": counts["program_id"],
    "applicant_wallet_ready": counts["applicant_wallet"],
    "marker_bindings_ready": counts["marker_binding"],
    "corrected_revision_distinct_commits": corrected_commits_distinct,
    "unauthorized_wallet_distinct": unauthorized_distinct,
    "unauthorized_target_entry_ready": has_target_entry,
    "fixture_write_authorized": write_authorized,
    "ready_to_publish_or_submit": ready,
    "blockers": manifest["blockers"]
}, indent=2))
