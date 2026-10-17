# Final provider remediation — controlled Studionet evidence (2026-10-17)

**Status: live provider path verified for the bounded lifecycle. This is not submission approval.**

## Immutable candidate and deployment

| Item | Value |
| --- | --- |
| Network | GenLayer Studionet `61999` (`0xf22f`) |
| Reviewed source SHA-256 | `a812dcc4884544ad77af6591d2b47cdd0221d6bd966633bd65200d1d02590f44` |
| Git blob ID | `7e699224bbbd77e0b60d1364a592ebe49332ba84` |
| CLI | repository-local GenLayer CLI `0.39.1` |
| Deployment transaction | `0xf26389f61139ebc079e4da0b1512aee882d229346546a896fe250b18a38853ad` |
| Contract | `0xf365B36251a734B19d5E56A09AE54bD503fbcC31` |

The deployment finalized with `MAJORITY_AGREE`. A read-only `gen_getContractCode` attestation returned bytes exactly equal to the reviewed local source hash above. `get_info` returned the expected `EntrewRegistry` schema on chain `61999`.

## Provider forensic result

The historical root-path assessment `a5` on the prior contract had ended in `INCONCLUSIVE / PROVIDER_UNAVAILABLE / GITHUB_403_AMBIGUOUS`. Its exact fixture repository, commit, tree, marker, and files remained reachable through authenticated local GitHub API requests. That proves local availability only; contract response handling exposes status and body but deliberately does not expose response headers, and the canonical transaction record does not contain per-validator URL logs.

The reviewed cache remains scoped to one review execution. Its request plan reduces repeated immutable Git tree lookups without sharing data across validators: the historical root layout falls from nine to seven GitHub calls, and the nested fixture layout falls from fifteen to eleven. It retains exact repository, full-commit, tree, blob, marker, and content checks.

## Controlled lifecycle

A new program and one entry were created on the new contract with separate organizer and applicant wallets. The fixture branch is `entrew-optimized-live-20261017` in `Bibidee/entrew-fixtures`.

| Step | Transaction | Canonical result |
| --- | --- | --- |
| Publish `p1` | `0x746279d811dddc0f9c46a303a53063ab754eae160dd186cfe028e58a3f256883` | finalized |
| Submit `e1:r1` | `0xfbe6b8fa3508f3d8ea6c77760e138dc3aeaac1c002ddfcbdb46737a9fe427455` | finalized |
| Assess `e1:r1` | `0xbc6a11b8fad81cf493b0d34adc732d43e0e70cc06e3bddb6c9993d90686383a6` | `NOT_ESTABLISHED`, `REVISION_BOUND`, `[NOT_MET, MET]` |
| Submit `e1:r2` | `0xe95aef48b41c157640c6d2e8768e1f87b1bcff105bcc1204c3cd580bb21ec4f4` | finalized |
| Assess `e1:r2` | `0x15fb4a11ee6aa38b760ef31fdeea4c8cce83a80a42c5b13239c31fd09bdc7d96` | `QUALIFIED`, `REVISION_BOUND`, `[MET, MET]` |

The initial immutable fixture commit was `17882f6e968dca7b41bfd0a02329ec9eba8aaba3`; its marker bound `p1`, applicant `0x02b137dde85c7798f06665dc19449b8797882055`, and nonce `dd7b577648d045b69d5afee5de89790c`.

The corrected immutable fixture commit was `ed9dc4ac0d93a06359093a14e6c5d196816e2ee1`, tree `5f4c7cfbd001e8a1c4e288a35ce69144aa17e1e1`, marker blob `e7088394837c89d83d25e46d01893c4f8110300b`, source blob `951852f52d7fcf81c47a4937b11c1c4b0eeddc06`, documentation blob `66ef3758f58d066fcfecb416c837a8464f35faea`, and fresh nonce `4d345da5529a4d4d9edcebb66d8d3b35`. GitHub API readback confirmed the exact repository, full commit, marker binding, and evidence blobs before submission.

Canonical readback for `a2` records `issue_code: NONE`, `QUALIFIED`, `REVISION_BOUND`, the two `MET` criteria, corrected commit, marker SHA-256 `b1f8c489e243fe20f0431a1cdbed132d2a6f78da60818e942e5fb80ef4198093`, and evidence SHA-256 values `959b6d74bad1044acfa87cbc56f5ff1f94b6464d9dcdad7545e623f140cc55df` and `b71bfb3b405d8a3a97f30f0732ec51fae68985edb640e51cc99f130edfc58d34`.

Three accepted CLI transactions (`0x5bba62f71a8af912f9f9b7d3a09913177c043e82966c7b54f3b64dc6efaaa1d1`, `0x2a846a693e8b18930bb42fe65766754343cd790a14e9867e6ecfdc69e96d7516`, and `0x96a9e32dc10754db76de8deb5fb7bf412fa660e11fe394087d72fde86496642b`) failed before contract state change because CLI argument coercion could not pass JSON text as strings. The final `e1:r2` submission used the same existing unlocked account through the repository SDK, preserving the intended arguments. These failed transactions are not lifecycle revisions or assessments.

## Strict result and remaining work

The bounded positive/negative correction path is now live and conclusive. The comprehensive release matrix remains incomplete: unavailable-evidence, unauthorized-action, deadline, replay/cooldown, and independent evaluator-backed benchmark cases have not been re-run against this new contract. The held-out semantic corpus is structurally validated but has no configured actual evaluator, so accuracy and error rates remain unmeasured.

No Vercel production setting changed, no production address rotated, and PR #6 was not merged. A future matrix expansion needs separate explicit authorization and fresh fixtures/nonces.