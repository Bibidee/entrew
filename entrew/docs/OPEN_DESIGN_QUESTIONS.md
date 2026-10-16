# Decisions to settle during implementation preflight (no user-facing rebrand or broad redesign)

These are bounded unresolved matters. Choose the simplest safe policy, document it before coding, test it, and raise any decision that fundamentally changes V1 product semantics.

1. **GitHub signature evidence**. Signed commits are optional in V1 for accessibility. Make `revision-bound verified` and `cryptographically signed` clearly separate. If runtime cannot independently verify signature metadata, never claim such verification.
2. **Claim marker format**. `.entrew/claim.json` must bind program, wallet, repository and random nonce, and be read at exact SHA. Do not require SHA to appear in that same file (self-referential hash problem). Research whether this threat model is sufficient and document limitations.
3. **Contract vs explorer deadline**. Establish whether cutoff uses receipt inclusion time or execution time per pinned runtime, and test exact boundary. Never rely on browser wall time.
4. **Missing claim or file**. Distinguish reliable, authenticated absence from provider outage. Freeze a deterministic product policy (`NOT_ESTABLISHED` for proven mismatch, `INCONCLUSIVE` for uncertainty) with fixtures.
5. **Inconclusive retry limit**. Proposed 2 extra retries with 10-minute cooldown; tune only based on actual availability/gas tests and abuse potential. Don't remove bounded liveness recovery.
6. **Public readability vs large evidence payloads**. Prefer on-chain bounded metadata and cryptographic content digests; decide which minimal snippets/explanations to persist without leaking secrets. Avoid huge unbounded storage and UI fetches.
7. **GitHub API auth**. No server secret or hidden backend. If unauthenticated rate limiting makes V1 unusable, report a blocker rather than silently installing a centralized proxy.
8. **Stable SDK behavior**. Confirm `genlayer-js 1.1.8` finalized reads/receipts and CLI 0.39.1 APIs in actual installed toolchain. Follow exact verified SDK semantics, not copied guesses from newer docs.
9. **App Router static export/deep links**. Confirm real reloads work at host for query-based routes; if static export breaks required UX, choose an equally backendless rendering mode with no authoritative server logic and document the choice.
10. **The size limit**. Proposed 3 files, <=12k chars each, <=24k total; tighten if actual GenVM resources, available web-fetch bounds or validator reliability demand it.
11. **Qualification semantics and repeats**. One application per wallet per program; qualification terminal. Document inability to stop many-wallet duplicates, and how deadline affects in-flight review.
12. **Naming clearance**. Entrew is the approved working name. Trademark/domain/social availability has not been verified; do not claim exclusive name rights.
