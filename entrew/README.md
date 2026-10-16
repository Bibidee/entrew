# ENTREW V1 — Full-build specification handoff

**Project status: PRE-BUILD SPECIFICATION. This archive contains no completed application, executable contract, production deployment, test results, or wallet secrets.** It is an implementation handoff, not a claim that the product is built. The accompanying `BUILD_PROMPT.txt` directs a coding agent to build, audit, deploy, and verify it.

## Product

ENTREW is a backendless public program-eligibility application on GenLayer. An organizer publishes a bounded, immutable criteria rubric for a developer program. Applicants submit a fixed GitHub commit with a small evidence set. GenLayer validators independently obtain public source evidence and substantively decide whether the evidence satisfies each published criterion. Deterministic contract rules derive `QUALIFIED`, `NOT_ESTABLISHED`, or `INCONCLUSIVE`; only finally verified qualification is listed on the public qualification roster.

This is **not** a financial escrow system, employment platform, resume generator, general-purpose AI judge, source-code security auditor, originality certifier, or clone of RedLine, Vowmark, Accordant, or Patchbound. It never awards tokens or distributes money.

## Why GenLayer

Whether a specific code/documentation artifact *meaningfully implements a published requirement* is often not deterministically decidable from a hash or API status. Validators independently retrieve canonical evidence, reproduce a bounded criterion-level assessment, and verify consensus-critical outcome fields. Wallets and organizers cannot privately overwrite a finalized result. The API retrieval layer is still dependent on GitHub; decentralized consensus does not make GitHub decentralized.

## Architecture lock

```
Human -> Next.js App Router / TypeScript static frontend
      -> selected injected EIP-1193 wallet (MetaMask or Rabby)
      -> GenLayer Studionet (61999) -> one EntrewRegistry Intelligent Contract
      -> independent GenLayer validator evidence review
      -> finalized contract state -> frontend
```

No application backend, no server signer, no centralized adjudicator, no Vercel function acting as product authority, no Supabase/Firebase/queue/cron/hidden worker. Browser storage may remember transaction hashes, never define canonical status.

## Network lock

- **Only** GenLayer Studionet, chain ID `61999`.
- RPC `https://studio.genlayer.com/api`.
- Explorer `https://explorer-studio.genlayer.com`.
- **Repository-local GenLayer CLI `0.39.1`**, never global, RC, or unrequested alternate network.
- Candidate client baseline from tested reference: `genlayer-js 1.1.8`; verify exact compatibility in the actual build. Do not equate documentation for release-candidate APIs with pinned Studionet.

## Product journey

1. Anyone browses published programs and frozen criteria without connecting a wallet.
2. Organizer signs publication for a program with 2–3 bounded, independently checkable criteria and a future deadline. Published terms are immutable. Organizer cannot set or change outcomes.
3. Applicant selects program and public GitHub owner/repository, immutable 40-character commit SHA, and **up to three actual evidence files** from that revision. The applicant must have a program/wallet/revision-bound claim marker inside that commit. Evidence is mapped to criteria.
4. Applicant signs submission. Contract records canonical identity, immutably bound evidence, revision digest and attempt history. Applicant can explicitly request an assessment while program is open.
5. Validators independently fetch canonical GitHub repository, commit, claim marker and required files; detect unavailable/oversized/untrustworthy sources; apply published rubric to evidence; return per-criterion `MET`, `NOT_MET`, or `UNVERIFIABLE`.
6. Contract derives `QUALIFIED` only if every required criterion is MET and provenance gates pass. `NOT_ESTABLISHED` reflects a demonstrably unmet criterion, not an outage. `INCONCLUSIVE` reflects unresolved evidence/ambiguity.
7. Bounded corrections and/or safe inconclusive retries remain possible before the deadline. No conclusive snapshot can be rejudged through a replay.
8. Finalized, canonical contract readback determines whether an entry appears in the public roster; transaction acceptance alone is not finality.

## Files in handoff

- `PRODUCT_SPEC.md` — scope, rules, roles and frozen rubric.
- `ARCHITECTURE.md` — backendless/frontend/chain boundaries and static routes.
- `CONTRACT_SPEC.md` — required source interfaces, storage and invariants.
- `docs/EVIDENCE_AND_CONSENSUS.md` — source provenance, prompt boundary and equivalence.
- `docs/SECURITY.md` — threat model and mitigations.
- `docs/STATE_MACHINE.md` — transitions and strict outcome precedence.
- `docs/FRONTEND_UX.md` — distinct Evidence Atlas experience and UI acceptance.
- `docs/TEST_MATRIX.md` — functional, adversarial, UI and live proofs.
- `docs/RELEASE_CHECKLIST.md` — exact-head build/deploy/promotion gates.
- `docs/DEPLOYMENT.md` — truthful empty evidence ledger for actual release.
- `docs/ORIGINALITY.md` — explicit differentiation from source/references.
- `docs/OPEN_DESIGN_QUESTIONS.md` — bounded decisions to resolve and test before code freeze.
- `docs/REFERENCES.md` — reviewed repositories and official GenLayer documentation.
- `BUILD_PROMPT.txt` — autonomous engineering execution instructions.
- `HANDOFF_MANIFEST.json` — package contents, file digests and explicit pre-build status.

## Build constraints

- Next.js App Router + TypeScript; preferable static export and query-based IDs, to avoid runtime server functions. Verify actual static build and deep-link handling on target host before selecting export mode.
- One GenLayer Intelligent Contract, tentatively `contracts/entrew_registry.py`.
- A single chain configuration, selected injected wallet, separated finalized public read client and provider-backed write client.
- Small, conservative V1. Public repositories only; organizer programs only; **no payment escrow**.
- Robust pagination, attempt history, duplicate prevention, rate limits, safe failed-source semantics, and exact immutable revision binding.
- Accessibility, mobile, keyboard and responsive requirements are release gates.

## Honest pre-build state

- Deployment: **not started**.
- Contract address: **not assigned**.
- Transaction evidence: **none**.
- GitHub repository for ENTREW: **not created by this handoff**.
- Frontend URL: **not deployed**.
- Actual tests: **not run**.

Do not use these placeholders as proof of implementation. The build prompt instructs a future execution to create real artifacts and verify them. The name ENTREW is a working label; no trademark or domain clearance is claimed.
