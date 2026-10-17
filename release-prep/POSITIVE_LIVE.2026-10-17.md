# Corrected contract: authorized positive live lifecycle

This record covers the separately deployed corrected contract only. It does not modify or supersede historical contracts, historical lifecycle evidence, the production Vercel address, or the existing production alias.

## Exact source and deployment

- Chain: Studionet `61999` (`0xf22f`).
- Corrected contract: [`0xB1DA4Ab4FfAa5Fc543A628f190B2A52EaC54b592`](https://explorer-studio.genlayer.com/tx/0x98d9934312b5a36e4c9ced139aef642f0d098d195b254c3dccf2c0743f7207a7).
- Deployment transaction: [`0x98d9934312b5a36e4c9ced139aef642f0d098d195b254c3dccf2c0743f7207a7`](https://explorer-studio.genlayer.com/tx/0x98d9934312b5a36e4c9ced139aef642f0d098d195b254c3dccf2c0743f7207a7): `FINALIZED`, leader execution `SUCCESS`, consensus `MAJORITY_AGREE` (three agree, two idle).
- Reviewed source SHA-256: `b81379bfa8b1b438381647c91c611999e55440d1edab6c0176d9e52fc2c4a5d8`; Git blob `ec4b5bd4aa453b73987d732986191670b580ab98`.
- Finalized `gen_getContractCode` bytes and local reviewed bytes have the same SHA-256. Canonical `get_info` reports `EntrewRegistry`, `ENTREW`, schema `1`, page limit `25`, and chain `61999`.

## Single authorized positive path

- Program `p1` publication: [`0x115eaa1d986b15ea4494a51eabd389142d0d4f44e97c6d909daaf8158b0bfaa2`](https://explorer-studio.genlayer.com/tx/0x115eaa1d986b15ea4494a51eabd389142d0d4f44e97c6d909daaf8158b0bfaa2), finalized successfully with `MAJORITY_AGREE`.
- Positive fixture commit: [`a258bc4bd961a1b2978bd63a4d1ab13b6b436fcd`](https://github.com/Bibidee/entrew-fixtures/commit/a258bc4bd961a1b2978bd63a4d1ab13b6b436fcd) on `entrew-urlfix-fixtures-2026-10-16`. It binds applicant `0x7eb2a4b4e913df62eae807ef60509b3b7284c7fa`, program `p1`, and nonce `31b32d7c9a0c8ec4652487a7af62dd2a` in `.entrew/claim.json`.
- Submission: [`0xf9d732ee1bbe580f70095dfaf39238b6d4421728cde6063903f903b7f1c883a9`](https://explorer-studio.genlayer.com/tx/0xf9d732ee1bbe580f70095dfaf39238b6d4421728cde6063903f903b7f1c883a9), finalized successfully with `MAJORITY_AGREE`; returned entry `e1`, revision `e1:r1`.
- Assessment: [`0x1c27335c80d64892266c621219cb12d48fec086a4061b66d20bb26c8c06cd60f`](https://explorer-studio.genlayer.com/tx/0x1c27335c80d64892266c621219cb12d48fec086a4061b66d20bb26c8c06cd60f), finalized successfully with `MAJORITY_AGREE` (three agree, two idle); returned attempt `a1`.
- Canonical state: `QUALIFIED`; both criteria are `MET`; provenance is `REVISION_BOUND`; issue code is `NONE`; the qualified roster contains `e1` exactly once.

## Provenance artifacts

| Artifact | Git blob | SHA-256 |
| --- | --- | --- |
| `.entrew/claim.json` | `b024cd8afd9639667b01ebc4da9975c583d3e0b8` | `dfdd4be5b84d273cf1ff72973f4974cbfe6f1968079153a307bdfff584e6a5ed` |
| `replacement-fixtures/positive/src/charges.py` | `9ac12fe45ab9795327a4e001ef27466d8a865df9` | `a160ead85293bc3a625002621ae83fca82f9db2cd55cc05b2d0ff033e149080e` |
| `replacement-fixtures/positive/docs/idempotency.md` | `99b079139d5b998cc805764f65b08db7624de3cf` | `47900c281e89c8607c17c85ad915ce2af740be593de22573f7de33b7b7161f69` |

`positive-live-verify.mjs` is read-only. It retains the checksummed contract spelling for Studio's address-sensitive code RPC, while normalizing addresses for comparisons. It verifies exact reviewed/deployed bytes, finalized transaction bindings, GitHub repository/commit/file identity, canonical entry/revision/review data, criterion vector, and roster membership. It does not use a wallet or broadcast a transaction.

## Executed verification

- `node --check release-prep/positive-live-verify.mjs` passed.
- `node release-prep/positive-live-verify.mjs release-prep/positive-live.2026-10-17.json` passed against the current Studionet RPC and GitHub API. Its verified result is chain `61999`, source hash `b81379bfa8b1b438381647c91c611999e55440d1edab6c0176d9e52fc2c4a5d8`, outcome `QUALIFIED`, criterion vector `[MET, MET]`, provenance `REVISION_BOUND`, and qualified entry `e1`.
- The parent commit `7fe14f63c63c6299b98a4a72c269c5a522c8c78c` had an already green full CI run: [38976275166](https://github.com/Bibidee/entrew/actions/runs/38976275166). The documentation-only update has its own CI run; its final result is recorded with the PR rather than inferred from the earlier commit.

## Scope and remaining work

Only the positive lifecycle was authorized and executed. No negative, corrected-revision, unavailable-evidence, unauthorized-action, wallet UI, Vercel production change, or PR merge was performed. The unsuccessful CLI program-publication attempt `0xdf712ac6c124e58424b7ca501383f977b2a5d388ae75b340ac139efa07f7ab6f` is retained as a finalized execution error; it created no program. The successful publication above is the canonical source of `p1`.
