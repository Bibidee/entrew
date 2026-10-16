# ENTREW

ENTREW is a backendless public review registry for developer programs. Organizers publish immutable two- or three-criterion requirements and deadlines. Applicants submit a public GitHub repository, a full commit SHA, bounded evidence paths, and a same-revision `.entrew/claim.json` marker. GenLayer validators independently retrieve and assess the bounded evidence. A contract outcome is only visible after finalized successful execution and canonical state readback.

This repository was built from the supplied specification package in [`entrew/`](entrew/README.md). The application and contract source have been installed and validated locally, but the contract has **not** been deployed or verified on Studionet. The `.env.example` contract address is deliberately empty; the app shows a real unconfigured state instead of demo programs.

## Source layout

- `contracts/entrew_registry.py` — one contract, bounded public indexes, immutable terms/revisions, independent nondeterministic review, deterministic outcome aggregation.
- `app/`, `components/`, `lib/` — static App Router pages, injected-wallet writes, final-state RPC reads, validation and recovery helpers.
- `tests/` — source-policy tests, authored GenLayer Direct Mode tests, mutation probes, and a 40-case fixture corpus. Semantic accuracy has not been measured.
- `docs/` — implementation decisions, architecture, security limits, deployment steps, and the current validation record.
- `entrew/` — original V1 handoff, retained unchanged as source input.

## Locked network and versions

- Studionet only: chain `61999`, RPC `https://studio.genlayer.com/api`, explorer `https://explorer-studio.genlayer.com`.
- GenLayer CLI `0.39.1`; GenLayerJS `1.1.8`.
- Never configure chain `61997` or a preview network.

## Local commands

Install the pinned JavaScript and Python test dependencies, then run:

```powershell
npm ci
python -m pip install -r requirements-test.txt
npx playwright install chromium
npm run cli:local-version
npm run network:check
npm run check
npm run test:e2e
npm audit
```

`npm run check` runs typecheck, lint, source tests, Python policy and mutation tests, Direct Mode contract tests, and the static production build. `npm run test:e2e` covers desktop/mobile Chromium, query-ID route reloads, responsive overflow, wallet selection, and axe accessibility in the deliberately unconfigured state. These checks do not establish live transaction finality or a deployed lifecycle.

## Configuration

After a real deployment, set `NEXT_PUBLIC_ENTREW_CONTRACT_ADDRESS` to the verified nonzero registry address. Keep the chain ID and RPC at the exact values in `.env.example`. Static export writes to `out/`; configure the chosen static host to serve the exported route file for query-ID links and verify a direct reload of each route before release.

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md), [`docs/SECURITY.md`](docs/SECURITY.md), and [`docs/TEST_RESULTS.md`](docs/TEST_RESULTS.md) for current evidence and blocked release tasks.
