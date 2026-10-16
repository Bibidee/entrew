# EntrewRegistry — engineering contract specification (not source code)

**Proposed source path after build:** `contracts/entrew_registry.py`.

## Storage schema (conceptual, adapt precisely to pinned GenLayer type/storage rules)

**Program**: program_id; organizer Address; title; summary; description; 2–3 frozen criteria; deadline; created_at; schema_version; exact terms digest; public counters/indexes.

**Criterion**: index; key; category enum (`IMPLEMENTATION`, `DOCUMENTATION`, `INTEGRATION`); requirement text; evidence expectations; mandatory=true.

**Entry**: entry_id; program_id; applicant Address; repo owner/name; immutable claimed-repo identity per entry; current revision index; current product result; last conclusive revision; created_at; deadline snapshot; qualification marker; finalized-review records.

**Revision**: revision ID; entry ID; full 40-hex commit; source path mapping; claim-marker metadata; canonical submission digest; applicant address; submitted_at; final attempt/result pointer; immutable after submission.

**ReviewAttempt**: attempt_id; revision ID; snapshot/digest; criterion vector; final outcome; evidence trust classifications; validator evidence binding metadata; source availability category; concise explanation; assessed_at; replay identity; number of same-revision inconclusive retries.

**Indexes**: organizer -> program IDs; public programs; program -> applicant entry IDs; applicant -> entry IDs; program -> qualified entry IDs (append once on qualification); entry -> revisions; revision -> attempts. Use pagination without unbounded scans; sparse/reordered inserts and concurrent readers must be safe.

## Proposed public write interface

Method names below are design targets, NOT tested ABI signatures:

- `publish_program(title, summary, description, criteria, deadline) -> program_id`:
  validate schema, immutable rubric, deadline, organizer caller, uniqueness/quotas; return canonical ID; never payable.
- `submit_entry(program_id, repo, commit_sha, evidence_paths, evidence_mappings, claim_nonce) -> entry_id/revision_id`:
  applicant-only write, program open; create once or delegate future revisions to explicit method; validate all bounds and snapshot identity; never store unbounded pasted source.
- `submit_revision(entry_id, commit_sha, evidence_paths, evidence_mappings, claim_nonce) -> revision_id`:
  applicant only, before deadline; only if prior revision is demonstrably not qualified; enforce max 4 distinct SHAs/snapshot digests, no mutation of old record.
- `evaluate_revision(entry_id, revision_id) -> review_attempt_id / result`:
  applicant caller (or explicit permissionless alternative with anti-spam protections after profiling), deadline active, exact snapshot, bounded attempts, immutable published criteria, fresh independent validator review, all-or-nothing persistence.
- `retry_inconclusive(entry_id, revision_id) -> attempt_id`:
  only after recorded app-level inconclusive, within deadline and cooldown, max 2 rechecks; same snapshot bound, no conclusive outcome shopping. Protocol `UNDETERMINED` is not persisted as app-level inconclusive and does not consume an app-level retry unless contract execution actually finalized.

If a single call submits+reviews, separately preserve the canonical submission and review identities and handle both receipt/readback paths. Prefer separate calls for reliable recovery, independent verification and lower ambiguity.

## Proposed finalized public reads

`get_program`, `get_program_count`, `get_programs_page`, `get_program_entry_count`, `get_program_entries_page`, `get_program_qualified_count`, `get_program_qualified_page`, `get_wallet_entry_count`, `get_wallet_entries_page`, `get_wallet_program_count`, `get_wallet_programs_page`, `get_entry`, `get_revision`, `get_entry_revision_page`, `get_revision_attempts_page`, `get_review`, `get_protocol_policy` / `get_info`.

Return stable, typed, bounded objects. Define exact args/results in code and export schema for frontend. All reads used to assert public qualification must be finalized-only. Avoid `list_all` APIs and unbounded scans.

## Deterministic invariants

1. No contract custodial GEN. Write calls carry zero application value; separate network fees may still apply.
2. One immutable organizer-authorized rubric/deadline per program; no owner/admin veto and no result setter.
3. Program must be published before entry, not expired when submitting or reviewing.
4. Only applicant wallet may change its own application's revisions or invoke its assessment in V1.
5. One entry per `(program_id, applicant_address)`; no multi-wallet unique-human claim.
6. Every revision is tied to one program, applicant wallet, repo and exact full SHA with canonical evidence path set + mapping.
7. A committed claim file's data is checked against entry wallet/program/repo; SHA provenance comes from GitHub commit lookup and revision reference, NOT self-referential SHA inside the file.
8. A conclusive exact snapshot cannot be reviewed again; `INCONCLUSIVE` retry is bounded and transparent.
9. Criterion-vector parser is closed-schema, bounded and all required indices present exactly once. Inconsistency fails closed before storage mutation.
10. Overall result is derived deterministically from criterion vector + source authenticity gates; model cannot directly assign roster state.
11. `QUALIFIED` requires every criterion MET AND passed provenance gates. Final qualified entry immutable for that program.
12. Do not turn source unavailable/429/5xx/missing evidence into `NOT_MET` without positive contradictory evidence.
13. Terminal qualified history never mutates; no roster duplicates; result visible only from finalized canonical state.
14. Exact index/offset pagination remains valid under new writes and sparse IDs.
15. Protocol `UNDETERMINED`, `ACCEPTED`, `FINALIZED` are not product outcomes.
16. No admin, requester, organizer or maintainer override method for evidence verdicts.

## Handling ambiguous evidence

- Objective provenance failure that reliably disproves a *submitted claim* (wrong program claim marker, exact file proven absent at pinned revision) must receive an explicit error classification separate from source outage. Whether the overall product outcome is `NOT_ESTABLISHED` or `INCONCLUSIVE` should be pinned in the review policy and benchmark, not left to model whim.
- 404 for GitHub commit can mean truly nonexistent or provider failure during propagation; require accurate status/response classification.
- `NOT_MET` needs affirmative reliable evidence a criterion was not satisfied; omission from a *bounded but incomplete* sample does not prove absence from entire repo.
- Any truncation or unsupported source format is `UNVERIFIABLE` unless it deterministically invalidates the submission before assessment.

## Implementation caution

Do not copy API syntax from old contracts blindly. Verify `@gl.public.write`, storage dataclasses, `gl.nondet.web`, `run_nondet_unsafe`, limits, time and `gl.message.sender_address` against exact local `0.39.1` / pinned SDK, and run Direct Mode. No contract here has been compiled or deployed.
