#!/usr/bin/env python3
"""Score only captured outputs from an actual evaluator; mocked results are rejected."""
import argparse, collections, hashlib, json, re, sys
from pathlib import Path

CASES = Path(__file__).with_name("cases.json")
GOLD = Path(__file__).with_name("answer-key.json")
MANIFEST = Path(__file__).with_name("manifest.json")
OUTCOMES = {"QUALIFIED", "NOT_ESTABLISHED", "INCONCLUSIVE"}
ACTUAL = {"genlayer_live_consensus", "independent_actual_model"}

def read(path):
    return json.loads(path.read_text(encoding="utf-8"))

def validate_corpus():
    cases, gold, manifest = read(CASES), read(GOLD), read(MANIFEST)
    ids = [x["case_id"] for x in cases]
    gold_ids = [x["case_id"] for x in gold]
    if len(cases) != 40 or len(set(ids)) != 40 or set(ids) != set(gold_ids) or len(gold_ids) != 40:
        raise ValueError("expected 40 unique inputs and a matching answer key")
    input_sha = hashlib.sha256(CASES.read_bytes()).hexdigest()
    if manifest.get("input_sha256") != input_sha:
        raise ValueError("held-out evaluator inputs do not match the frozen manifest digest")
    comparison = manifest.get("comparison_baseline", {})
    baseline_path = CASES.parents[2] / comparison.get("path", "")
    if not baseline_path.is_file() or hashlib.sha256(baseline_path.read_bytes()).hexdigest() != comparison.get("sha256"):
        raise ValueError("post-prompt comparison corpus does not match the manifest digest")
    baseline = read(baseline_path)
    def case_spec(case):
        revision = case.get("revision", {})
        return json.dumps({
            "rubric": case.get("rubric"),
            "evidence_paths": case.get("evidence_paths", revision.get("evidence_paths")),
            "evidence_mappings": case.get("evidence_mappings", revision.get("evidence_mappings")),
        }, sort_keys=True, separators=(",", ":"))
    id_overlap = len(set(ids) & {x["case_id"] for x in baseline})
    spec_overlap = len({case_spec(x) for x in cases} & {case_spec(x) for x in baseline})
    if id_overlap != comparison.get("case_id_overlap") or spec_overlap != comparison.get("rubric_path_mapping_overlap") or id_overlap or spec_overlap:
        raise ValueError("held-out inputs overlap the post-prompt case IDs or rubric/path/mapping specifications")
    groups = collections.Counter(x["group"] for x in gold)
    if groups != {"qualified": 10, "negative": 10, "inconclusive": 10, "adversarial": 10}:
        raise ValueError(f"unexpected held-out group counts: {dict(groups)}")
    for case in cases:
        if any(k in case for k in ("group", "expected_outcome", "rationale", "expected_criteria")):
            raise ValueError(f"answer-key data leaked into input: {case['case_id']}")
        if len(case["rubric"]) != 2 or len(case["evidence_paths"]) > 3:
            raise ValueError(f"invalid rubric or evidence bound: {case['case_id']}")
        if set(case["evidence_paths"]) != set(case["evidence"]):
            raise ValueError(f"evidence paths do not match contents: {case['case_id']}")
        for index in ("0", "1"):
            paths = case["evidence_mappings"].get(index, [])
            if not paths or any(p not in case["evidence_paths"] for p in paths):
                raise ValueError(f"unbound criterion mapping: {case['case_id']}:{index}")
    return cases, gold, manifest

