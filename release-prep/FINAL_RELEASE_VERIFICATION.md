# ENTREW final release verification

## Verdict

**NOT SUBMISSION READY.** The reviewed contract is deployed and the positive, negative-baseline, and corrected-revision lifecycle has credible finalized evidence. The current-deployment mandatory negative and unavailable-evidence cases did not both complete with the required canonical results: one assessment finalized `MAJORITY_DISAGREE` without a state transition, and the unavailable-evidence assessment finalized as a validator-side GitHub provider outage.

## Current contract

| Field | Value |
| --- | --- |
| Network | Studionet `61999` |
| Contract | `0xf365B36251a734B19d5E56A09AE54bD503fbcC31` |
| Source SHA-256 | `a812dcc4884544ad77af6591d2b47cdd0221d6bd966633bd65200d1d02590f44` |
| Deployment transaction | `0xf26389f61139ebc079e4da0b1512aee882d229346546a896fe250b18a38853ad` |

## Lifecycle matrix

| Case | Expected | Actual | Evidence | Status |
| --- | --- | --- | --- | --- |
| Initial corrected fixture | `NOT_ESTABLISHED` | `NOT_ESTABLISHED`, revision-bound | `0xbc6a11b8fad81cf493b0d34adc732d43e0e70cc06e3bddb6c9993d90686383a6` | PASS |
| Corrected revision | `QUALIFIED` | `QUALIFIED`, `[MET, MET]`, issue `NONE` | `0x15fb4a11ee6aa38b760ef31fdeea4c8cce83a80a42c5b13239c31fd09bdc7d96` | PASS |
| Independent positive | `QUALIFIED` | `QUALIFIED`, `a4`, revision-bound | `0x1a3ac566ab619cded4c9eeef01646f35ee650650c0a9c00cc59ff1399b3feba2` | PASS |
| Negative fixture | `NOT_ESTABLISHED` | Finalized `MAJORITY_DISAGREE`; entry `e6` remains pending | `0xecc99a198d2f0f77a9ae9df552d17df9ca8c916b5a4bb3a39bf21a56670b0152` | BLOCKED |
| Unavailable evidence | `INCONCLUSIVE / missing evidence` | `INCONCLUSIVE / PROVIDER_UNAVAILABLE / GITHUB_403_AMBIGUOUS`; entry `e7` unqualified | `0xdfe0c62321343d67a2a1703c0b4142691a97f0b6a1dd234c02bc22f781926b43` | BLOCKED |

The marker-prefix fixture defect is preserved as historical evidence: malformed wallet markers correctly produced `CLAIM_MARKER_INVALID`; corrected fixtures use canonical `0x` addresses.

## Verification status

The strict verifier intentionally remains failing because it rejects provider-unavailable evidence before marker comparison and requires a completed conclusive negative plus a semantically unavailable-evidence case. This is correct behavior and has not been weakened.

The frozen semantic benchmark validates structurally but remains `0/40` genuinely evaluated. No independently attested evaluator is configured. A 40-case on-chain run needs separate approval with an explicit budget, fixtures, and funded signer plan.

The local full quality suite previously passed at `5cad64f`: typecheck, lint, contract surface, release-prep, policy, mutation, Direct Mode, production build, dependency audit, and network check. The configured Playwright flow needs a completed terminal rerun after its isolated-program-title fixture correction. Real extension-wallet and non-production hosted-preview checks require an available browser extension session and Vercel project access.

## Production and approval status

No Vercel production variable, deployment, alias, or PR merge was changed. The production cutover remains unapproved. A new bounded lifecycle attempt should occur only after the validator-side GitHub provider condition is independently stable; it must use fresh immutable fixtures and preserve the existing failed attempts.

## Receipt attribution

Negative transaction `0xecc99a198d2f0f77a9ae9df552d17df9ca8c916b5a4bb3a39bf21a56670b0152` finalized `MAJORITY_DISAGREE`: three validators voted disagree, two became idle after quorum, and the leader execution succeeded. The exposed receipt has no independent review payload or provider error for the disagreeing validators, so it cannot distinguish semantic disagreement from a provider-dependent divergence. It is classified as unidentifiable from available logs.

Unavailable-evidence transaction `0xdfe0c62321343d67a2a1703c0b4142691a97f0b6a1dd234c02bc22f781926b43` finalized `MAJORITY_AGREE`. Canonical `a5` for `e7:r1` is `INCONCLUSIVE`, `PROVIDER_UNAVAILABLE`, `GITHUB_403_AMBIGUOUS`; this is an external validator-side GitHub limitation, not applicant failure.