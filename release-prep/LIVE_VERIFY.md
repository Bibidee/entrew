# Read-only live verification harness

`live-verify.mjs` is prepared for use after an authorized Studionet deployment and wallet-approved lifecycle transactions. It performs reads and finality polling only; it never signs or sends transactions. The filled config must identify a new test contract and cannot use the historical production address.

It verifies finalized deployed source bytes against SHA-256 `4e3239074eec24ccf9328908083a34d012356b698286903e91111a0d9c3e105b`, reads canonical state with the pinned SDK's `TransactionHashVariant.LATEST_FINAL`, and reads source using the documented `gen_getContractCode` finalized-status request. It checks supplied transaction finality/execution and asserts each fixture's exact repository, full commit SHA, applicant wallet, program ID, fresh nonce, marker hash, file fingerprints, outcome, provenance, issue code and criterion vector. An optional unauthorized-action assertion checks that a finalized failed action leaves the target entry unchanged.

The config template is intentionally incomplete. The harness has passed syntax validation against the repository's pinned `genlayer-js@1.1.8` types/runtime. It has not been run against a deployed remediation contract or live transactions; the SDK's live RPC/finality behavior therefore remains unverified on the modified deployment.
