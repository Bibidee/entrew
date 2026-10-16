# Semantic benchmark corpus

`cases.json` is a 40-case fixed fixture set spanning clear qualification, clear negative evidence, genuine uncertainty/provider failure, and adversarial or identity/missing-source cases. Every row includes the frozen two-criterion rubric, synthetic exact revision, file contents or provider response, expected criterion vector, expected provenance, expected product policy, and a rationale.

This corpus was authored after the first evaluator prompt existed, so it is **not a held-out benchmark** and has not been used to claim semantic accuracy. It is suitable for deterministic policy and fixture plumbing checks only. Actual GenLayer multi-validator scoring, false-qualification/nonqualification rates, unresolved cases, and disagreements remain unmeasured until an isolated blind corpus and live validator run are available.
