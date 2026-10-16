# ENTREW — verified-test requirement matrix

This document is a **plan**. None of these cases has yet been executed. Record actual commands, fixture IDs and results only after implementation.

## A. Contract/Direct Mode

A01 publish valid 2-criterion program; A02 publish valid 3-criterion program; A03 reject <2/>3; A04 reject vague/incomplete structural rubric; A05 reject missing or expired deadline; A06 reject malformed lengths; A07 freeze rubric/title/deadline; A08 organizer cannot override verdict; A09 non-organizer cannot edit program; A10 publish rejected if accidental payable value; A11 organizer/read indexes paginate 0/1/25/26/121 records; A12 idempotence/sparse indexes under concurrent inserts.

B01 valid entry, exact repo/SHA claim; B02 reject malformed repo, `.`/`..` and illegal host; B03 reject 39/41 SHA; B04 reject evidence paths traversal/encoded traversal; B05 reject >3 files; B06 reject empty/duplicate paths; B07 reject mappings to nonexistent criterion; B08 missing/wrong claim marker; B09 repo same-looking fork vs declared owner; B10 another wallet cannot create revision for entry; B11 one entry per wallet/program; B12 enforce deadline; B13 canonical normalized digest parity with UI; B14 reject ordering-only replay; B15 distinct SHA opens revision without altering previous; B16 max 4 revisions enforced; B17 qualified entry cannot be revised; B18 wrong program evidence rejected.

C01 every criterion MET -> QUALIFIED; C02 required NOT_MET -> NOT_ESTABLISHED; C03 one UNVERIFIABLE, others MET -> INCONCLUSIVE; C04 NOT_MET + UNVERIFIABLE -> policy precedence; C05 GitHub 403/429/5xx -> INCONCLUSIVE; C06 missing/invalid API body safe; C07 inconsistent GitHub repo/commit -> nonqualified; C08 valid source but false claim marker -> not qualified; C09 oversized UTF8 input -> fail closed; C10 binary source -> inconclusive; C11 prompt injection inside README/source; C12 leader/validator independent contradictory outcomes; C13 semantic ambiguity golden fixture; C14 parser extra keys; C15 duplicate JSON keys; C16 missing criterion; C17 duplicate index; C18 nonsensical status; C19 nonsemantic wording difference doesn't cause false divergence; C20 materially differing evidence prevents success; C21 one conclusive revision cannot be reassessed; C22 inconclusive retry after cooldown; C23 no retry before cooldown; C24 at most two same-snapshot retry; C25 expiry blocks review; C26 protocol UNDETERMINED not stored as app INCONCLUSIVE; C27 source authenticity metadata vs verified signature separated; C28 no unbounded fetch; C29 no arbitrary redirects/secondary URLs; C30 strict replay after filename order changes; C31 permissionless reads unaffected by wallet.

## B. UI logic and browser

D01 public Explorer no wallet; D02 program true count/offset pages; D03 filter disclosure of current-page vs global; D04 publish frozen preview; D05 sign rejection; D06 MetaMask; D07 Rabby with multiple providers; D08 app disconnect truthfulness; D09 switch/add 61999; D10 account changes invalidate stale data; D11 provisional ACCEPTED not FINALIZED; D12 FINALIZED-but-failed not success; D13 finalized-but-unverified not success; D14 canonical digest readback; D15 duplicate click; D16 reconciliation on reload/hash; D17 monitor timeout no rebroadcast; D18 historical address activity isolation; D19 concurrent page append/count race; D20 out-of-order RPC responses; D21 mobile evidence studio; D22 keyboard-only composition; D23 axe and contrast; D24 narrow viewport no overflow; D25 no mocked data in production; D26 disabled action state and aria-live errors; D27 no stale data across wallet/provider change; D28 deep-link reload on production host.

## C. Live Studionet 61999 (after deployment)

L01 deploy exact built source, record SHA/tx/address/finality; L02 canonical read contract and network; L03 organizer wallet publishes program; L04 applicant distinct wallet files legitimate revision; L05 same applicant triggers semantic assessment -> QUALIFIED with every MET; L06 qualified roster contains exact entry after finalized readback; L07 a provably missing criterion -> NOT_ESTABLISHED without roster entry; L08 corrected new SHA -> QUALIFIED before deadline; L09 unavailable evidence -> INCONCLUSIVE (controlled valid fixture if possible, not induced false network failure); L10 inconclusive retry boundary and cooldown; L11 unauthorized wallet cannot mutate another entry; L12 replay blocked; L13 wrong-network UX actual wallet; L14 refreshing production app restores records; L15 actual desktop/mobile browser QA; L16 no second network/deprecated deployment in production bundle.

## D. Semantic benchmark

Create a held-out, independently authored test corpus **before tuning prompts**: >=10 straightforward qualified, >=10 straightforward not established, >=10 genuine uncertainty, >=10 adversarial/injection/missing-source cases. For each case store fixed rubric, repo/revision/file fixture, expected criterion vector, expected provenance and policy explanation. Measure false qualification, false nonqualification, inconclusive and consensus disagreement rates. Report counts and examples, not invented confidence or fixed unrealistic 100% goals. Never use final fixtures to tune without creating new holdouts.

## E. Mutation and property tests

Kill mutations to program-owner checks, frozen rubric, deadline, role checks, revision binding, result aggregation, replay keys, evidence size, retry counts, finality guard, canonical readback and roster idempotence. Demonstrate real mutation execution and disclose surviving mutants/tooling limits. Property tests for duplicate prevention and pagination invariants across large sparse inserts.

## Evidence quality categories

`AUTOMATED-PASSED`, `LIVE-PROVEN`, `MANUALLY-PROVEN`, `TOOLING-LIMITED`, `PENDING`, `FAILED`. Every claimed outcome must link to precise test run, transaction or browser log. CI can validate sources but cannot substitute for actual live validator judgments.