def score(run):
    _, gold_rows, manifest = validate_corpus()
    meta = run.get("run", {})
    kind = meta.get("evaluator_kind")
    if kind not in ACTUAL or "mock" in str(kind).lower():
        raise ValueError("refusing mocked or unspecified evaluator outputs")
    if not meta.get("evaluator_name") or not meta.get("evaluator_version"):
        raise ValueError("evaluator name/version are required")
    outputs = run.get("outputs")
    if not isinstance(outputs, list):
        raise ValueError("run.outputs must be an array")
    observed = {}
    for row in outputs:
        case_id = row.get("case_id")
        if case_id in observed:
            raise ValueError(f"duplicate output for {case_id}")
        if row.get("canonical_outcome") not in OUTCOMES:
            raise ValueError(f"invalid outcome for {case_id}")
        votes = row.get("validator_outcomes", [])
        if not isinstance(votes, list) or any(v not in OUTCOMES for v in votes):
            raise ValueError(f"invalid validator outcomes for {case_id}")
        observed[case_id] = row
    gold_by_id = {x["case_id"]: x for x in gold_rows}
    if any(k not in gold_by_id for k in observed):
        raise ValueError("unknown case id in run")
    if kind == "genlayer_live_consensus":
        if meta.get("chain_id") != 61999:
            raise ValueError("GenLayer run is not pinned to Studionet 61999")
        if meta.get("contract_source_sha256") != manifest["target_contract_source_sha256"]:
            raise ValueError("deployed source hash does not match reviewed bytes")
        if not re.fullmatch(r"0x[0-9a-fA-F]{40}", str(meta.get("contract_address", ""))):
            raise ValueError("live contract address missing or malformed")
        for case_id, row in observed.items():
            if row.get("finality") != "FINALIZED" or not re.fullmatch(r"0x[0-9a-fA-F]{64}", str(row.get("transaction_hash", ""))):
                raise ValueError(f"missing finalized transaction proof: {case_id}")
    else:
        for case_id, row in observed.items():
            if not row.get("request_id") or not row.get("response_sha256"):
                raise ValueError(f"missing actual evaluator trace: {case_id}")
    rows = [(gold_by_id[k], value) for k, value in observed.items()]
    n = len(rows)
    correct = sum(g["expected_outcome"] == o["canonical_outcome"] for g, o in rows)
    false_qual = sum(o["canonical_outcome"] == "QUALIFIED" and g["expected_outcome"] != "QUALIFIED" for g, o in rows)
    false_reject = sum(o["canonical_outcome"] == "NOT_ESTABLISHED" and g["expected_outcome"] != "NOT_ESTABLISHED" for g, o in rows)
    nonqualified = sum(g["expected_outcome"] != "QUALIFIED" for g, _ in rows)
    nonnegative = sum(g["expected_outcome"] != "NOT_ESTABLISHED" for g, _ in rows)
    inconclusive = sum(o["canonical_outcome"] == "INCONCLUSIVE" for _, o in rows)
    votes = [o["validator_outcomes"] for _, o in rows if len(o["validator_outcomes"]) >= 2]
    disagreements = sum(len(set(v)) > 1 for v in votes)
    per_group = {}
    for group in ("qualified", "negative", "inconclusive", "adversarial"):
        subset = [(g, o) for g, o in rows if g["group"] == group]
        per_group[group] = {
            "evaluated": len(subset),
            "correct": sum(g["expected_outcome"] == o["canonical_outcome"] for g, o in subset),
            "inconclusive": sum(o["canonical_outcome"] == "INCONCLUSIVE" for _, o in subset),
        }
    return {
        "evaluator": {"kind": kind, "name": meta["evaluator_name"], "version": meta["evaluator_version"]},
        "evaluated": n, "unevaluated": 40 - n,
        "false_qualification": {"count": false_qual, "denominator": nonqualified, "rate": false_qual/nonqualified if nonqualified else None},
        "false_rejection": {"count": false_reject, "denominator": nonnegative, "rate": false_reject/nonnegative if nonnegative else None},
        "inconclusive": {"count": inconclusive, "denominator": n, "rate": inconclusive/n if n else None},
        "accuracy": {"correct": correct, "denominator": n, "rate": correct/n if n else None},
        "validator_disagreement": {
            "disagreeing_cases": disagreements, "denominator": len(votes),
            "rate": disagreements/len(votes) if votes else None,
            "note": "Null rate means no individual live validator votes were captured."
        },
        "by_group": per_group
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--validate-corpus", action="store_true")
    parser.add_argument("run", nargs="?")
    args = parser.parse_args()
    try:
        if args.validate_corpus:
            cases, gold, _ = validate_corpus()
            print(json.dumps({"input_cases": len(cases), "groups": dict(collections.Counter(x["group"] for x in gold)), "semantic_evaluation": "NOT_RUN"}, indent=2))
        elif args.run:
            print(json.dumps(score(read(Path(args.run))), indent=2))
        else:
            parser.error("use --validate-corpus or pass actual evaluator results JSON")
    except (ValueError, KeyError, OSError, json.JSONDecodeError) as error:
        print(f"benchmark error: {error}", file=sys.stderr)
        raise SystemExit(2)

if __name__ == "__main__":
    main()
