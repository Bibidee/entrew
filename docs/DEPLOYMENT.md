# Deployment record and runbook

## Current release target — 2026-10-17

- Release contract: `0xf365B36251a734B19d5E56A09AE54bD503fbcC31` on Studionet `61999`.
- Exact deployed source: SHA-256 `a812dcc4884544ad77af6591d2b47cdd0221d6bd966633bd65200d1d02590f44`; Git blob `7e699224bbbd77e0b60d1364a592ebe49332ba84`.
- Deployment transaction: `0xf26389f61139ebc079e4da0b1512aee882d229346546a896fe250b18a38853ad`. Canonical `get_info` and deployed-code readback were verified against these bytes.
- Demonstrated lifecycle outcomes on this contract: initial `NOT_ESTABLISHED`, corrected `QUALIFIED`, independent `QUALIFIED`, and fresh negative `NOT_ESTABLISHED`.
- A fresh missing-file case correctly failed closed as `INCONCLUSIVE / PROVIDER_UNAVAILABLE / GITHUB_403_AMBIGUOUS` before marker or file verification. It is a validator-side GitHub availability limitation, not a missing-file success result. See `release-prep/FINAL_RELEASE_VERIFICATION.md`.

The sections below preserve earlier deployments and evidence. They are historical records unless explicitly labelled as the current release target.

## Earlier remediation deployment — historical

