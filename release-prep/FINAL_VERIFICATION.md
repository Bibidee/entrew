# ENTREW final release preparation report

**Verdict: NOT SUBMISSION READY.** The exact reviewed source is deployed and independently verified on Studionet 61999. Live lifecycle, fixture, semantic benchmark, frontend production QA and merge gates remain open.

## Review scope and findings

Reviewed the exact PR #6 baseline diff from `main` (`d81ad944a6a89e5713b7f1ca6c224b80e8e56769`) to requested head `f33b7d991e1b8c8c05c06e73e6de27c46a0eab5f`, plus the consolidated release-candidate changes below and the full contract provenance and lifecycle paths. This record names the immutable starting PR head separately from the current candidate bytes.

Eight confirmed defects were corrected in the reviewed release candidate:

1. GitHub Contents API marker/evidence responses were not bound to the requested `path`, decoded bytes or an exact commit tree. The contract now validates file type, exact path, base64, Git blob SHA, the supplied commit's root tree, and every bounded path component. A valid blob from a different revision now fails closed instead of becoming revision-bound evidence.
2. The strict Contents decoder rejected GitHub's valid line-wrapped base64 responses. It now accepts only LF or CRLF line wrapping, preserves strict base64 validation for every other character, and still checks the exact Git blob SHA. A Direct Mode regression covers a fully wrapped marker and both wrapped evidence files.
3. The frontend used `stateStatus: "finalized"`, which the pinned `genlayer-js@1.1.8` ignores. It now requests `TransactionHashVariant.LATEST_FINAL`, with the existing contract-surface test updated to guard that behavior. The live verifier uses the same snapshot setting and the documented finalized code RPC.
4. Malformed HTTP-200 repository or commit identity bodies could be coerced into a conclusive mismatch. The contract now requires schema-valid canonical repository identity, full commit SHA, and root tree SHA before a mismatch can be conclusive; malformed provider data is `INCONCLUSIVE` / `PROVIDER_RESPONSE_INVALID`.
5. A deeply segmented evidence path could multiply Git tree requests. Evidence traversal is now capped at eight path segments.
6. The read-only release verifier could trust a wrong-chain RPC or pass with an empty lifecycle list. It now checks `eth_chainId`, requires the complete named matrix and unauthorized control, and rejects incomplete evidence before any live RPC request.
7. Transaction hashes were not previously bound to the candidate contract, wallet, decoded method, arguments or full source bytes. The release verifier now decodes finalized Studio calldata and checks those bindings, including deployment bytes and timestamp ordering for unauthorized control.
8. The benchmark scorer hashed captured responses but allowed row outcomes and validator votes to disagree with the captured content. It now requires a bounded JSON response whose case ID, outcome and validator votes exactly match the row; provider identity remains an external attestation boundary.

The post-fix review found no further confirmed defect in the contract's repository identity, full commit SHA, marker binding, bounded evidence, outcome aggregation or applicant-only write paths. The deployed-source and live transaction behavior still needs network verification.

## Source and network identity

| Item | Value |
|---|---|
| PR head source SHA-256 at `f33b7d9` | `1429e3134d49ff20b00f233c98f3783a8580dc5b7cc280de8f7e70da13e010e8` |
| PR head contract Git blob | `f6f7c7e9c72814cb82497f3b7a3c6639de7503d3` |
| Consolidated candidate contract SHA-256 | `cac38f9d2a607446b071aecfe7e00ed0be96c2b31dd4ea9f9633477295e1b45e` |
| Consolidated candidate contract Git blob | `8348ba2282fc062e9fe32e488245d536bd138334` |
| Studionet configuration | `61999`, `https://studio.genlayer.com/api` |
| Live RPC response | `0xf22f` (`61999`) |
| Repository-local GenLayer CLI | `0.39.1` |

## Verified remediation deployment — 2026-10-16

