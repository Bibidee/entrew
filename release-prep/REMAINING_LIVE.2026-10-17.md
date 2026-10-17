# Corrected-contract live continuation — 2026-10-17

**Verdict: NOT SUBMISSION READY.** This record continues PR #6 on the corrected contract. It preserves the historical deployment, Vercel production configuration, and prior evidence. No deployment, Vercel change, or merge was performed.

## Exact source and network preflight

| Item | Verified value |
| --- | --- |
| Contract | `0xB1DA4Ab4FfAa5Fc543A628f190B2A52EaC54b592` |
| Network | Studionet `61999` / `0xf22f` |
| RPC | `https://studio.genlayer.com/api` |
| Contract SHA-256 | `b81379bfa8b1b438381647c91c611999e55440d1edab6c0176d9e52fc2c4a5d8` |
| Contract Git blob | `ec4b5bd4aa453b73987d732986191670b580ab98` |
| Repository-local GenLayer CLI | `0.39.1` |

`npm run network:check` passed: it found no active `61997` reference and the RPC returned `0xf22f`. The read-only positive verifier also passed against this source and contract, including finalized deployment/program/entry/review transactions, source bytes, GitHub provenance, canonical state, and roster membership.

## Completed live evidence

The positive lifecycle remains verified as `QUALIFIED`: entry `e1`, revision `e1:r1`, attempt `a1`, criteria `[MET, MET]`, `REVISION_BOUND`, and a qualified roster containing `e1` exactly once. Its read-only verification record is [`POSITIVE_LIVE.2026-10-17.md`](./POSITIVE_LIVE.2026-10-17.md).

The separate negative fixture was submitted and assessed before the stop condition:

| Action | Finalized transaction |
| --- | --- |
| Submit `e2:r1` | `0x47ef2e25eff1d72972f8e13b827260d8293ce48caade19aaafc0a61e59a8e150` |
| Assess `e2:r1` | `0xf9d0e14b32ffc497ff22e4bc3dce9c13dea8485d84797b490726cf85fafbb8d2` |

Canonical state after the assessment was `NOT_ESTABLISHED`, with one revision and `qualified=false`. Attempt `a2` had criteria `[NOT_MET, MET]`, provenance `REVISION_BOUND`, issue `NONE`, and source fingerprints for both mapped files. The fixture is commit `ca805a648674a5732bf12cb95449d0ea104e7d77` on the authorized `entrew-urlfix-fixtures-2026-10-16` branch. Its marker binds `p1`, the assigned applicant wallet, and fresh nonce `620ad1ab92ed02b9b8e1db17e0c4c8af`.

## Required stop: corrected-revision baseline

The initial corrected-revision fixture was immutable commit `cd20f659978b1729d5d9d9a09af26f870e6bb6d3`, with tree `56eb1b68f47572f11e6c07e93c09e6a7b7d14a52`, marker blob `dc0eeb6a2cc7db4b2092fa7ab6552016a0dc791d`, program `p1`, the assigned fresh applicant wallet, and nonce `ffd466cc2be5472190985520803a06bb`.

| Action | Finalized transaction |
| --- | --- |
| Submit `e3:r1` | `0x393fe1402d70b3e2d54170cc125d19e8e842a8354767057d658155cbc0ff9f47` |
| Assess `e3:r1` | `0x4fd890f6cb9fa0d6c04da20cf19a7585cfa84a4851565182bd9c44f5740ba5d8` |

The assessment finalized successfully but its canonical result was **`INCONCLUSIVE`**, not the expected `NOT_ESTABLISHED`. Attempt `a3` recorded both criteria as `UNVERIFIABLE`, no source-file fingerprints, provenance `PROVIDER_UNAVAILABLE`, and issue `GITHUB_403_AMBIGUOUS`.

This was the first explicit stop condition. The later controlled `e4` run below independently reproduced it, after which no further semantic lifecycle write was attempted.

After the result, authenticated read-only GitHub API checks successfully resolved the exact repository, commit, marker, source, and documentation paths for `cd20f659978b1729d5d9d9a09af26f870e6bb6d3`. This shows the fixture remains publicly retrievable now; it does not prove the validator-side 403 was absent when `a3` executed. A later read-only SDK collection hit the public Studio RPC rate limit (`30` calls/minute, retry after `16` seconds), so no additional polling was used to mask the recorded lifecycle outcome.

## Controlled root-path corrected lifecycle

To distinguish a malformed nested path from validator-side provider availability, an authorized
fresh applicant used a root-path fixture. The baseline was public commit
`d9d2f03c4dc19e3c5ec1834740f6dcf79ab0b985`, with fresh nonce
`47dc2003463a40deb205c855eaf1dcb4`; its test passed and its assessment was conclusive:

| Action | Finalized transaction | Canonical result |
| --- | --- | --- |
| Submit `e4:r1` | `0xbe89734e5536a622e254df257266df154e9c9e9801d6f8ef3db8f7dcbdfc66fe` | `PENDING` before assessment |
| Assess `e4:r1` | `0xb051629d55c6379821091e9c2f8be39ebfba94b2cca2568151b434bd207f9315` | `NOT_ESTABLISHED`, `REVISION_BOUND`, `[NOT_MET, MET]` |

