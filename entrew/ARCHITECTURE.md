# Architectural lock

```
BROWSER
  - Next.js App Router + TypeScript client pages
  - Program Explorer, Evidence Studio, Decision Anatomy
  - read-only GenLayer client -> Studionet RPC (public finalized reads)
  - EIP-1193 provider selector -> injected MetaMask/Rabby -> Studionet contract writes
  - local-only tx-hash recovery; NO canonical local cache
        |
        v
GENLAYER STUDIONET 61999
  One EntrewRegistry Intelligent Contract
   - deterministic authorization, identity, immutable rubrics, state, indexes
   - nondeterministic evidence retrieval + independent validator review
   - deterministic criterion precedence + membership
        |
        v
Finalized contract reads back to browser
```

## Runtime boundaries

- Only chain: `61999`, RPC `https://studio.genlayer.com/api`.
- Repository-local CLI exact `0.39.1`. Do not switch network to make examples compile.
- Use the pinned GenLayer SDK compatible with this chain (baseline from references: `genlayer-js 1.1.8`; verify with actual tests); explicitly isolate any SDK adapter differences.
- Public read client must not silently route reads to `window.ethereum` on the wrong network. Must use explicit RPC and `FINALIZED` state semantics supported by the pinned client; verify runtime behavior.
- Write client must have explicit injected provider selection, selected account and exact network check, with add/switch guidance and user-rejection handling.
- GenLayer `ACCEPTED` is provisional; `FINALIZED` with execution success is still not proof of product result until specific state readback.
- Do not rebroadcast a known transaction just because monitoring stalled.

## Next.js and hosting

Preferred V1 architecture is a static deployment without server computation. Use App Router client pages and query parameters for dynamic IDs, such as:
- `/` — Program Explorer.
- `/program?ref=<programId>` — published program, criteria, applicants and public roster.
- `/apply?program=<programId>` — Evidence Studio and submission/revision preview.
- `/evidence?entry=<entryId>` — Decision Anatomy and attempt history.
- `/workspace` — wallet's program applications and organizer publications.
- `/activity` — local submitted hashes and canonical recovery.
- `/publish` — organizer's new-program composer.

Do not use dynamic server-rendered `[id]` routes with impossible static params unless fully solved with a verifiable static export strategy. Validate Vercel deep links/reload behavior under the selected output mode.

No Next.js API routes, authoritative Server Actions, server database, operator API, server cron, or backend writes. Deploying static pages to Vercel does not make a backend authoritative.

## Read/write API layering

`lib/network` single immutable chain constants.
`lib/wallet` explicit EIP-1193 injection selection, 6963 discovery if feasible, provider event subscriptions, separate app disconnect semantics.
`lib/genlayer` typed source of truth for reads, writes, receipt classification, finality and canonical checks.
`lib/validation` pure input validation/normalization consistent with contract.
`lib/pagination` bounded count/page functions with wallet + request-generation guards and count/page race handling.
`lib/activity` local recoverable tx hashes, contract identity, chain, signer, operation, proposed canonical payload digest; no local authority.

## One-contract rationale

There is one real authority boundary: published rules, applicant evidence, validator review and qualified roster. Neither a Vault nor a Watcher adds value. A second contract can only be introduced after an evidenced trust boundary requires it and the user approves a scope revision.

## External dependencies

GitHub's public API/raw content is an evidence provider, not an application backend. The contract's allowed GitHub endpoints must be internally constructed from sanitized repository, full commit SHA and permitted evidence paths. GitHub availability/rate limits cause safe uncertainty, not an invented qualified result.
