# Validation evidence

This file records observed checks separately from authored but unexecuted coverage. The requirement matrix is at `entrew/docs/TEST_MATRIX.md`.

## Historical production release snapshot — 2026-10-16 (before this remediation branch)

- Current product main commit after the accessibility patch: `24d805dc3f6c61d07641161fa04fec70e4a55d8a`.
- Contract source commit: `21f1eee1f6b23a6fa902d7e2b6449d1f6e1363f5`; later UI changes did not change the contract.
- Contract source SHA-256: `9bf815285cd31ed4fb14769dca8e2fa1755c36b91c5a0cf325660ba777891fcc`.
- Studionet contract: `0xf37C3D7992833A876Bb2933c09b11bD49FC817ca`; deployment tx `0x743047241ae5eed661a0d887b8885b18402b42fa3b5bb6f91b02b51c2f656127`.
- Production alias: [https://the-entrew.vercel.app](https://the-entrew.vercel.app).
- Latest deployment: [READY · dpl_8Y5SPk1HZ5KHPreZzSXLUDGVrS4A](https://vercel.com/bibidees-projects/the-entrew/8Y5SPk1HZ5KHPreZzSXLUDGVrS4A).
- Production contract env is `0xf37C3D7992833A876Bb2933c09b11bD49FC817ca`; chain `61999`; RPC `https://studio.genlayer.com/api`.
- Full PR CI: [run 38894822355](https://github.com/Bibidee/entrew/actions/runs/38894822355).

These commit, hash, CI, deployment, and lifecycle records describe the prior production source. They do not apply to the contract modifications on this branch.

## Remediation branch snapshot — 2026-10-16

- Branch: `audit/full-remediation`; base `origin/main` commit `d81ad944a6a89e5713b7f1ca6c224b80e8e56769`.
- Remediation contract source commit: `d64552d38cbd244b647060f1c045550e2a484237`.
- Contract source Git-stored LF blob SHA-256: `c8836a1cef11f6e969f0913d5eae9026a77d705bae8168584b6221ffbe2fb898`. It differs from the historical deployed source hash above.
- Production contract, Vercel environment, and production alias were not changed during this remediation.
- New checks on this source are local policy tests and GenLayer Direct Mode. They cannot substitute for redeploying and testing live Studionet behavior.

### Checks completed on this branch

| Check | Result |
|---|---|
| `npm ci` | Passed; 525 packages installed, 0 vulnerabilities reported during install. |
| `py -3.13 -m pip install -r requirements-test.txt` | Passed; pinned `genlayer-test==0.29.2` and `pytest==8.4.2` already satisfied. Python 3.11 is too old for the pinned GenLayer test package. |
| `npm run cli:local-version` | Passed; repository-local CLI `0.39.1`. |
| `npm run network:check` | Passed; active-source scan found no `61997` or preview-network reference; RPC returned `61999` (`0xf22f`). |
| `npm run check` | Passed: TypeScript, ESLint, Node 5/5, Python policy 15/15, mutation probes 4/4, Direct Mode 16/16, and static production build. |
| `npm run test:e2e` | Passed 10/10 across desktop and mobile Playwright projects. All seven routes passed viewport checks at 320, 375, 390, 768, 1280, and 1440 px; route-level axe checks passed; wallet modal keyboard test passed. |
| `npm audit` | Passed; 0 vulnerabilities. |
| GitHub Actions for PR #6 | Run [38915365843](https://github.com/Bibidee/entrew/actions/runs/38915365843) passed all workflow steps on branch commit `44ce1ef71fc699f058f3bf2fa3b6d5671edd2409`, including dependency install, CLI/network checks, all test suites, desktop Playwright, build, and audit. |

The browser suite uses the local unconfigured test app and test wallets. It does not verify production rendering or real-wallet signing for the remediation source. Direct Mode is local simulator evidence, not live Studionet evidence.

The on-chain `getContractCode` response hashes to the same SHA-256 as the tracked contract source. This proves byte equality for the returned code, not a separate source-attestation service.

## Checks that passed

| Check | Result |
|---|---|
| CI release workflow | Run 38894822355 passed CLI/network checks, typecheck/lint, Node and Python suites, Direct Mode, Playwright, production build and `npm audit`. |
| Python policy / fixture policy | 13 tests passed in the current workflow. Fixture-shape tests do not measure semantic accuracy. |
| Direct Mode | 7 tests passed in the current workflow on the pinned GenLayer test harness. This is local simulator evidence, not a replacement for live validators. |
| Focused evidence route | `npm run test:e2e -- --project=chromium-desktop --grep "evidence query route"` passed 1 test, including the level-one heading and axe assertions. |
| Dependency audit | CI `npm audit` passed with 0 reported vulnerabilities. |
| Live deploy and source readback | Deployment reached `FINALIZED` with `MAJORITY_AGREE`; canonical `get_info` readback matched Studionet and expected schema. RPC code bytes matched the tracked source hash. |
| Positive lifecycle | Publish, submit and assessment finalized; canonical outcome `QUALIFIED`, both criteria `MET`, revision-bound evidence and roster inclusion were read back. |
| Negative lifecycle | Submit and assessment finalized; canonical outcome `NOT_ESTABLISHED`, one criterion `NOT_MET`, revision-bound evidence, and no qualified-roster inclusion were read back. |
| Production browser | Brave loaded the live evidence route. It displayed both canonical entries and outcomes; direct navigation/reload worked and the console had no errors. A focused production axe audit of the evidence detail reported zero violations after PR #4. |
| Responsive sweep | No-horizontal-overflow assertions passed at 320, 375, 390, 768, 1280 and 1440 CSS pixels in the headless production sweep. A later repeated route read intermittently failed with an RPC “Failed to fetch”, so the complete repeated route sweep is tooling-limited rather than a clean pass. |
| Network contamination | Active-source check found no reference to prohibited chain `61997`; RPC reported `61999` (`0xf22f`). |

Deployment and lifecycle hashes, result vectors and source commit details are in `docs/DEPLOYMENT.md`.

## Not run or still pending

- Corrected-revision-to-qualified lifecycle and live `INCONCLUSIVE` retry/cooldown boundary.
- Live unauthorized-wallet, replay, duplicate-click and wrong-network controls.
- Full responsive production route sweep without intermittent RPC failure; manual mobile review and keyboard-only review.
- Full real MetaMask and Rabby UI testing. The actual lifecycle used the authorized unlocked CLI wallet.
- Complete A–E requirement matrix, broad mutation/property tests, and adversarial prompt-injection/validator-divergence live cases.
- The 40-case fixture set was not held out before prompt tuning. No semantic accuracy, false-qualification, false-nonqualification or validator-disagreement rate is claimed.

The prior deployment and two live lifecycle proofs remain historical evidence for the previous source. The modified remediation contract has not been deployed or exercised live. This evidence does not establish suitability as a high-impact eligibility decision service; the broader security and semantic checks above remain pending.


## Additional raw-provenance adversarial pass — 2026-10-16

- Current contract source SHA-256: `1429e3134d49ff20b00f233c98f3783a8580dc5b7cc280de8f7e70da13e010e8` (UTF-8/LF bytes). Git blob ID: `f6f7c7e9c72814cb82497f3b7a3c6639de7503d3`.
- Confirmed flaw: raw fallback skipped repository and commit identity checks and treated raw URL bytes as revision-bound. A mismatched marker could become `NOT_ESTABLISHED`; raw marker/evidence could become `QUALIFIED` without proving the submitted full SHA is an immutable Git commit.
- Correction: removed raw-host retrieval and retry from the contract. Only the GitHub API path, after exact `full_name` and full commit-SHA equality checks, can supply decision-bearing marker/evidence. API outage or malformed evidence stays inconclusive.
- Executable Direct Mode regressions: malformed/mismatched raw marker cannot reject during repository API 403; positive raw marker/evidence cannot qualify during commit API 403; a verified but mismatched commit SHA cannot be overridden by raw bytes; malformed API file data cannot recover from unbound raw bytes. All 17 Direct Mode tests passed, including these regressions.
- Latest `npm run check`: passed TypeScript, ESLint, Node 5/5, Python policy 15/15, mutations 4/4, Direct Mode 17/17, and production build.
- Latest `npm run test:e2e`: passed 10/10 local Chromium desktop/mobile tests; route rendering, six viewport widths, automated axe checks, and wallet-modal behavior passed. This is local, unconfigured-app browser evidence only.
- Latest `npm run audit`: 0 vulnerabilities. `npm run cli:local-version`: `0.39.1`. `npm run network:check`: no alternate-network contamination; RPC returned chain `61999` (`0xf22f`) at `https://studio.genlayer.com/api`.
- No deployment, wallet transaction, Vercel environment change, production alias change, fixture marker write, or merge was performed. The production contract and historical transaction/source evidence remain unchanged.
- The semantic benchmark is **not complete**. Semantic scoring evaluated 0 cases: the existing 40-case suite is post-prompt and its LLM outputs are mocked, and no independent evaluator is configured. Actual target-validator scoring requires live nondeterministic execution and is blocked by the no-broadcast instruction. No semantic accuracy, false qualification/nonqualification, or validator-disagreement rate is claimed.
- Exact remaining blockers and the wallet-separated live matrix are recorded in `docs/DEPLOYMENT_TEST_PLAN.md`. CI on this new source is pending push.
