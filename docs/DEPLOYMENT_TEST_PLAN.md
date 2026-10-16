# ENTREW remediation deployment and live-test plan

## Guardrails and preserved production state

This is a preparation plan for PR #6, branch `audit/full-remediation`. It does not authorize a deployment, wallet transaction, Vercel environment change, fixture write, or merge. Do not use the historical production contract as the test target or overwrite its evidence.

- Target network: Studionet, chain ID `61999`.
- Existing production contract to preserve: `0xf37C3D7992833A876Bb2933c09b11bD49FC817ca`.
- Existing production deployment transaction to preserve: `0x743047241ae5eed661a0d887b8885b18402b42fa3b5bb6f91b02b51c2f656127`.
- Existing production frontend: [https://the-entrew.vercel.app](https://the-entrew.vercel.app). Its historical deployment metadata is a dirty CLI source tree; it must not be treated as an immutable Git-commit attestation.
- New remediation deployment address/transaction: not created.
- Production `NEXT_PUBLIC_ENTREW_CONTRACT_ADDRESS`: unchanged; no Vercel environment operation was run.

## Wallet and fixture allocation

Use six distinct, user-authorized Studionet wallets for a single run. Record public addresses and authorization evidence in the run log; never record private keys or seed phrases.

| Role | Address | Use |
|---|---|---|
| Operator/deployer | pending explicit authorization | Deploy the pinned source; keep separate from all applicants |
| Organizer | pending explicit authorization | Publish the temporary test program and fixed rubric |
| Positive/corrected applicant | pending explicit authorization | Submit the positive fixture, then the corrected revision on the same entry |
| Negative applicant | pending explicit authorization | Submit a separate fixture that affirmatively fails one criterion |
| Unavailable-evidence applicant | pending explicit authorization | Isolate inconclusive evidence and retry/cooldown checks |
| Unauthorized control | pending explicit authorization | Attempt a forbidden mutation against another wallet's entry |

The operator, organizer, positive/corrected applicant, negative applicant, unavailable-evidence applicant and unauthorized control are distinct roles. The corrected `r1` and `r2` revisions intentionally use the same positive applicant wallet, distinct immutable commits and fresh nonces. The unauthorized control must differ from the target entry's applicant. These role assignments are preparation only; no wallet has been authorized for this run.

Use the designated fixture repository [Bibidee/entrew-fixtures](https://github.com/Bibidee/entrew-fixtures) only after confirming its current owner permits new writes for this run. Create a unique branch or isolated paths per run, immutable commit SHA per case, and a fresh marker nonce per applicant. The marker must bind the temporary program ID, matching applicant address, exact fixture repository, and nonce. Do not reuse historical `p1`, commits, or marker evidence as proof for the remediation source.

## Preflight, deployment and readback

| Step | Execution | Evidence to save | State |
|---|---|---|---|
| Pin PR head and contract source SHA-256/Git blob ID | Automatable, read-only | Git commit, SHA-256, blob ID | Starting PR head `f33b7d991e1b8c8c05c06e73e6de27c46a0eab5f` had source SHA-256 `1429e3134d49ff20b00f233c98f3783a8580dc5b7cc280de8f7e70da13e010e8` and blob `f6f7c7e9c72814cb82497f3b7a3c6639de7503d3`. Consolidated candidate source SHA-256 `cac38f9d2a607446b071aecfe7e00ed0be96c2b31dd4ea9f9633477295e1b45e`; Git blob `8348ba2282fc062e9fe32e488245d536bd138334`. Record the final pushed PR commit before deployment. |
| Confirm local CLI `0.39.1`, RPC chain ID `61999`, and no `61997` contamination | Automatable, read-only | CLI version and network-check output | Verified for this branch before deployment |
| Build/deploy exact contract with the separately authorized operator wallet | CLI can submit; actual deployment requires wallet authorization and a broadcast | Deployment transaction, contract address, finality receipt | Blocked pending explicit deployment authorization |
| Read canonical chain info and deployed source bytes | Automatable after deployment | Chain ID, `getContractCode` SHA-256 vs pinned source, canonical contract metadata | Blocked until deployment |
| Set the new address in Vercel and redeploy | Vercel CLI can perform the operation; production change requires explicit authorization | Environment/deployment IDs, resulting production URL and config snapshot | Blocked by current no-production-change instruction; deploy from a clean checkout with `.vercelignore` applied |

Do not overwrite the existing production address while preparing this test. A separate test project/deployment is preferred; if the existing production project must be changed later, use a reviewed change and preserve its current rollback configuration.

## Live lifecycle matrix

| Case | Setup and action | Automatable after authorization | Requires real wallet interaction | Required proof |
|---|---|---|---|---|
| Positive lifecycle | Organizer publishes; positive applicant submits a valid marker and evidence; assess | Transaction submission/readback can use an authorized CLI; assessment validators execute on-chain | Applicant/operator must authorize each write/signature | All criteria `MET`; `QUALIFIED`; finalized execution; canonical review/roster readback; tx hashes |
| Negative lifecycle | Separate negative applicant submits evidence that directly disproves one criterion | Same as positive | Separate applicant signature | At least one `NOT_MET`; `NOT_ESTABLISHED`; finalized readback; absent from qualified roster |
| Corrected revision | Positive applicant submits a distinct corrected commit before deadline | Can be scripted after wallet unlock | Applicant must authorize revision and assessment writes | New commit and nonce; final result; canonical revision record |
| Provider unavailable | Use a valid pinned fixture with a controlled missing/API-unavailable source condition | Can script fixture preparation and transaction flow | Applicant must authorize assessment; fixture write needs repo authorization | `INCONCLUSIVE`; issue code; no roster entry; cooldown/retry state |
| Retry boundary | Retry before cooldown, at cooldown, then exhaust allowed retries | Clock-driven lifecycle can be automated | Applicant must authorize each assessment transaction | Early retry rejected; allowed retry finalized; cap enforced |
| Unauthorized mutation | Unauthorized-control wallet targets another applicant's entry | Attempt and canonical readback can be scripted | Wallet must connect/sign or explicitly reject | Revert/rejection; no state change |
| Replay | Reuse a conclusive snapshot attempt key | Scripted | Applicant must authorize initial assessment; replay can be scripted from same account | Replay rejected; attempt count and result unchanged |
| Wrong network / account switch | Connect wrong chain, switch account/provider during pending UI action | E2E simulation is automated; actual provider behavior should be manually checked | Real wallet chain/account prompt and signature confirmation | UI blocks wrong chain/stale account; correct address and chain shown |
| Reload/finality | Reload after submitted and finalized transaction | Browser assertions and canonical reads automatable | Wallet approval needed for originating write | No provisional state shown as final; canonical digest matches after reload |
| Production frontend | Browse the redeployed URL at desktop and mobile widths | Playwright route/viewport/axe checks automatable | Real wallet connection flows require manual confirmation | URL/deployment ID, screenshots/logs, console, axe, responsive results |

No transaction hashes, outcomes, or source attestations for these cases exist yet. Do not reuse the historical deployment's positive/negative transaction evidence for the remediation code.

## Benchmark execution boundary

The checked-in 40-case corpus is a post-prompt deterministic fixture set, not a held-out semantic benchmark. Direct Mode currently uses mocked LLM outputs and cannot measure actual semantic judgments or validator agreement. The installed test harness exposes no configured independent live evaluator. A real GenLayer validator benchmark requires executing the changed contract through live nondeterministic execution, which entails a deployment and assessment transaction. It therefore remains blocked by the current no-broadcast instruction and absence of a separately authorized evaluator endpoint. Record the evaluator/model version, frozen held-out set digest, all case outputs, false qualification/nonqualification, inconclusive rate, and validator disagreement if that run is later authorized.

## Decision gate

Keep the remediation not submission-ready until all are true: exact-source deployment and canonical attestation; the positive and negative live lifecycles; wallet/retry/replay controls; source/commit evidence; Vercel production browser QA after an authorized deploy; and an independently authored, independently executed held-out semantic benchmark with actual result counts. CI success alone does not clear these gates.
