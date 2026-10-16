# Corrected Studionet deployment preflight

The URL construction repair changes the contract bytes. The historical contract at
`0x882D765Bc9c1a6A83091858620bC60212135d25b` and its evidence remain historical
records; this preflight must not be used to replace or mutate them.

| Item | Value |
| --- | --- |
| Network | Studionet `61999` (`https://studio.genlayer.com/api`) |
| Candidate SHA-256 | `b81379bfa8b1b438381647c91c611999e55440d1edab6c0176d9e52fc2c4a5d8` |
| Candidate Git blob ID | `ec4b5bd4aa453b73987d732986191670b580ab98` |
| Required local CLI | repository-local GenLayer `0.39.1` |

`npm run deploy:studionet` verifies the exact source bytes, runs the chain
configuration check, requires the repository-local CLI version, and refuses an
existing frontend contract-address environment value before it can invoke the
deployment command. Do not run it until a separate deployment authorization is
given. After a deployment transaction reaches finality, create a filled copy of
`live-run.template.json` with the new contract, transaction, program, fixtures,
wallets, nonces, and source hash, then run the read-only `live-verify.mjs`.
