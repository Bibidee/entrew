# Deployment record and runbook

## Remediation branch — not deployed

- Branch: `audit/full-remediation`, based on verified `origin/main` commit `d81ad944a6a89e5713b7f1ca6c224b80e8e56769`.
- Earlier PR #6 remediation snapshot: contract commit `d64552d38cbd244b647060f1c045550e2a484237`, source SHA-256 `c8836a1cef11f6e969f0913d5eae9026a77d705bae8168584b6221ffbe2fb898`. It is historical, not the current release candidate.
- Starting PR #6 head: `f33b7d991e1b8c8c05c06e73e6de27c46a0eab5f`, source SHA-256 `1429e3134d49ff20b00f233c98f3783a8580dc5b7cc280de8f7e70da13e010e8`, Git blob `f6f7c7e9c72814cb82497f3b7a3c6639de7503d3`. It is also historical after the consolidation fixes.
- Consolidated release candidate: source SHA-256 `4e3239074eec24ccf9328908083a34d012356b698286903e91111a0d9c3e105b`, Git blob `22cf4e27d7d99a9ae9a6fc8a89a6dfa81f185835`. The deployment script refuses any source whose SHA-256 differs from this value.
- The current contract fix has not been deployed. No production Vercel environment value or alias was changed. The live address and transaction below are historical evidence for the previous source version only.
- Adoption requires a separately authorized Studionet deployment of the exact reviewed source, followed by source-byte comparison, finality/readback checks, and frontend configuration/deployment. The current task's checks are local Direct Mode and browser evidence, not live proof for the modified contract.

## Last recorded production release — 2026-10-16

The details below are carried forward from the prior release record. They were not independently re-read from Vercel deployment configuration during this remediation turn.

- Frontend alias: [https://the-entrew.vercel.app](https://the-entrew.vercel.app).
- Vercel project: `the-entrew` in team `bibidees-projects`.
- Latest production deployment: [READY · dpl_8Y5SPk1HZ5KHPreZzSXLUDGVrS4A](https://vercel.com/bibidees-projects/the-entrew/8Y5SPk1HZ5KHPreZzSXLUDGVrS4A), URL [https://the-entrew-qqznmpl9w-bibidees-projects.vercel.app](https://the-entrew-qqznmpl9w-bibidees-projects.vercel.app).
- Production environment: `NEXT_PUBLIC_ENTREW_CONTRACT_ADDRESS=0xf37C3D7992833A876Bb2933c09b11bD49FC817ca`, chain ID `61999`, RPC `https://studio.genlayer.com/api`.
- The environment variable was updated with the Vercel CLI and the frontend redeployed after the address was set.
- Vercel reports source `cli`, `githubCommitSha` `c421e35607e9d036812fc519854fbb0bfd456554` on `fix/genlayer-web-response-status`, and `gitDirty=1`. It cannot attest that the complete deployed artifact equals a clean Git commit.
- Direct comparison of deployed `app/globals.css` and `components/EntrewApp.tsx` found the PR #4 accessibility changes from `24d805dc3f6c61d07641161fa04fec70e4a55d8a`; that is limited file evidence, not whole-artifact provenance. The deployed contract source remains the historical `21f1eee1f6b23a6fa902d7e2b6449d1f6e1363f5` source hash recorded below.

## Contract and source integrity

- Chain: GenLayer Studionet `61999` (`0xf22f`).
- Contract: `0xf37C3D7992833A876Bb2933c09b11bD49FC817ca`.
- Deployment transaction: [`0x743047241ae5eed661a0d887b8885b18402b42fa3b5bb6f91b02b51c2f656127`](https://explorer-studio.genlayer.com/tx/0x743047241ae5eed661a0d887b8885b18402b42fa3b5bb6f91b02b51c2f656127).
- Receipt: `FINALIZED`, `MAJORITY_AGREE`, leader execution `SUCCESS`. The validator receipt reported an error after quorum was reached and the validator was cancelled; consensus and canonical reads completed.
- Contract source SHA-256: `9bf815285cd31ed4fb14769dca8e2fa1755c36b91c5a0cf325660ba777891fcc`.
- RPC `getContractCode` readback hashes to the exact same SHA-256 as the tracked contract source. This is direct deployed-code byte comparison, not a separate attestation service.
- Canonical `get_info`: `{"chain_id":61999,"contract":"EntrewRegistry","name":"ENTREW","page_limit":25,"protocol_outcomes_are_product_results":false,"schema_version":1}`.
- No active-source reference to prohibited chain `61997` was found by the network check.

## Live lifecycle evidence

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

## Completed release preflight

- `package-lock.json` is committed; CI `npm ci` passed.
- Repository-local GenLayer CLI is `0.39.1`; GenLayerJS is `1.1.8`.
- Studionet RPC returned chain ID `61999`; the active-source scan found no `61997`.
- GitHub Actions run [38894822355](https://github.com/Bibidee/entrew/actions/runs/38894822355) passed the full CI workflow for PR #4, including CLI/network checks, type/lint, unit and policy checks, Direct Mode, Playwright, build and dependency audit.
- Vercel production build reached `READY` after the address was configured.

## Remaining checks

The requested deploy, production configuration, and positive/negative finalized lifecycle have been completed. The broader matrix is not complete: corrected-revision recovery, live inconclusive retry/cooldown, live replay and unauthorized-wallet controls, wrong-network real-wallet behavior, full mobile/manual accessibility review, and an independently held-out semantic benchmark remain open. See `docs/TEST_RESULTS.md` and `entrew/docs/TEST_MATRIX.md`.

## Network pins

- Studionet chain `61999`, RPC `https://studio.genlayer.com/api`, explorer `https://explorer-studio.genlayer.com`.
- CLI `0.39.1`; GenLayerJS `1.1.8`.
- Alternate chain `61997` is prohibited.
