# Deployment record and runbook

## Current record

**No Studionet deployment or frontend hosting was performed.** No address, transaction hash, source attestation, production URL, or live validator result is available. This is a source implementation, not a released product. The frontend remains deliberately unconfigured while `NEXT_PUBLIC_ENTREW_CONTRACT_ADDRESS` is empty.

The contract SHA-256 and source-control commit are recorded in `docs/TEST_RESULTS.md` after the source commit is created. They identify the artifact to review; they do not attest to deployed code.

## Required release preflight

1. Generate and commit `package-lock.json`, install with `npm ci`, then verify local CLI output is exactly `0.39.1`.
2. Run `npm run network:check`; it scans active app/contract/config source for other network references and queries the exact RPC chain ID.
3. Run the complete type, lint, Python, Direct Mode, contract-surface, browser, and build suites. Review all unresolved findings.
4. Run `npm run deploy:studionet`. The script checks network and CLI version before submitting `contracts/entrew_registry.py` to `https://studio.genlayer.com/api`.
5. Capture the final address and transaction hash, wait for `FINALIZED`, require `FINISHED_WITH_RETURN`, and independently read `get_info`. Compare the deployed source bytes or supported attestation with the contract SHA-256 and release commit. If source attestation is unsupported, say so.
6. Configure the exact verified address and build the static app. Do not replace the deployed contract after building; any source change requires a new address and rebuilt frontend.
7. Deploy `out/` to the chosen static host, configure route fallback for query-ID pages, then test direct loads and refreshes at `/`, `/program?ref=…`, `/apply?program=…`, and `/evidence?entry=…`.
8. Use controlled wallets and public fixture repositories to complete separate organizer/applicant positive, negative, corrected-revision, outage, replay, authorization, refresh-recovery, desktop, mobile, and wrong-network lifecycles. Record only observed evidence.

## Network pins

- Chain: GenLayer Studionet `61999`.
- RPC: `https://studio.genlayer.com/api`.
- Explorer: `https://explorer-studio.genlayer.com`.
- Local CLI: GenLayer `0.39.1`; JS SDK: `genlayer-js 1.1.8`.
- Alternate/preview chain `61997` is prohibited.

## Hosting caveat

`next.config.ts` requests a static export with trailing-slash route output. No host has been selected or configured. Static export alone does not prove query links survive refresh; host fallback behavior must be verified against the real deployment.
