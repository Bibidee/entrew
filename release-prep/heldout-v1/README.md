# Held-out semantic benchmark v1

This 40-case corpus was authored independently of `tests/benchmark/cases.json` and its post-prompt fixtures. It contains 10 clear qualifications, 10 affirmative negatives, 10 evidence-limited cases, and 10 adversarial cases across different software behaviors. Evaluator inputs contain only IDs, rubrics, mappings, and bounded evidence. Groups, expected outcomes, criterion labels, and rationales are stored in a separate answer key. The frozen input SHA-256 is recorded in `manifest.json`; corpus validation also confirms zero case-ID overlap and zero exact rubric/path/mapping overlap against the post-prompt cases.

## Execution status

Structure validation is complete. Semantic evaluation is **NOT RUN (0/40)**. No actual independent model endpoint is configured in this environment. GenLayer's target evaluator runs inside nondeterministic contract execution, which requires deployment and assessment transactions. Those transactions remain unauthorized. Direct Mode and mocked LLM outputs are rejected by `score.py`.

No false-qualification, false-rejection, inconclusive, accuracy, or validator-disagreement rate has been measured. The gold labels were authored for this corpus but have not received blind independent human adjudication. These synthetic inputs are not GitHub commits and are not live evidence.

## Run protocol

1. Freeze the evaluator-input digest before evaluation and keep the answer key sealed.
2. Capture actual outputs only from the exact reviewed source. For GenLayer, record chain 61999, contract address, source SHA-256, finalized transaction hash and canonical result per case.
3. Use `python score.py <captured-run.json>`; the scorer rejects mocked outputs, wrong source/network, unknown cases, and missing live transaction/finality evidence.
4. Include individual validator outcomes only when the network exposes them. The disagreement metric remains null without those independent votes.
