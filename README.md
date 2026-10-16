# ENTREW

ENTREW is a backendless public review registry for developer programs. Organizers publish immutable two- or three-criterion requirements and deadlines. Applicants submit a public GitHub repository, full commit SHA, bounded evidence paths, and a same-revision `.entrew/claim.json` marker. GenLayer validators independently retrieve and assess the bounded evidence. A contract outcome is only visible after finalized successful execution and canonical state readback.

The V1 registry is deployed on GenLayer Studionet and the production frontend is live at [the-entrew.vercel.app](https://the-entrew.vercel.app). A real positive and negative fixture lifecycle was executed against the previously deployed contract and read back from canonical state. The current remediation branch changes contract source; that source has **not** been deployed, and production configuration has not been changed. Historical deployment evidence does not verify the modified contract. See [deployment evidence](docs/DEPLOYMENT.md) and [validation results](docs/TEST_RESULTS.md). The checked-in `.env.example` intentionally contains no live address; configure the address only in the intended deployment environment.

## Source layout

- `contracts/entrew_registry.py` — one contract, bounded public indexes, immutable terms/revisions, independent nondeterministic review, deterministic outcome aggregation.
- `app/`, `components/`, `lib/` — static App Router pages, injected-wallet writes, final-state RPC reads, validation and recovery helpers.
- `tests/` — source-policy tests, GenLayer Direct Mode tests, mutation probes, and a 40-case fixture corpus. The fixture corpus is not a held-out semantic benchmark.
- `docs/` — implementation decisions, architecture, security limits, deployment evidence, and current validation record.
- `entrew/` — original V1 handoff, retained as source input.

## Locked network and versions

- GenLayer Studionet only: chain `61999`, RPC `https://studio.genlayer.com/api`, explorer `https://explorer-studio.genlayer.com`.
- GenLayer CLI `0.39.1`; GenLayerJS `1.1.8`.
- Never configure chain `61997` or a preview network.

## Local commands

Install the pinned JavaScript and Python test dependencies, then run:

```powershell
npm ci
py -3.13 -m pip install -r requirements-test.txt
npx playwright install chromium
npm run cli:local-version
npm run network:check
npm run check
npm run test:e2e
npm audit
```

The Direct Mode test dependency requires Python 3.12 or newer. On Windows, use the Python launcher with a compatible version as shown above.

`npm run check` runs typecheck, lint, source tests, Python policy and mutation tests, Direct Mode contract tests, and the static production build. `npm run test:e2e` covers browser routes, responsiveness, wallet selection and accessibility in test configurations. Mock-wallet checks do not establish live wallet behavior; current live evidence and pending checks are called out in the validation record.

## Configuration

Production is configured with `NEXT_PUBLIC_ENTREW_CONTRACT_ADDRESS=0xf37C3D7992833A876Bb2933c09b11bD49FC817ca`, chain ID `61999`, and RPC `https://studio.genlayer.com/api`. The contract address is public configuration, not a secret. Static export writes to `out/`; verify direct reload of query-ID routes when making a frontend release.

See [deployment evidence](docs/DEPLOYMENT.md), [security limits](docs/SECURITY.md), and [test results](docs/TEST_RESULTS.md).
