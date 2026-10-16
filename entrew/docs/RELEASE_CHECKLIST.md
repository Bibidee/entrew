# Exact-release checklist — do not mark checked until observed

## Phase 0: scope and research

- [ ] Inspect this entire handoff, supplied Patchbound example, official GenLayer docs and exact pinned tool versions.
- [ ] Resolve only ambiguities in `docs/OPEN_DESIGN_QUESTIONS.md`, document choices before code freeze, do not broaden product.
- [ ] Create a real clean ENTREW repository, not inside Vowmark or Accordant.

## Phase 1: engineering

- [ ] One backendless Next.js + TypeScript app / one contract.
- [ ] Source and contract policy align (URLs, digest, deadline, outcome precedence).
- [ ] Local CLI `0.39.1`; only Studionet `61999`.
- [ ] Strong wallet selection and public finalized read client.
- [ ] Robust canonical transaction readback and recovery.
- [ ] Full Direct Mode/semantic fixtures and UI tests.
- [ ] Run typecheck, lint, unit, browser, accessibility, static build and dependency audit.
- [ ] Actual `npm ci` from committed lockfile succeeds.
- [ ] Dependency issues resolved or precisely disclosed.
- [ ] Required CI workflows protected on default branch where permissions allow.

## Phase 2: safety hardening

- [ ] No arbitrary web fetch; exact GitHub evidence binding.
- [ ] Attacker-origin prompt instructions ignored; validator independently re-evaluates.
- [ ] All criterion vectors complete and exact; mismatch fails closed.
- [ ] Missing/429/5xx/incomplete/oversize evidence doesn't falsely qualify.
- [ ] Conclusive result replay impossible; bounded inconclusive retries.
- [ ] One entry per wallet per program; no multi-wallet person-uniqueness claim.
- [ ] No organizer adjudication or admin outcome setters.
- [ ] No escrow or non-zero payable user value in product.
- [ ] Roster strictly derived from finalized canonical records.

## Phase 3: Studionet deployment

- [ ] Freeze contract commit and compute SHA-256.
- [ ] Deploy exact source to 61999 with repo-local 0.39.1.
- [ ] Observe finality and successful execution; capture tx/address.
- [ ] Perform independent source readback/attestation if supported. Report any tooling limit explicitly.
- [ ] Configure actual address before Vercel release.
- [ ] Run full checks AGAINST final production config.
- [ ] Contract change after deployment triggers redeploy/reverification.

## Phase 4: real lifecycles and browsers

- [ ] Distinct organizer/applicant real wallet lifecycle on 61999.
- [ ] Real positive (qualify + roster) and negative (no qualification) proofs.
- [ ] Real corrected revision and inconclusive/retry scenarios where feasible.
- [ ] Real adversarial authorization and replay proofs where safe.
- [ ] Production UI checked on actual host at desktop and narrow mobile sizes.
- [ ] Real MetaMask and Rabby boundaries tested or clearly disclosed.
- [ ] Refresh, deep-link recovery and exact hash reconciliation tested.
- [ ] Browser console no critical errors; no mocked provider in production.

## Phase 5: release record

- [ ] `docs/DEPLOYMENT.md` actual source SHA, commit, chain, tx, address, tests, URL, browser results.
- [ ] Docs don't mix historical and current deployments.
- [ ] Git working tree clean; exact HEAD CI green.
- [ ] No secrets committed; no alternative network references in active config.
- [ ] Final hostile independent audit done; limitations reported without downplaying.

**Never check boxes based on a prompt or planned test.**