| Item | Value |
|---|---|
| Studionet chain | `61999` (`https://studio.genlayer.com/api`) |
| Contract address | `0x882D765Bc9c1a6A83091858620bC60212135d25b` |
| Deployment transaction | [`0xe77805efcf2f4dd30f0d4fb787174628411c691789fdb78354125dbb1990b842`](https://explorer-studio.genlayer.com/tx/0xe77805efcf2f4dd30f0d4fb787174628411c691789fdb78354125dbb1990b842) |
| Deployer | `0x527dA5f7022f14f7105e5f06cec1a8eff53556b5` |
| Transaction status | `FINALIZED` |
| Execution | `SUCCESS`; result `MAJORITY_AGREE` |
| Consensus | votes `AGREE, AGREE, AGREE, IDLE, IDLE`; committed `5`, revealed `5` |
| Deployed source bytes | `57769` bytes; SHA-256 `cac38f9d2a607446b071aecfe7e00ed0be96c2b31dd4ea9f9633477295e1b45e` |
| Reviewed source | SHA-256 `cac38f9d2a607446b071aecfe7e00ed0be96c2b31dd4ea9f9633477295e1b45e`; Git blob `8348ba2282fc062e9fe32e488245d536bd138334` |
| Canonical `get_info` | `chain_id=61999, contract=EntrewRegistry, name=ENTREW, page_limit=25, schema_version=1` |

The independent verifier waited for the finalized receipt, checked the RPC chain ID, read finalized contract bytes through Studio's address-only `gen_getContractCode` call, matched those bytes to the reviewed source, and read canonical `get_info` at `LATEST_FINAL`. This is direct deployed-byte and canonical-state evidence; it is not a separate source-attestation service. The subsequent lifecycle transactions were broadcast only from the separately authorized unlocked test wallets and are recorded in the live evidence capture.

`lib/network.ts` is unchanged from PR head. The deploy script is pinned to the consolidated candidate hash and refuses changed source. The deployment script was run once after the final preflight and produced the verified test deployment recorded below. Final GitHub Actions run [38972800049](https://github.com/Bibidee/entrew/actions/runs/38972800049) passed all checks on commit `69a1d1a5e63a1c7c49e5f3c1a9a62716ee76efd0`.

## Local verification

- `npm run check`: passed typecheck, lint, contract surface 5/5, release-prep 8/8 (including the corrected-roster regression), policy 17/17, mutation 4/4, Direct Mode 28/28, and production build. Direct Mode includes the raw-fallback, exact-tree, malformed-identity and line-wrap regressions.
- Browser verification against the exported production build passed 10/10 Playwright checks across desktop and mobile Chromium, six viewport widths, routes, axe checks and wallet-modal simulation. The default dev-server run was tooling-limited at 8/10 by two mobile connection refusals; the stable exported-build run is the recorded result.
- `npm run audit`: 0 production dependency vulnerabilities.
- `npm run network:check`: passed contamination scan and live RPC chain check.
- `npm run cli:local-version`: `0.39.1`.
- Held-out corpus structural validator: passed 40 unique inputs across four balanced groups.
- Fixture draft validator: 6/6 marker revisions have the exact target repository and a unique fresh nonce.

The Playwright suite uses the local unconfigured app and simulated wallet providers. It is not production browser QA, real wallet interaction or a test against the new contract.

## Held-out semantic benchmark

The new corpus is independent of the post-prompt fixture file: both case-ID overlap and exact rubric/path/mapping overlap are zero. Its frozen input digest is `8f1c41269bffb3e9bc7774711d966c785b67f03a8fbb1c41f0fda1ba85bad7ac`; the comparison corpus LF-normalized digest is `728f283d0d6c99e28fc71074c3c7973cc64c7fab376c1870a6c32bdb42fc604a`.

**Actual semantic evaluation: 0/40.** No actual evaluator endpoint is configured, and GenLayer evaluation requires the prohibited deployment and assessment transactions. The gold labels have not been independently blind-adjudicated.

| Measure | Result |
|---|---|
| False qualification | Not measured |
| False rejection | Not measured |
| Inconclusive rate | Not measured |
| Accuracy | Not measured |
| Validator disagreement | Not available; no live validator votes captured |

The scorer rejects partial inputs, mismatched corpus digests, response-byte digest mismatches, malformed response JSON, and response/row case, outcome or validator-vote mismatches. For GenLayer it also requires Studionet, the reviewed source hash, finalized transaction hashes and canonical-readback records. It cannot authenticate an arbitrary external evaluator from local capture JSON or convert corpus validation into semantic evidence.

## Fixture readiness

Authorized live fixtures are published on the separate branch [`entrew-live-2026-10-16`](https://github.com/Bibidee/entrew-fixtures/tree/entrew-live-2026-10-16) in `Bibidee/entrew-fixtures`; `main` and the two historical fixture commits were preserved. Each lifecycle revision was independently fetched from GitHub by its full commit SHA before submission.

| Required field | Ready |
|---|---:|
| Exact repository and fresh unique nonce | 6/6 marker revisions |
| Full immutable commit SHA | 6/6 |
| Program ID (`p1`) | 6/6 |
| Applicant wallet | 6/6 |
| Marker bound to repo, nonce, program and wallet | 6/6 |
| Distinct full commits for corrected `r1`/`r2` | Verified |
| Separate unauthorized wallet and target entry | Verified (`live-dave` → `e2`) |
| Fixture write authorization for this run | Authorized and branch-published |

The exact marker and source fingerprints are recorded in [`live-evidence.2026-10-16.json`](./live-evidence.2026-10-16.json). The unavailable fixture intentionally omits `tests/test_payment_replay.py`; GitHub returned the expected 404 at its pinned commit.

## Deployment, live verifier and isolated frontend

The read-only live verifier first proves its fixed RPC reports chain `61999`, then attests finalized deployed source bytes against the consolidated candidate SHA-256, checks finalized execution, reads canonical finalized state, and asserts repository/commit/wallet/program/nonce/marker/every-file/outcome/criteria/roster bindings. It was run against the existing deployment with the complete live transaction matrix. Submission, assessment, revision, replay and unauthorized-control transactions all reached finality; canonical reads show entries `e1`, `e2`, and `e3` in `INCONCLUSIVE` state and a qualified roster count of zero.

Every evaluator attempt (`a1`–`a6`) returned `PROVIDER_UNAVAILABLE / REPOSITORY_UNAVAILABLE` with both criteria `UNVERIFIABLE` and no marker or file fingerprints. The strict verifier therefore failed closed at `positive marker hash mismatch`; it did not convert unavailable external evidence into `QUALIFIED` or `NOT_ESTABLISHED`. The 600-second retry for the current corrected-r2 revision was completed as `a6` and reproduced the same provider failure.

The complete transaction and canonical-read capture is [`live-evidence.2026-10-16.json`](./live-evidence.2026-10-16.json). The filled strict run input is [`live-run.2026-10-16.json`](./live-run.2026-10-16.json), and the final diagnostic is [`strict-verifier.2026-10-16.log`](./strict-verifier.2026-10-16.log). No Vercel setting, production contract address or merge was changed.

| Live action | Finalized transaction |
|---|---|
| Program publish (`p1`) | `0x605522877ff620d0e978f0d891c0f191c05a94b5f36b84dd5445a6fa06211f06` |
| Positive submit / assess (`e1:r1`) | `0x6d56f61b0bb786021c338d3042062481e92e7942b31804a0111b18f3d004c6ee` / `0xbeb9c165d138ca5e796871693be9cca1ce8922e51862d047a6b07fc61dc08366` |
| Negative submit / assess (`e2:r1`) | `0xd2943045031e917dbb42ae3db9db22184f580d018caf01ab94b7c701049f55d0` / `0x343af64bcdcfa358406726e5513d82ffd365dec3e486af0fe768c35b5a52600f` |
| Corrected r1 submit / assess (`e1:r2`) | `0xcf96e471ad798873fd0a53387c23fad9b0989ab825ba11c9c519b26d9f9aee51` / `0x9b780da09a9fa37ed6e270eb51650ac00d7e1973421215e08df6863321f1c961` |
| Corrected r2 submit / assess / cooldown retry (`e1:r3`) | `0xf42c585e2f885ecfb223070bbc70210ba153734dfbc63647dda2cfa83cb144e7` / `0xcd1854096bf1406f3666703710f3e3e425ba01d2bee28c4a0c944bf37819966f` / `0x159a8f8c671a56ef0ba1967b8cfd5a94e2e04661d0a20be3581cd6d9d7f41ed8` |
| Unavailable submit / assess (`e3:r1`) | `0xa2e81f8128e65b38aa9915bba1b3b0f5f217694477aa52f1983defb4458428d6` / `0xe6c7606d76a9052238cd5aadc36a091cb9a95c8af5b21eb0bc1a807fa9111638` |
| Replay control / unauthorized control | `0x14df1250544ae8d3ed74426241105070a4533bdc9ad1a7aec8b0637783203ac6` / `0x96bbdb5fc9c06f9771cd16bbb0396f51b03a63fdcebbae049045c84c8434c428` |

The frontend smoke harness uses process-only local environment values, refuses the historical production contract address, and checks that each public read targets only the supplied test address with `latest-final`. It was not run against the live contract because the evaluator provider left every record inconclusive; no `.env`, Vercel production setting, alias or existing production contract was changed.

Historical Vercel metadata identifies the production deployment as a dirty CLI source tree, not an immutable clean commit. The candidate adds `.vercelignore` to exclude generated/test artifacts and must be deployed from a clean checkout when that later action is authorized.

### Wallet and external approvals required

- Completed wallet interactions are recorded for the deployer, organizer, `live-alice` (positive/corrected), `live-bob` (negative), `live-carol` (unavailable evidence), and `live-dave` (unauthorized control). The corrected `r1`/`r2` writes used the same applicant wallet and distinct commits/nonces.
- The organizer publication, all three entry submissions, both corrected revisions, all five first assessments, the cooldown-authorized `a6` retry, the replay control and the unauthorized control were signed with unlocked test accounts and reached finalized receipts. Their hashes and canonical states are in the live evidence record.
- No further wallet interaction is needed for read-only source attestation, finality polling, canonical reads, strict verification, local tests or isolated frontend tests. A future retry after the frozen retry budget would require the applicant wallet again and must not be automated without a new authorization.
- Real browser wallet connection, network switching and signing prompts still require user interaction in the wallet if production or a new isolated frontend session is exercised.
- Fixture repository writes were explicitly authorized for this run and are confined to the dedicated branch. Vercel production environment changes/redeploy and PR merge remain separately gated and were not performed.

Finality polling, canonical reads, source hash checks, case assertions, roster checks, retry boundaries and local isolated Playwright testing are automatable. Wallet prompts, fixture writes outside the dedicated branch, Vercel changes and merge authorization are not.

## Exact remaining blockers

1. **External evidence provider unavailable:** all six evaluator attempts returned `REPOSITORY_UNAVAILABLE`, leaving every lifecycle `INCONCLUSIVE`, the qualified roster empty and the strict verifier failed closed. This is the direct blocker to positive/negative/corrected semantic evidence.
2. **Held-out semantic benchmark:** 0/40 cases were evaluated by an independent live evaluator. False qualification, false rejection, inconclusive rate and accuracy remain unmeasured; validator disagreement is unavailable.
3. **Frontend live binding:** Playwright passed against the local unconfigured app, but no isolated frontend session was bound to this test contract and no production browser QA was authorized.
4. **Production release actions:** Vercel environment changes, production redeploy, PR merge and any new transaction after this run remain explicitly unauthorized.

The existing production contract and historical evidence remain unchanged. The reviewed test contract, fixture branch, all finalized live hashes, canonical reads, retry outcome and strict-verifier failure are preserved for provider recovery and a separately authorized continuation.
