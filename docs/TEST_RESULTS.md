# Validation evidence

This file records checks that actually ran and separates them from authored but unexecuted suites. The original handoff matrix remains at `entrew/docs/TEST_MATRIX.md`.

## Checks that passed

| Check | Result |
|---|---|
| Node contract-surface suite | 5/5 passed with `npm test`. |
| Python pure-policy and benchmark policy suites | 12/12 passed using the bundled Python runtime. |
| Mutation smoke | 4/4 pure-policy mutants were killed. Coverage is limited to precedence, unbound evidence, and order-dependent digest behavior; it does not cover VM execution, authorization, or finality. |
| TypeScript check | `npm run typecheck` passed. The available `tsc` executable resolved outside the project because dependencies were not installed. |
| Lint | `npm run lint` passed using the available global ESLint executable; it does not establish the pinned dependency environment. |
| Static source/network contamination scan | Passed: no active-source reference to the prohibited preview/alternate chain ID 61997. The RPC `eth_chainId` probe failed with `fetch failed`, so live chain identity is unverified. |
| Syntax checks | Python AST parsing passed for the contract and four test modules; benchmark JSON parsed; all authored `.mjs` scripts passed `node --check`. |

## Partial or blocked checks

| Check | Result |
|---|---|
| Dependency installation | Not completed. No lockfile exists. Offline lockfile generation failed with `ENOTCACHED` for `@axe-core/playwright`; the configured npm registry lookup failed with `ENOTFOUND`. `npm ci` therefore fails because it requires a lockfile. |
| CLI version | `0.39.1` was reported by a global PATH shim; `npm ls genlayer --depth=0` found no local package. The repo-local CLI guard correctly fails because `.bin/genlayer` is absent. |
| Production build | Default Turbopack build failed in the Turbopack process/CSS stage. `next build --webpack` compiled and passed TypeScript, but static generation failed at `/apply` with Windows `EPERM` creating `.next/server/app/apply.segments/apply`. The available Next executable was global/unpinned (16.2.10), not the declared 16.4.2. No successful static export is claimed. |
| Browser smoke | Brave extension was selected, but it timed out loading the local preview at `http://127.0.0.1:3100`. The shell also could not access the local socket due to environment permissions. This was not production browser QA. |
| Direct Mode | Authored in `tests/python/test_direct_contract.py`, but not run: `pytest` and the required `genlayer-test==0.29.2` environment are unavailable. |
| Playwright and accessibility | Authored in `tests/e2e/public.spec.ts`, but not run because Playwright dependencies are unavailable. No responsive, reload, keyboard, or axe results are claimed. |
| Dependency audit | `npm audit` failed with `ENOLOCK`; no lockfile/dependency graph is available. |

## Not run

No semantic evaluator or blinded benchmark was run. The 40 fixtures in `tests/benchmark/cases.json` were authored after the evaluator prompt and are not held out; their presence is not accuracy evidence. No GenVM/validator agreement, adversarial disagreement, latency, or cost results are claimed.

No live Studionet deployment, contract address, transaction hash, source attestation, positive/negative live lifecycle, GitHub fixture marker, production frontend URL, controlled-wallet finality check, or release CI evidence exists. The deployment workflow remains unverified.
