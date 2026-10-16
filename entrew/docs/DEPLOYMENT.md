# ENTREW V1 — deployment evidence ledger

Last updated: 2026-10-16. This ledger records observed evidence; unresolved matrix items remain explicit.

## Source and provenance

- Product repository: [Bibidee/entrew](https://github.com/Bibidee/entrew).
- Contract source commit: `21f1eee1f6b23a6fa902d7e2b6449d1f6e1363f5`.
- Product main after frontend accessibility patch: `24d805dc3f6c61d07641161fa04fec70e4a55d8a`.
- Contract source: `contracts/entrew_registry.py`.
- SHA-256: `9bf815285cd31ed4fb14769dca8e2fa1755c36b91c5a0cf325660ba777891fcc`.
- Repo-local GenLayer CLI: `0.39.1`; GenLayerJS: `1.1.8`.
- Studionet chain: `61999`; RPC exercised: `https://studio.genlayer.com/api`.
- Active-source scan: no prohibited chain `61997` reference found.

## Checks performed

| Check | Result |
|---|---|
| npm ci / locked dependencies | Passed in CI. |
| CLI/network checks | Passed; local CLI `0.39.1`, RPC chain ID `61999`. |
| Typecheck, lint, Node/Python policy | Passed in CI. |
| Direct Mode | 7 passed in the final full CI run. |
| Playwright / production build | Full CI run passed; deployment is Ready. |
| npm audit | Passed with 0 reported vulnerabilities. |
| Focused evidence-route E2E and axe | 1 passed. |
| Production evidence-route axe | 0 violations in the final live deployment. |
| Responsive production sweep | Overflow assertions passed at 320/375/390/768/1280/1440 px; a later repeated route read hit intermittent RPC “Failed to fetch”, so full repeated route coverage is tooling-limited. |

Full CI: [GitHub Actions run 38894822355](https://github.com/Bibidee/entrew/actions/runs/38894822355).

## Contract deployment

- Chain: Studionet `61999`.
- Address: `0xf37C3D7992833A876Bb2933c09b11bD49FC817ca`.
- Deployment tx: `0x743047241ae5eed661a0d887b8885b18402b42fa3b5bb6f91b02b51c2f656127`.
- Status: `FINALIZED`; consensus `MAJORITY_AGREE`; leader execution `SUCCESS`. Validator receipt recorded an error/cancellation after quorum was reached.
- Canonical `get_info`: `{"chain_id":61999,"contract":"EntrewRegistry","name":"ENTREW","page_limit":25,"protocol_outcomes_are_product_results":false,"schema_version":1}`.
- Source comparison: RPC `getContractCode` bytes hashed to the same SHA-256 as the source above. No separate source-attestation service was available.

## Production frontend

- URL: [https://the-entrew.vercel.app](https://the-entrew.vercel.app).
- Vercel deployment: [dpl_8Y5SPk1HZ5KHPreZzSXLUDGVrS4A](https://vercel.com/bibidees-projects/the-entrew/8Y5SPk1HZ5KHPreZzSXLUDGVrS4A), `READY`.
- Production env: contract `0xf37C3D7992833A876Bb2933c09b11bD49FC817ca`; chain `61999`; RPC `https://studio.genlayer.com/api`.
- Brave production UI showed canonical `e1 QUALIFIED` and `e2 NOT ESTABLISHED`; evidence route direct navigation/reload worked with no console errors.
- Responsive overflow assertions passed at the widths above; full repeated route sweep was interrupted by an intermittent RPC fetch.

## Live fixture lifecycle

Designated repo: [Bibidee/entrew-fixtures](https://github.com/Bibidee/entrew-fixtures). The repository was created for this test separate from the product repo, and the user explicitly authorized the fixture-marker writes.

Program `p1`:
- Publish tx: `0xd6e7d5400d57a7e6babefc08d87d1ef47a3ae2357d73c0e2ac159714c5d18e22`; finalized majority agreement, leader and validator success.
- Program terms digest: `7c513eeae1a84ce02621e07fa55272c5b6cc0dd09a9c2da606e8c4a7309b6b82`.

Positive:
- Applicant: `fresh-alice`; wallet `0x7c65ce913f5665c11f1219048112c84cd6cb2a4b`.
- Fixture commit: `2dce6f15a507aca0b26dbd8c85214ad5faaade73`; marker SHA-256 `f1ee76766a0e423b75126cb33e90b46defd5180725ad77e3c53cda1138572555`.
- Submit tx: `0xb40732b8881c45aceebf238b048f7a0c05ec467d809de20c10e08050812fda2a`; finalized.
- Assessment tx: `0x1e660ab0ff7a885f42ce0677a70e6d776debd63f9354bd260fe3c8a8708ba79e`; finalized majority agreement, leader and validator success.
- Canonical result: entry `e1:r1`, `QUALIFIED`, vector `[MET, MET]`, `REVISION_BOUND`, issue `NONE`; included in roster.

Negative:
- Applicant: `fresh-bob`; wallet `0x2cd419603eba593074653930ddc4073d4fd8fc60`.
- Fixture commit: `030ef93dad30a4b40a6fdcf44deaf84b78252a81`; marker SHA-256 `d181eee57c77292fbfff1ce2b78228b0a59330992a5b9fda7d52f8f41cd317ab`.
- Submit tx: `0x7169872045f7d094d03cdc7d03e80b5f03870daf266b45a06f58627c9572c7f2`; finalized.
- Assessment tx: `0x44feb87f02a28d923894c7b6bf1da4cd0afa4b0890a8974f3a1e123c8f77eca8`; SDK wait and canonical reads confirmed finalized majority agreement; validator cancellation reported after quorum.
- Canonical result: entry `e2:r1`, `NOT_ESTABLISHED`, vector `[NOT_MET, MET]`, `REVISION_BOUND`, issue `NONE`; absent from roster.

## Open checks and release state

Requested Studionet deploy, production address configuration/redeploy, and real positive/negative lifecycles are complete.

Not yet live-proven: corrected revision, controlled inconclusive and retry/cooldown, replay, unauthorized wallet, wrong-network real-wallet behavior, complete mobile/keyboard QA, and held-out semantic accuracy. The negative assessment RPC hash lookup had one transient “not found” response after its finalized SDK result and canonical state were read; later canonical readback preserved the outcome.

Release verdict: requested release operations complete; broader adversarial and semantic audit is still partial. See `../../docs/TEST_RESULTS.md` and `TEST_MATRIX.md`.