The immutable correction is public commit `ab00ee0992ef9b007a37db543ac975eaaf1d74c9`,
tree `a5d28c080ee67a0d3ca754c52debde4efdca08b9`, marker blob
`f0e42e1c0bfa08871ab0ea0a97703489d8d1f5b8`, source blob
`e191c9337791a311b79c888a926991b14fa8c927`, documentation blob
`d4ca1f2306e053880d4d081fe38ac91650ddbe03`, and fresh nonce
`907f9bb401724c6a803d56da84c8d2ce`. The fixture test passed, and authenticated
GitHub API lookups returned the exact commit, tree, marker, and source objects.

The SDK console did not retain the submit transaction ID after the write, although canonical
state proves `e4:r2` was submitted at `1792195830` with the exact above binding. This is an
evidence gap and is not treated as a substitute for a recoverable transaction hash. Its
assessment is finalized as
`0xf338ebc3022d64d1bb65cd0db7b40e6360c1e3db62e660c1bd2e9a0fc8b879b8`.
Canonical readback records attempt `a5` as `INCONCLUSIVE`, with both criteria
`UNVERIFIABLE`, `PROVIDER_UNAVAILABLE`, and `GITHUB_403_AMBIGUOUS`. The transaction
consensus record has three agreeing validators and two validators that became idle after quorum.

The fixture is publicly reachable from the local authenticated GitHub API, but that does not
establish what a validator-side GitHub request experienced. This second failure occurred with
root paths and a shorter request plan, so it rules out the original repository trailing-slash
defect and does not support a conclusion that the fixture is malformed. Per the stop rule, no
unavailable-evidence, cooldown/retry, replay, cross-applicant, terminal-restriction, or deadline
write was sent after `a5`.

The PR contains one minimal, **undeployed** mitigation: a per-review cache for immutable Git
tree objects. It preserves every commit/tree/blob check and only avoids repeated fetches of the
same tree SHA within one review. Its dedicated regression test proves a shared tree is fetched
once. It changes the candidate source hash and must receive separate deployment authorization.

## Strict verifier and benchmark

The full strict lifecycle verifier is intentionally not reported as passing. Its required matrix includes a conclusive corrected `r1`, corrected `r2`, unavailable-evidence, and unauthorized-control record; the required corrected `r1` result was not achieved. Its regression suite passes and proves that incomplete matrices are rejected before a live RPC request and that a provider outage is diagnosed before marker-hash comparison.

The held-out benchmark corpus validated structurally: 40 inputs, with 10 each in the qualified, negative, inconclusive, and adversarial groups. It has zero case-ID and rubric/path/mapping overlap with the earlier corpus. Actual independent evaluation is `0/40`: the manifest declares `NOT_CONFIGURED`, live scoring `NOT_RUN`, and validator disagreement `NOT_AVAILABLE`. False qualification, false rejection, inconclusive rate, and accuracy are therefore not measured.

## Isolated frontend verification

No `.env` file or Vercel setting changed. `NEXT_PUBLIC_ENTREW_CONTRACT_ADDRESS` was supplied only to local browser/build processes.

Two confirmed test-flow defects were corrected:

1. Program, application, and evidence routes briefly attempted a read before URL query parameters had initialized. The UI now remains in its loading state until parameters are available.
2. The browser suite mixed unconfigured assertions with configured-contract runs. It now runs those modes separately and, for the live contract, exercises the existing bounded `Retry read` recovery control.

The full unconfigured Playwright suite passed `10`, with `2` configured-only checks skipped. The full configured suite passed `8`, with `4` unconfigured-only checks skipped. It covered desktop and mobile Chromium, six viewport widths, automated accessibility checks, the corrected contract's finalized `p1` program/detail flow, and wallet selection/network switching. Browser-to-RPC reads were intermittently unavailable during the configured run; the mobile live-contract check recovered through `Retry read` and passed in `41.7` seconds.

## Verification completed in this continuation

- `npm run check`: passed typecheck, lint, contract surface `5/5`, release-prep `9/9`, policy `19/19`, mutations `4/4`, Direct Mode `29/29`, and production build after the cache correction.
- `npm run audit --omit=dev`: `0` production vulnerabilities.
- `npm run network:check`: passed: no active `61997` reference and the RPC returned `0xf22f` (`61999`).
- Positive live verifier: passed as recorded above.

The latest unconfigured Playwright rerun completed its first two public-route checks, skipped
the configured-only check, then did not yield a complete runner summary while starting the
responsive and accessibility checks. It is therefore not counted as a fresh passing browser run.
The earlier recorded browser results remain historical evidence only; browser verification must
be rerun to a complete summary before release.

## Remaining blockers and approvals

1. Resolve and independently diagnose the validator-side GitHub provider failure that produced `GITHUB_403_AMBIGUOUS` for both `a3` and `a5`.
2. Obtain explicit authorization for a new semantic lifecycle attempt only after that provider condition is resolved. A new corrected fixture must use a fresh immutable commit and nonce.
3. Complete the remaining corrected, unavailable-evidence, cooldown/retry, replay, unauthorized-control, and deadline matrix; then run the full strict verifier against the resulting final canonical state.
4. Configure an independently attested evaluator and conduct a blind adjudication before claiming benchmark accuracy or error rates.
5. Obtain and retain a recoverable finalized transaction hash for every lifecycle write, including a replacement corrected submission.
6. Rerun the browser suite to a complete summary, then complete real extension wallet interaction and a hosted non-production frontend smoke test.
7. Vercel production configuration/redeployment and PR merge still require explicit approval.

Read-only attestation, finality polling, canonical reads, local tests, benchmark structure checks, and isolated frontend checks can be automated. Any new lifecycle write requires the designated unlocked test wallet; production wallet prompts require the user in the wallet UI.
