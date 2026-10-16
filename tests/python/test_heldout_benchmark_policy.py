"""Regression checks for the held-out benchmark capture boundary."""

import hashlib
import importlib.util
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCORE_PATH = ROOT / "release-prep" / "heldout-v1" / "score.py"
SPEC = importlib.util.spec_from_file_location("entrew_heldout_score", SCORE_PATH)
SCORE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(SCORE)


def complete_capture():
    cases, gold, manifest = SCORE.validate_corpus()
    gold_by_id = {row["case_id"]: row for row in gold}
    outputs = []
    for case in cases:
        response = SCORE.canonical_json({
            "case_id": case["case_id"],
            "canonical_outcome": gold_by_id[case["case_id"]]["expected_outcome"],
            "validator_outcomes": [],
        })
        outputs.append({
            "case_id": case["case_id"],
            "case_input_sha256": SCORE.digest_json(case),
            "canonical_outcome": gold_by_id[case["case_id"]]["expected_outcome"],
            "validator_outcomes": [],
            "request_id": "test-capture-" + case["case_id"],
            "captured_response": response,
            "response_sha256": hashlib.sha256(response.encode("utf-8")).hexdigest(),
        })
    return {
        "run": {
            "evaluator_kind": "independent_actual_model",
            "evaluator_name": "capture-boundary-test",
            "evaluator_version": "test-only",
            "input_sha256": manifest["input_sha256"],
            "capture_kind": "recorded-provider-response",
        },
        "outputs": outputs,
    }


class HeldoutBenchmarkCaptureTests(unittest.TestCase):
    def test_complete_corpus_bound_capture_scores_all_cases(self):
        result = SCORE.score(complete_capture())
        self.assertEqual(result["evaluated"], 40)
        self.assertEqual(result["unevaluated"], 0)
        self.assertEqual(result["accuracy"], {"correct": 40, "denominator": 40, "rate": 1.0})
        self.assertIn("not independently attested", result["evidence_status"])

    def test_partial_or_digest_mismatched_capture_is_rejected(self):
        partial = complete_capture()
        partial["outputs"] = partial["outputs"][:-1]
        with self.assertRaisesRegex(ValueError, "exactly one output"):
            SCORE.score(partial)

        mismatched = complete_capture()
        mismatched["outputs"][0]["response_sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "response digest mismatch"):
            SCORE.score(mismatched)

        contradictory = complete_capture()
        case_id = contradictory["outputs"][0]["case_id"]
        response = SCORE.canonical_json({
            "case_id": case_id,
            "canonical_outcome": "INCONCLUSIVE",
            "validator_outcomes": [],
        })
        contradictory["outputs"][0]["captured_response"] = response
        contradictory["outputs"][0]["response_sha256"] = hashlib.sha256(response.encode("utf-8")).hexdigest()
        with self.assertRaisesRegex(ValueError, "captured response outcome mismatch"):
            SCORE.score(contradictory)


if __name__ == "__main__":
    unittest.main(verbosity=2)
