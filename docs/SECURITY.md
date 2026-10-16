# Security model and limits

## Enforced by contract source

- Only four public writes exist: publish, submit entry, submit revision, evaluate revision. There is no payable method, owner role, admin review, or outcome override.
- Published criteria and deadlines are stored once. An applicant wallet can create one entry per program, and only that wallet can revise or assess it.
- Every evaluation and revision checks the contract timestamp against the fixed deadline. The cutoff is `now >= deadline`.
- At most four distinct revision snapshots are allowed. A conclusive snapshot cannot be reviewed twice. An inconclusive snapshot can be retried twice after a ten-minute cooldown.
- Evidence path, source size, JSON shape, file fingerprint, provenance, criterion vector, and page bounds are checked before state writes.
- A qualification is appended to the roster only from contract state after every criterion is `MET` and provenance is revision-bound.

## Untrusted evidence

GitHub source, repository prose, comments, filenames, and the claim marker are data, never evaluator instructions. The prompt explicitly disallows code execution, link following, URL fetching, or role impersonation. Both leader and validator independently retrieve the fixed sources. Prompt output uses duplicate-key JSON rejection, closed criterion enums, exact indices, bounded explanations, and bound evidence paths. Stable evidence fingerprints and criterion statuses are compared for consensus.

The app does not claim the wallet maps to a human, that the applicant authored the Git commit, or that a commit signature is verified. A claim marker is only a revision-bound wallet/program/repository/nonce claim. The app has no GitHub credential, decision API, backend, or local decision cache.

## Release blockers and residual risks

- The GenVM compatibility of Python `hashlib`, `json`, `re`, base64 validation, response-size enforcement, storage access, time semantics, and the current nondeterministic request/prompt API has not been executed on GenLayer 0.39.1 or Studionet.
- Public unauthenticated GitHub API limits can make valid evidence unavailable. The code should fail closed to `INCONCLUSIVE`; this could limit usability.
- Semantic quality, false outcomes, validator disagreement, and prompt-injection resistance have not been benchmarked with live validators. The checked-in 40 cases are post-prompt authoring fixtures, not an independent holdout.
- Runtime/API response redirects, GitHub API representation/size behavior, and exact on-chain deadline timestamp semantics still need direct tests.
- The UI, deep links, MetaMask/Rabby selection, provider races, and narrow viewports have not had browser QA.
- No deployment source attestation, contract address, production site, or real positive/negative lifecycle evidence exists.

Do not deploy this code as an eligibility or hiring decision service until these checks are resolved and reviewed.
