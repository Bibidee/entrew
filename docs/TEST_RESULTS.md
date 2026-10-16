# Validation evidence

This file records checks that actually ran and separates them from authored but unexecuted coverage. The requirement matrix is at `entrew/docs/TEST_MATRIX.md`.

## Release snapshot

- Verified code commit: `090968f8d6c346f1fa787d9f2685e8bce83f1356`.
- SHA-256 of `contracts/entrew_registry.py`: `FA351D5423A96FFA3D3EC145E3A7B45A20F9D140BFA7D70F0AAE48B897A5C0AC`.
- Production alias: [https://the-entrew.vercel.app](https://the-entrew.vercel.app).
- Vercel deployment: [READY · EndQrms6feF8MUdbE9ipUYha76ea](https://vercel.com/bibidees-projects/the-entrew/EndQrms6feF8MUdbE9ipUYha76ea), built from commit `090968f`.
- GitHub Actions: [CI run 38886003320](https://github.com/Bibidee/entrew/actions/runs/38886003320), `checks` passed on commit `090968f`.

The source hash is a local integrity record. No on-chain source attestation or contract address exists yet.

## Checks that passed

| Check | Result |
|---|---|
| Full local release check | `npm run check` exited 0: TypeScript, lint, Node contract-surface tests, Python policy tests, mutation smoke, Direct Mode, and static build all passed. |
| Node contract-surface suite | 5/5 passed. It checks the write surface, independent validator reconstruction, bounded GitHub inputs, pagination, and finality/readback gates in the frontend. |
| Python policy and benchmark-fixture policy | 12/12 passed, including closed criterion vectors, parser rejection cases, outcome precedence, bounded paths, and digest binding. The 40 fixtures test policy plumbing; they are not a held-out semantic benchmark. |
| Mutation smoke | 4/4 tested mutants were killed. Coverage is limited to negative precedence, an outcome-override mutant, unbound evidence, and order-dependent digest behavior. |
| Direct Mode | 6/6 passed locally and in GitHub Actions on the pinned `genlayer-test==0.29.2` harness and GenVM `v0.3.0-rc7` runtime. The downloaded runner archive is SHA-256 checked before use. This does not prove live validator agreement. |
| Repository-local GenLayer CLI | `npx genlayer --version` and `npm run cli:local-version` both report exactly `0.39.1`. |
| Network check | Passed: active source scan found no reference to prohibited chain `61997`; RPC `eth_chainId` returned `0xf22f` (`61999`) from `https://studio.genlayer.com/api`. |
| GitHub Actions | Run `38886003320` passed the full Linux workflow, including install, CLI checks, network check, tests, Direct Mode, desktop Chromium, build, and `npm run audit`. |
| Dependency audit | `npm audit` found 0 vulnerabilities after adding the missing pinned `esbuild` dependency. |
| Production build | Vercel deployment `EndQrms6feF8MUdbE9ipUYha76ea` reached `READY`; Next.js generated all eight static application routes. |
| Browser QA | Production Playwright run passed 10/10 on desktop Chromium and Pixel 7 mobile Chromium. It covered the seven static routes, unconfigured no-fabricated-data state, viewport widths 320/375/390/768/1280/1440, axe on the explorer, and mocked MetaMask/Rabby network selection. |
| Production reload and console check | Brave direct navigation and reload passed for `/`, `/program?ref=p999`, `/publish`, `/apply?program=p999`, `/evidence?entry=e999`, `/workspace`, and `/activity`. The browser console showed no errors. |

## Not run or still pending

- No Studionet contract deployment, address, deployment transaction, finality result, or source attestation is recorded.
- No live positive or negative validator lifecycle, finalized roster readback, corrected-revision lifecycle, or public GitHub fixture-marker write exists.
- Wallet tests use injected mocks. No real wallet signed a transaction, and SDK finality behavior has not been confirmed against a live transaction.
- The 40-case fixture set was not held out before prompt tuning, and no semantic accuracy, false-qualification, false-nonqualification, or validator-disagreement rate is claimed.
- The complete A–E matrix is not covered. In particular, the remaining adversarial prompt, cooldown/replay/deadline edges, broader authorization/idempotence, keyboard-only, race/recovery, and full mutation/property requirements remain pending or only partially tested.

The frontend deliberately remains safe and unconfigured while `NEXT_PUBLIC_ENTREW_CONTRACT_ADDRESS` is empty. No program counts, entries, or qualification outcomes are fabricated.
