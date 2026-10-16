# Security model and limits

## Enforced by contract source

- Only four public writes exist: publish, submit entry, submit revision, evaluate revision. There is no payable method, owner role, admin review, or outcome override.
- Published criteria and deadlines are stored once. An applicant wallet can create one entry per program, and only that wallet can revise or assess it.
- Every evaluation and revision checks the contract timestamp against the fixed deadline. The cutoff is `now >= deadline`.
- At most four distinct revision snapshots are allowed. A conclusive snapshot cannot be reviewed twice. An inconclusive snapshot can be retried twice after a ten-minute cooldown.
- Evidence path, source size, JSON shape, file fingerprint, provenance, criterion vector, and page bounds are checked before state writes.
- A raw GitHub marker 404 is ambiguous and cannot prove a missing marker. Only the GitHub API 404 after verified repository and commit identity is classified as a confirmed missing marker. Provider failures and malformed source responses remain nonconclusive; raw fallback does not turn an ambiguous response into a provenance mismatch.
- A qualification is appended to the roster only from contract state after every criterion is `MET` and provenance is revision-bound.

## Untrusted evidence

GitHub source, repository prose, comments, filenames, and the claim marker are data, never evaluator instructions. The prompt explicitly disallows code execution, link following, URL fetching, or role impersonation. Both leader and validator independently retrieve the fixed sources. Prompt output uses duplicate-key JSON rejection, closed criterion enums, exact indices, bounded explanations, and bound evidence paths. Stable evidence fingerprints and criterion statuses are compared for consensus.

The app does not claim the wallet maps to a human, that the applicant authored the Git commit, or that a commit signature is verified. A claim marker is only a revision-bound wallet/program/repository/nonce claim. The app has no GitHub credential, decision API, backend, or local decision cache.

## Live verification

The prior production contract was deployed to Studionet `61999`. Its `getContractCode` readback hashed to the same SHA-256 as the then-tracked source. A real positive fixture was finalized as `QUALIFIED` with all criteria `MET` and included in the qualified roster. A real negative fixture was finalized as `NOT_ESTABLISHED` with a `NOT_MET` criterion and omitted from that roster. Both outcomes had revision-bound provenance and canonical state readback. The current remediation branch changes contract source, so these results do not verify the changed source. No deployment or production configuration change has been made for this branch. Historical hashes and receipt notes are in `docs/DEPLOYMENT.md`.

The deployment and negative assessment validator receipts reported cancellation/error after consensus quorum was reached. SDK finality and canonical state were confirmed; this receipt detail is retained rather than described as clean unanimous validator success.

## Residual risks and open coverage

- Live deployment and two outcomes exercise the pinned runtime's actual evidence fetch, prompt, validator and storage path. They do not cover every GenVM response edge, size boundary, time boundary, or failure mode.
- Public unauthenticated GitHub API limits can make valid evidence unavailable. The code is intended to fail closed to `INCONCLUSIVE`; a controlled live 403/429/5xx lifecycle was not performed.
- Semantic quality, false outcomes, validator disagreement and prompt-injection resistance have not been measured on an independent held-out corpus. The checked-in 40 cases are post-prompt authoring fixtures, not a holdout.
- Live corrected-revision, retry/cooldown, replay, unauthorized-wallet and deadline-boundary controls remain untested.
- The production app was reviewed in Brave and the evidence detail passed a focused axe audit with zero violations. Full keyboard-only and manual mobile review remain open; a repeated headless production route sweep also encountered an intermittent RPC fetch failure.
- The on-chain code-byte comparison is not an independent attestation service or a guarantee about build provenance.

Do not treat the two successful lifecycle outcomes as an independent semantic accuracy benchmark or as a completed adversarial audit. See `entrew/docs/TEST_MATRIX.md` for the outstanding cases.
