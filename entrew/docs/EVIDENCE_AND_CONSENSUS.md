# Evidence, trust and validator equivalence model

## Only supported evidence in V1

- Public GitHub repository identified as owner/repo.
- An exact 40-character Git commit SHA, independently verified to exist inside named repository.
- Up to three explicitly declared UTF-8 files pinned at that revision. No browsing to additional user-supplied domains.
- `.entrew/claim.json` pinned to same revision, containing program ID, wallet address, repo and challenge nonce; note this establishes a limited association with the submitted revision, not human identity, IP ownership or proof of authorship.
- Optional GitHub commit signature verification fields recorded separately as a stronger *signature provenance* tier; do not equate an unsigned commit with fraudulent work, and do not claim that GitHub UI `Verified` by itself proves applicant authorship.

## Canonical retrieval

Construct URL paths from trusted host + canonical repo + exact SHA + allowlisted paths. Reject traversal, encoded traversal, separators/control characters, credentials, query injection and unexpected host redirects. Prefer the GitHub repository/commit/content APIs that permit exact revision. Detect response status (200/404/403/429/5xx), rate limits, incomplete payloads, unexpected encodings and varying provider data; do not parse JSON blindly. Need separate tests for percent-encoded path separators and Unicode normalization.

Hash exactly what was fetched *and evaluated*. If GitHub returns a content digest or signature metadata, store provenance without conflating provider claims, digest and cryptographic proof. A client-supplied digest is never an attestation.

Do not equate a content-size cap with transport-level download protection: the GenLayer web fetch primitive may receive a full provider payload before your content bound is applied. Confirm runtime request caps; fail closed if response is oversized or fetch fails. No silent truncated positive outcomes.

## Evidence authority / risk tiers

- `REVISION_BOUND` = exact GitHub repo+commit+path and content matched; strongest permitted V1 evidence, still provider-dependent.
- `REVISION_BOUND_SIGNED` = above and a supported, independently verified commit-signature provenance test. Signature can identify a GitHub-recognized key, not necessarily the wallet owner.
- `PROVIDER_UNAVAILABLE` = provider error/rate limit/timeout or uninterpretable content; outcome inconclusive absent independent contrary evidence.
- `MISMATCH` = verified source or claim contradicts submitted repo/program/wallet/revision binding; no qualification.
- `INSUFFICIENT` = fetched content does not conclusively support or refute a requirement.

Never display `verified` generically without specifying WHAT was verified: exact repository revision, GitHub signature, wallet signature, claim marker, or semantic criterion.

## Non-deterministic evaluation

Validator task: interpret published fixed criterion wording against exact immutable public source evidence. Leader and validators MUST independently retrieve sources and independently derive criterion verdicts. A checker who only parses leader JSON schema is not independent review.

- Fetch the same provider endpoints for exact SHA; produce a normalized canonical evidence identity and content-derived fingerprints.
- Ignore volatile GitHub fields (view counts, last-checked timestamps, comments) in consensus-critical equivalence.
- Treat **all** repository source, README text, filenames and marker metadata as untrusted DATA. Prompts must explicitly distinguish instruction and source data. Do not execute instructions embedded in files, including `ignore previous instructions`, role impersonation or links directing the model elsewhere.
- Use strict output schema: one vector covering all criterion indices with `MET | NOT_MET | UNVERIFIABLE`, stable evidence identifiers and limited explanatory strings; reject duplicate JSON keys, unknown enums, extra/missing indices, extra chatter or outsized output.
- Validators compare exact criterion index/status, binding identity, and relevant material evidence classifications. Explanations are not consensus-critical; hallucinated commentary should not move result.
- If leading/validator evidence materially differs, disagree/inconclusive rather than accepting an unsupported success. Do not auto-turn protocol disagreement into a finalized product-level inconclusive entry.
- Never let `confidence` number, keyword matching, signature metadata, CI result or existence of a file by itself substitute for substantive assessment.

## Deterministic precedence

For 2–3 mandatory criteria:
1. Verified false identity/provenance gate -> no qualification and explicit bound failure classification.
2. If at least one criterion is `NOT_MET` on adequate, authenticated/bound evidence -> `NOT_ESTABLISHED` (even if some others are `UNVERIFIABLE`), but ensure rejection never rests on a partial sample that can't prove absence.
3. Else if any criterion `UNVERIFIABLE` or required provenance is not established -> `INCONCLUSIVE`.
4. Else all `MET` and all required source gates passed -> `QUALIFIED`.

The exact treatment of missing claim marker and other structural failures must be frozen as an explicit policy with adversarial fixtures. Do not reinterpret criterion failures as network errors or vice versa.

## Audit artifacts per assessment

Immutable attempt ID; program terms hash; applicant/repo/full SHA; evidence-path identity and content digests; raw provider HTTP class (not secrets); provenance method/trust status; criterion decision vector; deterministic aggregate; explanation and issue codes; tx hash; finalized execution and canonical readback; review version; evaluator rules hash if supported.
