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

The independent verifier waited for the finalized receipt, checked the RPC chain ID, read finalized contract bytes through Studio's address-only `gen_getContractCode` call, matched those bytes to the reviewed source, and read canonical `get_info` at `LATEST_FINAL`. This is direct deployed-byte and canonical-state evidence; it is not a separate source-attestation service. No lifecycle transaction was broadcast after deployment.

`lib/network.ts` is unchanged from PR head. The deploy script is pinned to the consolidated candidate hash and refuses changed source. The deployment script was run once after the final preflight and produced the verified test deployment recorded below. GitHub Actions [run 38950006010](https://github.com/Bibidee/entrew/actions/runs/38950006010) passed on commit `2454b258154c31c63ced0848d7bab9580d7efe0c`, including the release-prep, Python, Direct Mode, desktop Playwright, build and audit stages.

## Local verification

- `npm run check`: passed typecheck, lint, contract surface 5/5, release-prep 7/7, policy 17/17, mutation 4/4, Direct Mode 28/28, and production build. Direct Mode includes the raw-fallback, exact-tree, malformed-identity and line-wrap regressions.
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

Draft scenarios are prepared locally for positive, negative, corrected revision (`r1` and `r2`), unavailable evidence and unauthorized action in `Bibidee/entrew-fixtures` (public repository, default branch `main`). No fixture files have been written to GitHub.

| Required field | Ready |
|---|---:|
| Exact repository and fresh unique nonce | 6/6 marker revisions |
| Full immutable commit SHA | 0/6 |
| Program ID | 0/6 |
| Applicant wallet | 0/6 |
| Marker bound to repo, nonce, program and wallet | 0/6 |
| Distinct full commits for corrected `r1`/`r2` | Not verifiable |
| Separate unauthorized wallet and target entry | Not ready |
| Fixture write authorization for this run | Not provided |

These are drafts, not executable or publish-ready fixtures. Fill the immutable commit SHA only after an authorized write; independently verify the resulting full SHA and marker content before submitting any transaction.

## Deployment, live verifier and isolated frontend

The read-only live verifier first proves its fixed RPC reports chain `61999`, then attests finalized deployed source bytes against the consolidated candidate SHA-256, checks finalized execution, reads canonical finalized state, and asserts repository/commit/wallet/program/nonce/marker/every-file/outcome/criteria/roster bindings. It requires positive, negative, corrected-r1, corrected-r2, unavailable-evidence and unauthorized-action assertions; an empty matrix cannot pass. It has now run against the new deployment for chain, source-byte, finality, execution and canonical-state verification. The required lifecycle matrix is still empty, so it correctly does not claim lifecycle evidence.

The frontend smoke harness uses process-only local environment values, refuses the historical production contract address, and checks that each public read targets only the supplied test address with `latest-final`. It has syntax validation only because no new test contract address or live records exist. No `.env`, Vercel production setting, alias or existing production contract was changed.

Historical Vercel metadata identifies the production deployment as a dirty CLI source tree, not an immutable clean commit. The candidate adds `.vercelignore` to exclude generated/test artifacts and must be deployed from a clean checkout when that later action is authorized.

### Wallet and external approvals required

- Six distinct wallet roles are planned: deployer, organizer, positive/corrected applicant, negative applicant, unavailable-evidence applicant and unauthorized control. The corrected `r1`/`r2` writes use the same positive applicant wallet.
- The deployer authorization was used once for the deployment above. The organizer must still sign program publication.
- Each applicant must sign their entry/revision submission and every assessment write. The corrected revision requires a fresh revision submission and assessment signature.
- The unauthorized control must sign (or explicitly reject) the forbidden cross-applicant mutation attempt; a reverted attempt is still a real signed transaction if broadcast.
- Real browser wallet connection, network switching and signing prompts require user interaction in the wallet.
- Fixture repository writes require separate explicit GitHub write authorization.
- Vercel production environment changes/redeploy and PR merge each require separate explicit authorization.

Once those approvals and identities are supplied, finality polling, canonical reads, source hash checks, case assertions, roster checks, retry boundaries and local isolated Playwright testing are automatable. Wallet prompts and user authorization are not.

## Exact remaining blockers

1. The reviewed source is deployed and verified at `0x882D765Bc9c1a6A83091858620bC60212135d25b` with transaction `0xe77805efcf2f4dd30f0d4fb787174628411c691789fdb78354125dbb1990b842`; CI run 38950006010 passed on commit `2454b258154c31c63ced0848d7bab9580d7efe0c`.
2. No independently adjudicated and actually evaluated held-out semantic results; all benchmark error rates and accuracy remain unknown (0/40 evaluated).
3. Fixture wallet addresses, temporary program ID, six immutable commits and fixture-write authorization are missing.
4. No positive, negative, corrected-revision, unavailable-evidence or unauthorized-action lifecycle evidence exists for this new contract.
5. No live test-contract frontend smoke or real-wallet browser QA exists.
6. No production address/configuration was changed; production Vercel QA against the new contract remains pending explicit authorization.

One authorized deployment transaction occurred and was independently verified above. No lifecycle transaction, fixture write, production configuration change or merge occurred. Preserve the historical production contract and evidence as-is.
