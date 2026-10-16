# ENTREW — Product Specification V1

## Single-sentence promise

ENTREW turns a published, immutable developer-program rubric and revision-locked public GitHub evidence into an independently reviewable, consensus-backed qualification record.

## Actors / authorities

1. **Organizer wallet**: publishes a program and fixed rubric/deadline. Cannot amend frozen rubric, approve/reject applications, erase evidence or alter outcomes.
2. **Applicant wallet**: signs one program-specific application, requests assessments, creates bounded revisions and sees recoverable tx activity. Cannot change an already adjudicated evidence snapshot.
3. **Public observer**: browses programs, entry evidence, criterion outcomes and qualified roster without wallet access. May verify underlying GitHub revision and chain record.
4. **GenLayer validators**: independently assess published requirements using only permitted, provenance-bound public evidence. No administrator, human override, single off-chain model or organizer privilege substitutes for consensus.
5. **Deterministic contract logic**: exclusively controls authorization, deadlines, replay prevention, state transitions, review limits, roster membership and pagination.

## V1 scope

- Public, non-financial developer cohort and technical challenge programs.
- Exactly 2 or 3 mandatory program criteria (no optional scoring in V1). At least one criterion must require a genuine semantic code/documentation assessment; all must be independently assessable within the evidence bounds.
- Program metadata: canonical ID, organizer wallet, title, short summary, explanation, criteria, supported source policy, created_at, deadline, terms digest.
- Program rubric field: stable criterion key, type, bounded natural-language requirement, evidence expectations, testable success/failure distinctions. Allow a restricted type set: `IMPLEMENTATION`, `DOCUMENTATION`, `INTEGRATION`. Types guide evidence; they do **not** turn evaluation into mere keyword matching.
- Application: one wallet/program identity, canonical GitHub owner/repository, 40-hex commit SHA, up to 3 explicitly named UTF-8 evidence paths at that revision, mapping criterion->one or more paths, claim marker path + content, evidence digest, revision ID.
- Assessment: independently derived per-criterion `MET | NOT_MET | UNVERIFIABLE`, evidence provenance and explanation; overall `QUALIFIED | NOT_ESTABLISHED | INCONCLUSIVE`.
- Qualification roster is deterministic from *finalized contract state*. No money, score leaderboard, badge token, organizer veto or soft approval.
- Bounded retry mechanics before deadline (see `docs/STATE_MACHINE.md`).
- Public explorer, evidence workspace, decision anatomy, personal workspace and local transaction recovery.

## Draft V1 bounds (configuration to confirm with actual GenLayer gas/memory tests)

These are DESIGN TARGETS, not claims of tested performance:
- Program title: 12–100 UTF-8 characters; summary <= 360; detail <= 1200.
- 2–3 criteria; each 40–360 characters plus 0–240 explanation of what demonstrates success.
- Deadline future, between 24 hours and 90 days after publication.
- Max 3 evidence file paths, total decoded evidence budget 24,000 chars; each file <= 12,000; reject binary and excessive/invalid UTF-8. Explicitly differentiate GitHub response size from decoded evaluation content bounds.
- Program marker `.entrew/claim.json` (at same fixed commit): canonical program ID, claimant address, declared repo and unique claim nonce. The exact SHA is verified and bound externally through the revision, not embedded in the marker itself. **Resolve self-reference:** a file committed at SHA cannot literally contain that SHA without changing the SHA. Thus bind the claim to `program ID + wallet + repo + claim nonce`, and bind it to commit SHA externally through the immutable evaluated revision. Never require literal SHA inside the commit file.
- A wallet may maintain one entry per program, with maximum 4 distinct submitted revisions before deadline. Maximum 2 inconclusive rechecks of one snapshot with a minimum cooldown (initial proposal: 10 minutes), and global/applicant review quotas decided after liveness stress tests.
- Page sizes hard-capped 25 and never load all history unbounded. Draft caps are review subjects, not arbitrary authoritative performance claims.

## Rubric guardrails

Criteria must specify an observable implementation/documentation/integration requirement. Reject or flag vague taste claims ('best', 'beautiful', 'high-quality'), unverifiable off-chain accomplishments, personal/sensitive data, external logins and malicious activity. The frontend preview is advisory; contract must enforce structural constraints. No proprietary AI grading endpoint or hidden moderation committee.

A rubric can still be biased or poorly designed despite schema checks. Entrew is not a universal fairness certifier. Published rubric is immutable; correcting requirements means publishing a **new** program, not retroactive modification.

## Example (FICTIONAL; never display as live data)

Program: `Open Source Data Toolkit Cohort`.
- C1 IMPLEMENTATION: repository contains a programmatically callable CSV parser that reports malformed rows rather than silently skipping them.
- C2 DOCUMENTATION: contributor-facing documentation includes minimal installation instructions and one working-use example corresponding to implemented API.
- C3 INTEGRATION: parser is invoked by a provided import/export path with explicit error surfacing.

An independent verifier may establish whether the submitted exact code meets these requirements. Presence of a filename alone does not prove substantive functionality. A vendor assertion or opaque README claim is not enough.

## Non-goals

- No hiring decision, degree/accreditation, KYC, plagiarism proof, ownership title, employment certification, token reward, leaderboard, escrow or reputation scores.
- No promise of executing untrusted source code. V1 reads and reasons about bounded source evidence; it does not prove end-to-end runtime behavior or software security.
- No centralized user accounts, job queues, admin review portal, backend cache of truth, private repository access, or unbounded crawling.

## Definition of usable

A first-time visitor can find a program, read every requirement, connect a wallet, see exact revision and claim proof, submit within deadline, independently trigger evaluation, recover a tx hash on refresh, inspect criterion outcomes, and verify a finalized qualified entry from public reads on another browser. The UI never shows mocks as live, nor confuses protocol acceptance with finalized qualification.
