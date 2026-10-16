# Threat model — ENTREW

Security work must target what this **non-custodial eligibility registry** actually does. No copied escrow or payment settlement code belongs here.

## Trust boundaries

A wallet signature proves request authority for that wallet, not personal identity. A repository claim marker proves ability to place an artifact in a particular GitHub revision, not copyright or GitHub account ownership. GitHub is an external centralized provider. GenLayer provides independent semantic interpretation through validators when configured correctly, not general-purpose software execution verification.

## Critical threats / requirements

1. **Organizer self-grading or edits**: organizer cannot set verdict, revise published criteria or deadline, or remove qualified entry. Immutable rubric digest and no admin override.
2. **Applicant submits someone else's project**: claimant wallet and program bound to marker in exact pinned commit, with independently checked repository identity. Do not claim this establishes legal ownership or contribution attribution. Fork policy must be clear per program.
3. **GitHub file/provenance spoofing**: fixed host; normalized repo, 40-char SHA, safe path; GitHub response `full_name` / commit SHA match; reject redirects or private-host targets where detectable; record digest.
4. **Prompt injection in source**: retrieved content is quoted/sanitized untrusted DATA, no instructions from README/code/markdown comments. Validators independently reproduce meaningful decisions.
5. **Source outage or 429**: classify `INCONCLUSIVE` when necessary, no unjustified negative result. Don't treat absent response as reliable absence.
6. **Oversized/unparseable evidence**: reject/fail closed before scoring; never silently truncate and qualify.
7. **Outcome shopping**: canonical digest normalized; no conclusive same-snapshot re-evaluation, bounded inconclusive retries, revision cap and cooldown; tests for path reordering and case.
8. **Sybil submissions/spam**: one entry per wallet per program, bounded length/attempts, network fee. This does not prevent many-wallet attacks. Avoid promising true person uniqueness or fair applicant limits.
9. **Malformed validator vector**: strict closed schema, exact indices, no duplicates, no extra statuses, bounded explanations, no outcome written before parsing.
10. **Leader rubber-stamping**: validator re-fetches and re-evaluates, not only schema-checking or affirming an assertion.
11. **Consensus divergence**: compare stable evidence identities/criterion decisions, not volatile provider metadata and free-form explanations; protocol indeterminacy separate from app INCONCLUSIVE.
12. **Premature roster inclusion**: only finalized + successful execution + canonical roster readback. Browser status never authority.
13. **Wallet/provider impersonation**: discover/select the exact EIP-1193 provider, disconnect semantics app-scoped, network 61999 check, guard account/chain changes while pending.
14. **Frontend XSS/data pollution**: untrusted source and explanations escaped, no unsafe HTML injection, no arbitrary rich HTML from repository files.
15. **Pagination denial of service**: no unbounded reads/loops. Organizer and applicant indexes, 25 cap, bounded count/page retry, wallet generation guards.
16. **Chain/deployment identity mixing**: activity records store chain ID, contract address, original wallet and hash. Never perform new-contract canonical readback on old deployments.
17. **Deadline edge races**: enforce contract time; browser countdown advisory only; explicit acceptance behavior for tx submitted before but finalized after deadline must be established with simulator/live proof, not guessed.
18. **Secret leakage**: no private keys, mnemonics, GitHub tokens or API secrets in static bundles/logs; public GitHub calls must work without secret backend credentials.
19. **Provider and runtime limitations**: external web redirects/DNS rebinding and GitHub rate limits may be outside contract's enforcement. Document observed behavior conservatively.
20. **Bad claims about evidence**: GitHub signature verified is not wallet ownership; git commit proof is not full functional verification; source digest is fingerprint, not immutable guarantee beyond provider/revision checks.

## Release gate severity

Block release on reproducible bypass of organizer/applicant authorization, criteria immutability, `QUALIFIED` only-from-MET rule, replay controls, finality boundary, provenance binding, mandatory criterion completeness, schema parsing, unsafe arbitrary URL fetch, or network/deployment mismatch. Disclose tooling-limited boundaries exactly and never substitute green CI for a live exploit check.
