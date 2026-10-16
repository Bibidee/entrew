# Canonical program, entry, revision and transaction state machines

## Program

`PUBLISHED_OPEN` -> `DEADLINE_PASSED` (time-derived for UI; no trusted background cron) -> immutable archival display.

Do not provide organizer delete, change-deadline or change-rubric methods. If a program is erroneous, organizer can publish a new corrected program, with public link to predecessor as non-authoritative metadata. Deadline check occurs inside every relevant write even if UI clock differs.

## Entry

`NONE` -> `ENTRY_FILED` on successful finalized signed entry submission.

Each revision independently progresses:
- `REVISION_FILED` -> assessment transaction submitted (client-only transaction phase) -> finalized `QUALIFIED`, `NOT_ESTABLISHED` or `INCONCLUSIVE`.
- `NOT_ESTABLISHED`: applicant can file a **different** SHA/snapshot (within 4 distinct revisions, before program deadline). Old result remains in history.
- `INCONCLUSIVE`: limited same-snapshot reevaluation after 10-minute cooldown, at most two retries, before program deadline; may also file a genuinely new revision, still within quota. Prevent outcome shopping after `NOT_ESTABLISHED` for unchanged snapshot.
- `QUALIFIED`: entry terminal for that program, immutable roster membership exactly once; no organizer or applicant overturn method. Revision and evidence stay publicly inspectable.
- At deadline, further writes fail. Existing `NOT_ESTABLISHED` or `INCONCLUSIVE` remains described accurately; do not turn it into `QUALIFIED` or misstate as a new validator decision. UI can label application `Closed / not qualified` with exact underlying result history.

## Protocol versus product

- `AWAITING_WALLET_APPROVAL`: no signed tx/hash.
- `REJECTED_BY_WALLET`: no transaction created, no on-chain change.
- `SUBMITTED`: hash exists; store for local recovery, no product-result claim.
- `PROPOSING/PROPOSAL_ACCEPTED`: GenLayer consensus progressing, ACCEPTED is provisional.
- `FINALIZING`: protocol accepted but not yet finalized.
- `FINALIZED_UNVERIFIED`: transaction finalized but execution metadata or canonical state unreadable; do not claim success.
- `FINALIZED_EXECUTION_FAILED`: protocol finalized but GenVM execution failed; no successful product action.
- `FINALIZED_EXECUTION_SUCCESS`: not sufficient alone: fetch expected contract state.
- `CANONICAL_CONFIRMED`: exact entry/revision/attempt and expected digest/outcome verified from finalized chain reads.
- `UNDETERMINED` or `CANCELED`: protocol failed to produce completed product state; never store an application `INCONCLUSIVE` as a substitute.
- `MONITORING_STOPPED`: unknown, hash remains recoverable; no automatic duplicate broadcast.

## Inconclusive retry liveness versus replay protection

A replay key cannot simply reject all identical SHAs because a legitimate, transient provider outage may be recovered. Design distinct control:
- Conclusive `(program,entry,canonical_snapshot_digest)` evaluated once.
- Same snapshot allowed **only** for recorded app-level `INCONCLUSIVE`, at most two extra bounded attempts, with cooldown and absolute deadline.
- Submit of same SHA with reordered paths, different non-semantic notes or URL encoding cannot bypass duplicate revision gate.
- Protocol `UNDETERMINED` must be reconciled by hash; do not consume/apply a retry based solely on an uncertain browser receipt.

## Race and readback cases

Double-click review, two-tab simultaneous review, stale program state, stale wallet, changed network, page reload, concurrent new applicants, late review close to deadline, read RPC unavailable after finality, frontend receives an old response after wallet switch, and program deadline reached while the tx is pending must all have explicit tests.
