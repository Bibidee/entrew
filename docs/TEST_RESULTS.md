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
