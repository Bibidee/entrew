# Architecture

## Trust path

The browser uses a read-only GenLayerJS client against the pinned Studionet RPC for public contract state. An injected EIP-1193 MetaMask or Rabby provider signs writes. The provider account must be on chain 61999 at signing time. The contract contains all authoritative records; the browser stores submitted transaction hashes and small recovery metadata only.

The single `EntrewRegistry` contract publishes immutable program terms, creates one wallet/program entry, records immutable revision snapshots, and evaluates the current snapshot. During evaluation, the leader and each validator independently fetch the same fixed GitHub repository, commit, marker, and mapped file paths, then run substantive per-criterion review. Validators compare the stable provenance/fingerprint/vector projection. Explanations are not consensus-critical. The contract stores a product outcome only after `run_nondet_unsafe` returns a consensus result.

`QUALIFIED` requires every criterion `MET`, revision-bound evidence, and a checked claim marker. `NOT_ESTABLISHED` requires a reliable provenance mismatch or at least one substantive `NOT_MET`. Other incomplete, unavailable, or conflicting evidence is `INCONCLUSIVE`. Protocol `UNDETERMINED` does not become an application outcome. Only a final successful execution plus an exact finalized readback can produce a success state in the app.

## Source retrieval limits

Repository URLs are built internally from validated GitHub owner/repository segments, a full 40-character SHA, and allowlisted relative paths. No caller URL, token, arbitrary host, source-code execution, or link following is used. The marker binds the program, applicant wallet, repository, and nonce; the commit SHA is separately bound by the GitHub commit endpoint. The marker cannot safely include the hash of the commit that contains it.

Each submission is capped at three evidence paths, 12,000 decoded characters per file, and 24,000 combined decoded characters. API response bodies are capped at 20,000 characters. Public indexes use append-only counters with individually stored IDs, and each read caps pages at 25. No full source body is stored in contract state.

## Frontend routes

`/` is the paged public program explorer; `/program?ref=` shows immutable terms and paged records; `/publish` publishes terms; `/apply?program=` creates a first entry; `/evidence?entry=` shows revisions and decision anatomy; `/workspace` shows wallet-scoped records; `/activity` reconciles saved transaction hashes. The route pages are static exports and query parameters select the requested record.

## Why GenLayer

The core question depends on inspecting bounded source evidence against a human-authored rubric. A conventional deterministic contract cannot fetch and semantically assess that source by itself. GenLayer's nondeterministic execution allows validators to independently reproduce retrieval and substantive judgments, while the contract deterministically verifies the result structure, evidence bindings, retry limits, deadlines, and roster writes. The model cannot set an outcome unilaterally.

## Engineering references

- [GenLayer nondeterminism documentation](https://docs.genlayer.com/developers/intelligent-contracts/features/non-determinism)
- [GenLayer Direct Mode testing documentation](https://docs.genlayer.com/developers/intelligent-contracts/testing)
- [GenLayerJS 1.1.8 package README](https://www.npmjs.com/package/genlayer-js/v/1.1.8)

ENTREW uses an original cobalt/cream Evidence Atlas interface and an independently defined evidence registry. These references document the platform APIs and testing model; they are not implementation sources.
