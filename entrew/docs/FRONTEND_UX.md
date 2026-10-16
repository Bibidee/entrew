# The Evidence Atlas — original ENTREW frontend system

ENTREW should feel like a premium research product used to assemble and interpret public proof. It must not copy Vowmark's black/neon/angular register, Accordant's lemon paper/board aesthetics, RedLine's coverage UI, or Patchbound's developer escrow workspace.

## Visual system

Working name: **ENTREW**; wordmark `entrew.` in tightly kerned humanist sans, use dot as a minor brand cue, not a copied icon.
- Cobalt blue: `#3454F5` (primary actions, selected state, focus).
- Warm cream: `#FFF6E8` (light canvas).
- Coral: `#FF775C` (attention accent, not used alone for errors).
- Midnight ink: `#1A2342` (type, high-contrast panels).
- Cool ivory: `#FFFFFF` (evidence cards); surface divider `#DDE1EA`.
- Success: `#207759`; unresolved: `#865DBA`; warning: `#AE6525`; failure: `#B83E4B`, all with semantic text/icons.
Use generous whitespace, high-quality variable sans typography (licensed/available fonts only), lightweight editorial headings, thoughtful motion (respects reduced-motion) and differentiated information density. Avoid generic Web3 graphs, fake stats or decorative token prices.

## Screens

### `/` — Program Explorer
- Wide editorial hero: "Find the programs your work qualifies for."
- Search/filter: status, deadline, source requirement; filters on *canonical paginated program data*; do not pretend local filter searches unseen pages. Provide accessible serverless pagination/restart if search is current-page only; label precisely.
- Cards show name, exact 2–3 criteria, organizer short address, deadline and verifiable status, no invented applicant count or fake live activity.
- Visible educational "How independent review works" section accessible without jargon.

### `/program?ref=ID` — Program Profile
- Fixed rubric presented as readable criteria with exact success definitions, closed UTC deadline, version/terms digest.
- Public qualified roster and full applicant history are separate views; `NOT_ESTABLISHED` applicants not mislabeled.
- Organizer wallet has no verdict controls; link to Explorer.

### `/publish` — Program Composer
- Three steps: define program -> compose 2–3 assessable criteria -> review immutable summary/sign.
- Validation at field-level, accessible descriptions, testability checklist and irreversible publish preview.
- State unchanged until actual tx finalized and canonical program readback.

### `/apply?program=ID` — Evidence Studio
- Desktop split: fixed rubric on left; revision/file evidence composer on right; compact trust status in persistent header.
- Mobile uses tabbed accessible Criteria/Evidence/Review segments with persistent back/continue action.
- Gather canonical `owner/repo`, full 40-char SHA, at most 3 commit-addressed file paths and claim marker. Show exact marker text requirements without suggesting the app can edit GitHub.
- Map each criterion to selected evidence file(s). Highlight unmet evidence mappings, oversize warnings, wrong chain and deadline.
- Review panel shows **exact immutable payload**, evidence digest, deadline and fees vs no application deposit. Distinguish wallet signature from finality.

### `/evidence?entry=ID` — Decision Anatomy
- Criterion-by-criterion plain-language explanation with `MET`, `NOT_MET`, `UNVERIFIABLE`; separate overall result.
- Evidence source identity: GitHub repo, full SHA, files, read provenance, bounded content digest and semantic coverage, all expandable.
- Side-by-side audit timeline: Filed -> assessment submitted -> provisional accepted -> finalized -> canonical state verified. Unknown and failed states separated.
- Inconclusive retry button only when contract permits; no duplicate re-request after conclusive result.

### `/workspace` — Wallet Workspace
- Organizer publications and applicant entries in clearly distinct tabs; no fake identity or cross-wallet mixing.
- Paginated latest-first pages, counts sourced on chain. Clear no-programs and no-applications empty states.

### `/activity` — Local Recovery
- Stores only hash, selected wallet, network ID, contract address, action, local timestamp, anticipated item identity and optional digest.
- Refresh/reconcile by hash; distinguish legacy deployments and receipt-not-found; never infer canonical result from a cached phase.

## Wallet UX

- User explicitly chooses MetaMask or Rabby if more than one injected provider exists; don't blindly use whichever overwrote `window.ethereum`.
- `Connect wallet`, `Switch to Studionet`, `Disconnect from Entrew` with explanation that provider permission may remain; no false wallet revocation claim.
- Account changes immediately invalidate stale private views and pending action context.
- Support wallet rejection, wrong chain, provider disconnect, add/switch failure, and multiple open tabs.

## Quality bar

- Keyboard-only completion of every form, AA-intent contrast, labeled errors/aria-live state, reduced-motion, focus order, disabled states; automated axe check plus manual review.
- No horizontal scrolling at 320px, 375px, 390px and 768px; verify 1280px and 1440px too.
- Accessible responsive data tables (or card adaptation) for criteria and history.
- No CSS clipping of critical transaction hashes, results or buttons.
- No fake percentages/success claims, fabricated programs, dummy hashes or misleading "verified" labels.
