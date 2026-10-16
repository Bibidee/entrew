# ENTREW — verified-test requirement matrix

This is the V1 requirement matrix. A test passing a subset does not mark an entire row or lifecycle complete. Execution evidence is summarized at the end and detailed in `../../docs/TEST_RESULTS.md`.

The historical `LIVE-PROVEN` deployment and fixture rows below apply to the prior deployed source. The current remediation changes the contract and remains undeployed; local Direct Mode passes are not live Studionet evidence for it.

## A. Contract/Direct Mode

A01 publish valid 2-criterion program; A02 publish valid 3-criterion program; A03 reject <2/>3; A04 reject vague/incomplete structural rubric; A05 reject missing or expired deadline; A06 reject malformed lengths; A07 freeze rubric/title/deadline; A08 organizer cannot override verdict; A09 non-organizer cannot edit program; A10 publish rejected if accidental payable value; A11 organizer/read indexes paginate 0/1/25/26/121 records; A12 idempotence/sparse indexes under concurrent inserts.

B01 valid entry, exact repo/SHA claim; B02 reject malformed repo, `.`/`..` and illegal host; B03 reject 39/41 SHA; B04 reject evidence paths traversal/encoded traversal; B05 reject >3 files; B06 reject empty/duplicate paths; B07 reject mappings to nonexistent criterion; B08 missing/wrong claim marker; B09 repo same-looking fork vs declared owner; B10 another wallet cannot create revision for entry; B11 one entry per wallet/program; B12 enforce deadline; B13 canonical normalized digest parity with UI; B14 reject ordering-only replay; B15 distinct SHA opens revision without altering previous; B16 max 4 revisions enforced; B17 qualified entry cannot be revised; B18 wrong program evidence rejected.

C01 every criterion MET -> QUALIFIED; C02 required NOT_MET -> NOT_ESTABLISHED; C03 one UNVERIFIABLE, others MET -> INCONCLUSIVE; C04 NOT_MET + UNVERIFIABLE -> policy precedence; C05 GitHub 403/429/5xx -> INCONCLUSIVE; C06 missing/invalid API body safe; C07 inconsistent GitHub repo/commit -> nonqualified; C08 valid source but false claim marker -> not qualified; C09 oversized UTF8 input -> fail closed; C10 binary source -> inconclusive; C11 prompt injection inside README/source; C12 leader/validator independent contradictory outcomes; C13 semantic ambiguity golden fixture; C14 parser extra keys; C15 duplicate JSON keys; C16 missing criterion; C17 duplicate index; C18 nonsensical status; C19 nonsemantic wording difference doesn't cause false divergence; C20 materially differing evidence prevents success; C21 one conclusive revision cannot be reassessed; C22 inconclusive retry after cooldown; C23 no retry before cooldown; C24 at most two same-snapshot retry; C25 expiry blocks review; C26 protocol UNDETERMINED not stored as app INCONCLUSIVE; C27 source authenticity metadata vs verified signature separated; C28 no unbounded fetch; C29 no arbitrary redirects/secondary URLs; C30 strict replay after filename order changes; C31 permissionless reads unaffected by wallet.

## B. UI logic and browser

D01 public Explorer no wallet; D02 program true count/offset pages; D03 filter disclosure of current-page vs global; D04 publish frozen preview; D05 sign rejection; D06 MetaMask; D07 Rabby with multiple providers; D08 app disconnect truthfulness; D09 switch/add 61999; D10 account changes invalidate stale data; D11 provisional ACCEPTED not FINALIZED; D12 FINALIZED-but-failed not success; D13 finalized-but-unverified not success; D14 canonical digest readback; D15 duplicate click; D16 reconciliation on reload/hash; D17 monitor timeout no rebroadcast; D18 historical address activity isolation; D19 concurrent page append/count race; D20 out-of-order RPC responses; D21 mobile evidence studio; D22 keyboard-only composition; D23 axe and contrast; D24 narrow viewport no overflow; D25 no mocked data in production; D26 disabled action state and aria-live errors; D27 no stale data across wallet/provider change; D28 deep-link reload on production host.

## C. Live Studionet 61999

L01 deploy exact built source, record SHA/tx/address/finality; L02 canonical read contract and network; L03 organizer wallet publishes program; L04 applicant distinct wallet files legitimate revision; L05 same applicant triggers semantic assessment -> QUALIFIED with every MET; L06 qualified roster contains exact entry after finalized readback; L07 a provably missing criterion -> NOT_ESTABLISHED without roster entry; L08 corrected new SHA -> QUALIFIED before deadline; L09 unavailable evidence -> INCONCLUSIVE (controlled valid fixture if possible, not induced false network failure); L10 inconclusive retry boundary and cooldown; L11 unauthorized wallet cannot mutate another entry; L12 replay blocked; L13 wrong-network UX actual wallet; L14 refreshing production app restores records; L15 actual desktop/mobile browser QA; L16 no second network/deprecated deployment in production bundle.

