# GenLayer provider escalation: validator-side GitHub 403 during bounded review

## Network and contract

- Network: GenLayer Studionet `61999`
- RPC: `https://studio.genlayer.com/api`
- Contract: `0xf365B36251a734B19d5E56A09AE54bD503fbcC31`
- Deployed source SHA-256: `a812dcc4884544ad77af6591d2b47cdd0221d6bd966633bd65200d1d02590f44`

## Reproduction

The contract retrieves a public GitHub repository through `gl.nondet.web.get` in this order: repository identity, exact Git commit, claim-marker Contents endpoint, bounded Git-tree traversal, then each evidence Contents endpoint and its immutable-tree binding.

Two fresh root-path missing-evidence attempts finalized as `INCONCLUSIVE / PROVIDER_UNAVAILABLE / GITHUB_403_AMBIGUOUS`:

- `0xdfe0c62321343d67a2a1703c0b4142691a97f0b6a1dd234c02bc22f781926b43` (`e7:r1`, `a5`)
- `0x49a88f31d12aa94d7fe24529c39a8f4a9748c989afe5249c10b4caf803c132d6` (`e9:r1`, `a7`)

For the second attempt, the immutable commit was `4e770e35ec05865139f5cebc6fd71bfc17391b3b`. Local read-only GitHub API requests returned `200` for repository, commit, `.entrew/claim.json`, and `missing_retest.md`; only `missing_retest.py` returned `404`, intentionally.

`a7` has empty `marker_sha256` and no file fingerprints. This establishes only that a validator-side failure occurred before the contract persisted a validated marker or evidence result. It does not identify which endpoint returned `403`.

## Successful comparison

The same deployed source completed root-path revision-bound reviews with issue `NONE`, including `0x15fb4a11ee6aa38b760ef31fdeea4c8cce83a80a42c5b13239c31fd09bdc7d96` and `0x68e46e698d37e6f59af79452a548b79397cab8c20480fad65f27948ab2249352`.

## Diagnostics requested

1. Do validators share outbound IP addresses for `gl.nondet.web.get`, and did GitHub apply primary or secondary rate limiting to those addresses at the listed transaction times?
2. Can Studio expose redacted per-request URL, status, and rate-limit classification for finalized nondeterministic executions?
3. Is there a supported replacement for unavailable `gen_dbg_traceTransaction` that exposes validator HTTP diagnostics without secrets?
4. Are public GitHub Contents and Git Trees API routes subject to known validator egress restrictions or repository-access policy?

The contract deliberately cannot inspect HTTP headers; the GenVM response interface used here provides status and body only, and error bodies/headers are discarded to retain bounded fail-closed behavior.