- Branch: `audit/full-remediation`, current reviewed commit `2454b258154c31c63ced0848d7bab9580d7efe0c`.
- Consolidated candidate source SHA-256: `cac38f9d2a607446b071aecfe7e00ed0be96c2b31dd4ea9f9633477295e1b45e`, Git blob `8348ba2282fc062e9fe32e488245d536bd138334`. The deployment script remains pinned to this hash.
- Studionet chain: `61999`; RPC `https://studio.genlayer.com/api`; CLI `0.39.1`; GenLayerJS `1.1.8`.
- New test contract: `0x882D765Bc9c1a6A83091858620bC60212135d25b`.
- Deployment transaction: [`0xe77805efcf2f4dd30f0d4fb787174628411c691789fdb78354125dbb1990b842`](https://explorer-studio.genlayer.com/tx/0xe77805efcf2f4dd30f0d4fb787174628411c691789fdb78354125dbb1990b842).
- Deployer: `0x527dA5f7022f14f7105e5f06cec1a8eff53556b5`.
- Independent readback: `FINALIZED`, `SUCCESS`, `MAJORITY_AGREE`; deployed bytes `57769` and SHA-256 `cac38f9d2a607446b071aecfe7e00ed0be96c2b31dd4ea9f9633477295e1b45e`; canonical `get_info` reports chain `61999`, `EntrewRegistry`, `ENTREW`, page limit `25`, schema version `1`.
- The existing production contract, Vercel address and historical evidence remain unchanged. No fixture repository write, lifecycle transaction or merge occurred after this deployment.
- GitHub Actions [run 38950006010](https://github.com/Bibidee/entrew/actions/runs/38950006010) passed on commit `2454b258154c31c63ced0848d7bab9580d7efe0c`.

## Historical production release — 2026-10-16

The details below are carried forward from the prior release record. They were not independently re-read from Vercel deployment configuration during this remediation turn.

- Frontend alias: [https://the-entrew.vercel.app](https://the-entrew.vercel.app).
- Vercel project: `the-entrew` in team `bibidees-projects`.
- Latest production deployment: [READY · dpl_8Y5SPk1HZ5KHPreZzSXLUDGVrS4A](https://vercel.com/bibidees-projects/the-entrew/8Y5SPk1HZ5KHPreZzSXLUDGVrS4A), URL [https://the-entrew-qqznmpl9w-bibidees-projects.vercel.app](https://the-entrew-qqznmpl9w-bibidees-projects.vercel.app).
- Production environment: `NEXT_PUBLIC_ENTREW_CONTRACT_ADDRESS=0xf37C3D7992833A876Bb2933c09b11bD49FC817ca`, chain ID `61999`, RPC `https://studio.genlayer.com/api`.
- The environment variable was updated with the Vercel CLI and the frontend redeployed after the address was set.
- Vercel reports source `cli`, `githubCommitSha` `c421e35607e9d036812fc519854fbb0bfd456554` on `fix/genlayer-web-response-status`, and `gitDirty=1`. It cannot attest that the complete deployed artifact equals a clean Git commit.
- Direct comparison of deployed `app/globals.css` and `components/EntrewApp.tsx` found the PR #4 accessibility changes from `24d805dc3f6c61d07641161fa04fec70e4a55d8a`; that is limited file evidence, not whole-artifact provenance. The deployed contract source remains the historical `21f1eee1f6b23a6fa902d7e2b6449d1f6e1363f5` source hash recorded below.

## Historical contract and source integrity

- Chain: GenLayer Studionet `61999` (`0xf22f`).
- Contract: `0xf37C3D7992833A876Bb2933c09b11bD49FC817ca`.
- Deployment transaction: [`0x743047241ae5eed661a0d887b8885b18402b42fa3b5bb6f91b02b51c2f656127`](https://explorer-studio.genlayer.com/tx/0x743047241ae5eed661a0d887b8885b18402b42fa3b5bb6f91b02b51c2f656127).
- Receipt: `FINALIZED`, `MAJORITY_AGREE`, leader execution `SUCCESS`. The validator receipt reported an error after quorum was reached and the validator was cancelled; consensus and canonical reads completed.
- Contract source SHA-256: `9bf815285cd31ed4fb14769dca8e2fa1755c36b91c5a0cf325660ba777891fcc`.
- RPC `getContractCode` readback hashes to the exact same SHA-256 as the tracked contract source. This is direct deployed-code byte comparison, not a separate attestation service.
- Canonical `get_info`: `{"chain_id":61999,"contract":"EntrewRegistry","name":"ENTREW","page_limit":25,"protocol_outcomes_are_product_results":false,"schema_version":1}`.
- No active-source reference to prohibited chain `61997` was found by the network check.

## Historical live lifecycle evidence

The designated public fixture repository is [Bibidee/entrew-fixtures](https://github.com/Bibidee/entrew-fixtures). It is separate from the product repository. The user authorized its use and marker writes for these controlled checks.

| Action | Transaction | Finalized canonical result |
|---|---|---|
| Publish test program `p1` | `0xd6e7d5400d57a7e6babefc08d87d1ef47a3ae2357d73c0e2ac159714c5d18e22` | `FINALIZED`, `MAJORITY_AGREE`; leader and validator success. Canonical terms digest `7c513eeae1a84ce02621e07fa55272c5b6cc0dd09a9c2da606e8c4a7309b6b82`. |
| Positive applicant submit `e1:r1` | `0xb40732b8881c45aceebf238b048f7a0c05ec467d809de20c10e08050812fda2a` | `FINALIZED`, `MAJORITY_AGREE`; canonical entry `e1`. |
| Positive assessment | `0x1e660ab0ff7a885f42ce0677a70e6d776debd63f9354bd260fe3c8a8708ba79e` | `FINALIZED`, `MAJORITY_AGREE`; `QUALIFIED`, both criteria `MET`, provenance `REVISION_BOUND`, issue `NONE`; `e1` appears in the qualified roster. |
| Negative applicant submit `e2:r1` | `0x7169872045f7d094d03cdc7d03e80b5f03870daf266b45a06f58627c9572c7f2` | `FINALIZED`, `MAJORITY_AGREE`; canonical entry `e2`. |
| Negative assessment | `0x44feb87f02a28d923894c7b6bf1da4cd0afa4b0890a8974f3a1e123c8f77eca8` | SDK finality wait and canonical reads confirmed `FINALIZED`, `MAJORITY_AGREE`; `NOT_ESTABLISHED`, criterion vector `[NOT_MET, MET]`, provenance `REVISION_BOUND`, issue `NONE`; `e2` is absent from the qualified roster. Validator cancellation was reported after quorum. |

The later RPC lookup for the negative assessment hash briefly returned “not found”; the finalized SDK result and canonical contract readback remained available and showed the expected state. Do not interpret a transient lookup failure as a state rollback.

The positive claim marker is at commit `2dce6f15a507aca0b26dbd8c85214ad5faaade73`; its marker SHA-256 is `f1ee76766a0e423b75126cb33e90b46defd5180725ad77e3c53cda1138572555`. The negative marker is at commit `030ef93dad30a4b40a6fdcf44deaf84b78252a81`; its marker SHA-256 is `d181eee57c77292fbfff1ce2b78228b0a59330992a5b9fda7d52f8f41cd317ab`. Both markers bind program `p1`, the applicant wallet, the fixture repository and a unique nonce at the assessed commit.

## Historical release preflight

- `package-lock.json` is committed; CI `npm ci` passed.
- Repository-local GenLayer CLI is `0.39.1`; GenLayerJS is `1.1.8`.
- Studionet RPC returned chain ID `61999`; the active-source scan found no `61997`.
- GitHub Actions run [38894822355](https://github.com/Bibidee/entrew/actions/runs/38894822355) passed the full CI workflow for PR #4, including CLI/network checks, type/lint, unit and policy checks, Direct Mode, Playwright, build and dependency audit.
- Vercel production build reached `READY` after the address was configured.

## Historical remaining checks

The historical production release completed its deploy, production configuration, and positive/negative finalized lifecycle. The separate remediation test deployment above has no lifecycle transactions yet. The broader matrix is not complete: corrected-revision recovery, live inconclusive retry/cooldown, live replay and unauthorized-wallet controls, wrong-network real-wallet behavior, full mobile/manual accessibility review, and an independently held-out semantic benchmark remain open. See `docs/TEST_RESULTS.md` and `entrew/docs/TEST_MATRIX.md`.

## Network pins

- Studionet chain `61999`, RPC `https://studio.genlayer.com/api`, explorer `https://explorer-studio.genlayer.com`.
- CLI `0.39.1`; GenLayerJS `1.1.8`.
- Alternate chain `61997` is prohibited.