## D. Semantic benchmark

Create a held-out, independently authored test corpus **before tuning prompts**: >=10 straightforward qualified, >=10 straightforward not established, >=10 genuine uncertainty, >=10 adversarial/injection/missing-source cases. For each case store fixed rubric, repo/revision/file fixture, expected criterion vector, expected provenance and policy explanation. Measure false qualification, false nonqualification, inconclusive and consensus disagreement rates. Report counts and examples, not invented confidence or fixed unrealistic 100% goals. Never use final fixtures to tune without creating new holdouts.

## E. Mutation and property tests

Kill mutations to program-owner checks, frozen rubric, deadline, role checks, revision binding, result aggregation, replay keys, evidence size, retry counts, finality guard, canonical readback and roster idempotence. Demonstrate real mutation execution and disclose surviving mutants/tooling limits. Property tests for duplicate prevention and pagination invariants across large sparse inserts.

## Evidence quality categories

`AUTOMATED-PASSED`, `LIVE-PROVEN`, `MANUALLY-PROVEN`, `TOOLING-LIMITED`, `PENDING`, `FAILED`. Every claimed outcome links to a precise test run, transaction or browser observation. CI cannot substitute for live validator judgments.

## Historical production execution status — 2026-10-16

### AUTOMATED-PASSED

