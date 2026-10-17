# Held-out semantic benchmark v1

This 40-case corpus was authored independently of `tests/benchmark/cases.json` and its post-prompt fixtures. It contains 10 clear qualifications, 10 affirmative negatives, 10 evidence-limited cases, and 10 adversarial cases across different software behaviors. Evaluator inputs contain only IDs, rubrics, mappings, and bounded evidence. Groups, expected outcomes, criterion labels, and rationales are stored in a separate answer key. The frozen input SHA-256 is recorded in `manifest.json`; corpus validation also confirms zero case-ID overlap and zero exact rubric/path/mapping overlap against the post-prompt cases.

## Execution status

Structure validation is complete. Semantic evaluation is **NOT RUN (0/40)**. No actual independent model endpoint is configured in this environment. GenLayer's target evaluator runs inside nondeterministic contract execution, which requires deployment and assessment transactions. Those transactions remain unauthorized. `score.py` rejects incomplete captures, malformed responses, response/outcome/vote mismatches, and unbound response digests. It cannot authenticate provider identity or prove non-mocked origin from a local JSON file.

No false-qualification, false-rejection, inconclusive, accuracy, or validator-disagreement rate has been measured. The gold labels were authored for this corpus but have not received blind independent human adjudication. These synthetic inputs are not GitHub commits and are not live evidence.

## Run protocol

1. Freeze the evaluator-input digest before evaluation and keep the answer key sealed.
2. Capture actual outputs only from the exact reviewed source. For GenLayer, record chain 61999, contract address, source SHA-256, finalized transaction hash and canonical result per case.
3. Use `python score.py <captured-run.json>`; the scorer accepts only a complete 40-case capture whose run and per-case input digests match the frozen corpus. Each bounded response must be JSON containing the same case ID, canonical outcome, and validator outcomes as the row that records it; the response bytes and SHA-256 digest are both checked. GenLayer runs also require canonical-readback data, finalized transaction hashes and a live-verifier report digest.
4. Include individual validator outcomes only when the network exposes them. The disagreement metric remains null without those independent votes.

The offline scorer can validate that a capture is complete and internally bound to the frozen inputs. It cannot authenticate an arbitrary external provider from a local JSON file. Its external-model results are labeled as structurally bound but not independently attested; recheck any provider records before treating their metrics as release evidence.
