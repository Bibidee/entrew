# Deployment record and runbook

## Current production record

- Frontend: [https://the-entrew.vercel.app](https://the-entrew.vercel.app).
- Vercel project: `the-entrew` in the `bibidees-projects` team.
- Production deployment: [READY · EndQrms6feF8MUdbE9ipUYha76ea](https://vercel.com/bibidees-projects/the-entrew/EndQrms6feF8MUdbE9ipUYha76ea), built from code commit `090968f8d6c346f1fa787d9f2685e8bce83f1356`.
- Static export output is configured as `out` in `vercel.json`.
- The frontend is intentionally unconfigured: `NEXT_PUBLIC_ENTREW_CONTRACT_ADDRESS` is empty. It shows no fabricated programs, counts, or results.
- The project was created and deployed with the Vercel CLI from this local checkout. GitHub automatic deployment is not connected; a future Vercel release currently requires a CLI deployment.
- Contract source SHA-256 and verification evidence are recorded in `docs/TEST_RESULTS.md`. The hash is not an on-chain source attestation.

This is a hosted frontend release, not an on-chain product release. No Studionet address, transaction hash, live validator result, or source attestation exists.

## Completed release preflight

1. `package-lock.json` is committed; `npm ci` passes in GitHub Actions.
2. `npm run cli:version` and `npm run cli:local-version` report exactly `0.39.1`.
3. `npm run network:check` passes the active-source contamination scan and confirms RPC chain ID `61999` (`0xf22f`).
4. `npm run check` passes locally. GitHub Actions run `38886003320` passes on Linux, including Direct Mode, browser tests, build, and dependency audit.
5. Production static export is deployed to Vercel and reached `READY`. Production route, reload, responsive, accessibility, and mock-wallet checks are recorded in `docs/TEST_RESULTS.md`.

## Remaining release steps

1. From a controlled wallet configured for Studionet `61999`, run `npm run deploy:studionet`. The script checks the RPC and local CLI before submitting `contracts/entrew_registry.py`; the user must authorize/sign the transaction in the wallet.
2. Record the contract address and deployment transaction. Independently verify finalized successful execution, `FINISHED_WITH_RETURN`, network identity, and canonical `get_info` readback.
3. Compare deployed source bytes or supported source attestation with SHA-256 `FA351D5423A96FFA3D3EC145E3A7B45A20F9D140BFA7D70F0AAE48B897A5C0AC`. If attestation is unsupported, record that limitation.
4. Only after those checks, set `NEXT_PUBLIC_ENTREW_CONTRACT_ADDRESS` to the verified address and rebuild/redeploy the frontend. Do not reuse a stale address after any contract source change.
5. Use separate controlled organizer/applicant wallets and public fixture repositories to verify a positive lifecycle, a negative lifecycle, finalized canonical roster reads, corrected revision, replay/authorization boundaries, and refresh recovery. Record only observed transaction and source evidence.
6. If the GitHub fixture marker must be written, use a public fixture repository where the user has explicitly granted write access; keep test fixtures separate from the product repository.

## Network pins

- Chain: GenLayer Studionet `61999`.
- RPC: `https://studio.genlayer.com/api`.
- Explorer: `https://explorer-studio.genlayer.com`.
- Local CLI: GenLayer `0.39.1`.
- JavaScript SDK: `genlayer-js 1.1.8`.
- The contract starts with a pinned `py-genlayer` runtime hash so deployment and Direct Mode use the same SDK line.
- Alternate/preview chain `61997` is prohibited.

## Post-contract browser release check

The current production browser checks verify only the intentionally unconfigured state. After adding a real contract address, repeat production reads and writes using actual wallets, verify finalized canonical reads and roster contents, and retest the exact query-ID routes after reload. Mock-wallet and static placeholder checks are not live transaction evidence.