- GitHub Actions [run 38894822355](https://github.com/Bibidee/entrew/actions/runs/38894822355) passed the PR #4 workflow: CLI/network checks, type/lint, Node and Python suites, Direct Mode, Playwright, build and dependency audit.
- Python policy/fixture policy: 13 passed. GenVM Direct Mode: 7 passed. These suites cover subsets of sections A, B, C and E, not every listed case.
- Focused evidence query-route E2E and axe: 1 passed. The final production evidence route axe audit reported zero violations.
- The 40-case fixture corpus is not a held-out semantic benchmark and does not measure live evaluator accuracy.

### LIVE-PROVEN

- L01–L02: deployment `0xf37C3D7992833A876Bb2933c09b11bD49FC817ca`, tx `0x743047241ae5eed661a0d887b8885b18402b42fa3b5bb6f91b02b51c2f656127`; finalized majority agreement, canonical `get_info`, chain ID `61999`, and `getContractCode` SHA-256 match to tracked source.
- L03: program `p1` publish tx `0xd6e7d5400d57a7e6babefc08d87d1ef47a3ae2357d73c0e2ac159714c5d18e22`, finalized.
- L04–L06: positive submit `0xb40732b8881c45aceebf238b048f7a0c05ec467d809de20c10e08050812fda2a` and assessment `0x1e660ab0ff7a885f42ce0677a70e6d776debd63f9354bd260fe3c8a8708ba79e`; finalized `QUALIFIED`, `[MET, MET]`, revision-bound provenance, entry `e1` in canonical roster.
- L07: negative submit `0x7169872045f7d094d03cdc7d03e80b5f03870daf266b45a06f58627c9572c7f2` and assessment `0x44feb87f02a28d923894c7b6bf1da4cd0afa4b0890a8974f3a1e123c8f77eca8`; SDK finality and canonical reads confirmed `NOT_ESTABLISHED`, `[NOT_MET, MET]`, revision-bound provenance, entry `e2` absent from roster.
- Two public GitHub fixture markers were written to [Bibidee/entrew-fixtures](https://github.com/Bibidee/entrew-fixtures), a repo separate from the product repo. The user authorized these test writes.

### MANUALLY-PROVEN

- Latest Vercel production deployment [dpl_8Y5SPk1HZ5KHPreZzSXLUDGVrS4A](https://vercel.com/bibidees-projects/the-entrew/8Y5SPk1HZ5KHPreZzSXLUDGVrS4A) is `READY` and aliased to [https://the-entrew.vercel.app](https://the-entrew.vercel.app); production contract address and Studionet settings are configured.
- Brave displayed the live evidence record with e1/e2 canonical outcomes. Evidence detail navigation/reload succeeded; no console errors were observed.

### TOOLING-LIMITED / PARTIAL

- L14: production refresh and query-ID evidence route were manually checked; the complete multi-route recovery matrix is not.
- L15, D24, D28: no-overflow assertions passed at 320/375/390/768/1280/1440 px. A later repeated route read intermittently failed on RPC `Failed to fetch`. Headless production responsive sweep is therefore partially proven, not a clean end-to-end pass; full manual mobile/keyboard review remains open.
- L16: active-source contamination check found no `61997`; the final post-accessibility deployment's complete JS bundle has not been independently scanned for stale addresses.
- Deployment and negative-assessment validator receipts reported cancellation/error after consensus quorum was reached. SDK finality and canonical reads confirmed the expected state; record this receipt detail when interpreting them.

### PENDING

- L08–L13: corrected revision, controlled unavailable-evidence result and cooldown, live authorization/replay checks, and actual wrong-network wallet behavior.
- Broader D cases: full MetaMask/Rabby wallet UI, keyboard-only flows, provider/account races, retry/recovery boundaries, and duplicate-click behavior.
- Full adversarial prompt, live validator-divergence, held-out semantic benchmark, broad mutation/property suites, and complete A–E coverage.

See `../../docs/TEST_RESULTS.md` and `../../docs/DEPLOYMENT.md` for full hashes, canonical results and receipt details. Never change a pending case to `LIVE-PROVEN` based on Direct Mode or mocked browser fixtures.

## Earlier remediation branch execution status — historical

Branch `audit/full-remediation` is based on `d81ad944a6a89e5713b7f1ca6c224b80e8e56769`. The following results apply to its earlier contract snapshot `d64552d38cbd244b647060f1c045550e2a484237`, not to the consolidated release candidate:

- `npm ci`: passed, 525 packages, 0 install-time vulnerabilities.
- `py -3.13 -m pip install -r requirements-test.txt`: passed; Python 3.11 does not satisfy `genlayer-test==0.29.2`.
- CLI/network: passed with CLI `0.39.1`, RPC chain `61999`, no active-source `61997` or preview-network contamination.
- `npm run check`: passed: Node 5, policy 15, mutation 4, Direct Mode 16; typecheck, lint and production build also passed.
- `npm run test:e2e`: 10/10 passed across desktop/mobile projects; seven routes and six viewport widths, route axe scans, and keyboard wallet-modal test.
- `npm audit`: 0 vulnerabilities.
- GitHub Actions [run 38915365843](https://github.com/Bibidee/entrew/actions/runs/38915365843) passed the PR workflow on the tested branch head.

The added Direct Mode regressions reproduce both raw-fallback trust failures: a malformed/mismatched raw marker cannot reject when repository identity is unverified, and raw marker/evidence cannot qualify when the exact commit is unverified. Malformed API evidence also remains inconclusive when raw bytes are available. The raw fallback is disabled. These results are not `LIVE-PROVEN`. All L01–L16 live checks for the modified source remain pending until authorized deployment and controlled wallet actions are completed. The held-out semantic benchmark remains pending until an independent evaluator can run without broadcasting transactions.


## PR #6 baseline adversarial pass — historical

The starting PR #6 head `f33b7d991e1b8c8c05c06e73e6de27c46a0eab5f` had contract source SHA-256 `1429e3134d49ff20b00f233c98f3783a8580dc5b7cc280de8f7e70da13e010e8`; Git blob ID `f6f7c7e9c72814cb82497f3b7a3c6639de7503d3`. The raw fallback bypass was confirmed and removed. Four Direct Mode regressions cover raw mismatch rejection without verified repo identity, raw positive qualification without verified commit identity, raw evidence against a mismatched commit SHA, and malformed API evidence with no raw recovery. Full local check passed (Node 5, policy 15, mutations 4, Direct Mode 17, build); Playwright passed 10/10; dependency audit passed with 0 vulnerabilities; CLI `0.39.1` and RPC chain `61999` were confirmed. GitHub Actions [run 38919608432](https://github.com/Bibidee/entrew/actions/runs/38919608432) passed on fix commit `274d6935c9e8f14c2e955d5e6fa4d1cc5ab71342`. This is not submission readiness: held-out semantic scoring (0/40 independently evaluated), changed-source deployment/source attestation, live positive/negative and wallet controls, and production Vercel/browser QA remain blocked. See `../../docs/DEPLOYMENT_TEST_PLAN.md`.

## Consolidated release candidate — not deployed

The candidate contract source SHA-256 is `cac38f9d2a607446b071aecfe7e00ed0be96c2b31dd4ea9f9633477295e1b45e`; Git blob ID `8348ba2282fc062e9fe32e488245d536bd138334`. It adds exact GitHub Contents path/blob/tree binding, accepts only GitHub LF/CRLF base64 wrapping, and uses `TransactionHashVariant.LATEST_FINAL` for browser canonical reads. The read-only release verifier now binds finalized transaction calldata and deployment bytes to the selected wallets, contract, methods and canonical arguments. Fresh checks passed: Node 5/5, release-prep 7/7, policy 17/17, mutations 4/4, Direct Mode 28/28, production build, and exported-build Playwright 10/10. Its exact-source deployment, source attestation, live lifecycle evidence, real-wallet browser QA, and held-out semantic evaluation remain pending. GitHub Actions must validate the committed candidate before it is treated as CI evidence.
