# Exact-release checklist — status updated 2026-10-16

Check boxes only reflect observed work. Open items are listed explicitly.

## Phase 0: scope and research

- [x] Inspect the supplied handoff and repository source.
- [x] Record implementation decisions and unresolved design questions in the repository.
- [x] Keep ENTREW in its own repository, separate from other products.

## Phase 1: engineering

- [x] One backendless Next.js + TypeScript app and one contract.
- [x] Source and contract policy align on URLs, digest, deadline, outcome precedence and finality.
- [x] Local CLI `0.39.1`; only Studionet `61999`.
- [x] Wallet selection, public finalized reads and canonical readback implemented.
- [x] Direct Mode, source policy, browser tests and dependency audit run in CI.
- [x] `npm ci` from committed lockfile succeeds.
- [x] CI workflow passed: [run 38894822355](https://github.com/Bibidee/entrew/actions/runs/38894822355).
- [ ] Complete adversarial, property and held-out semantic coverage.

## Phase 2: safety hardening

- [x] No arbitrary web fetch; exact GitHub evidence binding.
- [x] Closed criterion vectors and fail-closed outcome aggregation.
- [x] Bounded retries and replay protections implemented in source and Direct Mode.
- [x] No organizer adjudication, admin outcome setter, or nonzero payable product value.
- [x] Roster is derived from canonical finalized contract records.
- [ ] Live-test retry, replay, authorization and deadline boundaries.
- [ ] Measure prompt injection and validator disagreement with independent cases.

## Phase 3: Studionet deployment

- [x] Freeze contract source commit and compute SHA-256.
- [x] Deploy exact source to Studionet `61999` with local CLI `0.39.1`.
- [x] Observe finality; capture transaction and address.
- [x] Compare deployed code readback with tracked source hash.
- [x] Configure the live address in Vercel production and redeploy.
- [x] Verify production app reads canonical Studionet state.

## Phase 4: real lifecycles and browsers

- [x] Real positive lifecycle finalized as QUALIFIED with every criterion MET and roster inclusion.
- [x] Real negative lifecycle finalized as NOT_ESTABLISHED, with a NOT_MET criterion and no roster inclusion.
- [x] Test against a separate public fixture repo with authorized marker writes.
- [x] Brave production evidence route displayed live records; focused axe audit reported zero violations.
- [x] Responsive overflow assertions passed at 320/375/390/768/1280/1440 px.
- [ ] Complete responsive route sweep without intermittent RPC fetch failure; conduct manual mobile and keyboard-only review.
- [ ] Real MetaMask/Rabby wallet UI boundaries, corrected revision, inconclusive retries, replay and authorization controls.

## Phase 5: release record

- [x] Record actual source SHA, commit, chain, tx, address, CI, Vercel URL and lifecycle results in `docs/DEPLOYMENT.md`.
- [x] Distinguish historical deployment attempts from the current deployment.
- [x] Active-source scan found no alternate chain reference `61997`.
- [x] Report validator receipt cancellation after quorum and all remaining test gaps.
- [ ] Independently scan the latest production JS bundle for stale addresses.
- [ ] Complete the full hostile audit and held-out semantic benchmark.

**Status:** the requested deployment, production configuration and real positive/negative lifecycle are complete. Broader adversarial and semantic release coverage remains incomplete. Do not treat checked lifecycle items as evidence for pending cases.
