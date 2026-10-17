import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const contract = readFileSync(new URL("contracts/entrew_registry.py", root), "utf8");
const genlayer = readFileSync(new URL("lib/genlayer.ts", root), "utf8");
const network = readFileSync(new URL("lib/network.ts", root), "utf8");

test("the only write surface has no outcome override", () => {
  const writes = [...contract.matchAll(/@gl\.public\.write\s+def\s+(\w+)/g)].map((match) => match[1]);
  assert.deepEqual(writes, ["publish_program", "submit_entry", "submit_revision", "evaluate_revision"]);
  assert.doesNotMatch(contract, /@gl\.public\.write\.payable|set_(?:outcome|result|qualified)|override_(?:outcome|result)|admin_review/i);
});

test("validator execution independently rebuilds evidence and compares stable fields", () => {
  assert.match(contract, /gl\.vm\.run_nondet_unsafe\(leader_fn, validator_fn\)/);
  const validatorBody = contract.slice(contract.indexOf("def validator_fn"), contract.indexOf("consensus_result ="));
  assert.match(validatorBody, /independently_reviewed\s*=\s*_review_snapshot/);
  assert.match(validatorBody, /_consensus_projection\(leader_review\)\s*==\s*_consensus_projection\(independently_reviewed\)/);
  assert.match(contract, /gl\.nondet\.web\.get\(url, headers=GITHUB_HEADERS\)/);
  assert.match(contract, /gl\.nondet\.exec_prompt\(prompt,\s*response_format="json"\)/);
});

test("only fixed GitHub API URLs and bounded evidence paths are accepted", () => {
  assert.match(contract, /GITHUB_API\s*=\s*"https:\/\/api\.github\.com"/);
  assert.match(contract, /_canonical_path/);
  assert.match(contract, /if any\(char in path for char in \(.+"%"/);
  assert.doesNotMatch(contract, /gl\.nondet\.web\.(?:get|request)\(user_?url/);
  assert.match(contract, /MAX_RESPONSE_CHARS\s*=\s*20000/);
  assert.match(contract, /MAX_TOTAL_CHARS\s*=\s*24000/);
  assert.match(contract, /MAX_PATH_SEGMENTS\s*=\s*8/);
  assert.match(contract, /git\/commits\//);
  assert.match(contract, /git\/trees\//);
  assert.match(contract, /def _git_tree_blob_binding/);
});

test("paged indexes read at most 25 individual index keys", () => {
  assert.match(contract, /MAX_PAGE\s*=\s*25/);
  assert.match(contract, /def _index_count\(self, key\)/);
  assert.match(contract, /def _index_at\(self, key, offset\)/);
  assert.match(contract, /end = min\(self\._index_count\(index_key\), start \+ size\)/);
  assert.doesNotMatch(contract, /_strict_json\(self\.indexes\.get\(key, "\[\]"\)\)/);
});

test("the frontend requires finalized execution and canonical readback", () => {
  assert.match(genlayer, /TransactionHashVariant\.LATEST_FINAL/);
  assert.doesNotMatch(genlayer, /stateStatus/);
  assert.match(genlayer, /status:\s*TransactionStatus\.FINALIZED/);
  assert.match(genlayer, /execution !== ExecutionResult\.FINISHED_WITH_RETURN/);
  assert.match(genlayer, /const canonical = await args\.canonicalReadback\(\)/);
  assert.match(network, /id:\s*61999/);
  assert.match(network, /https:\/\/studio\.genlayer\.com\/api/);
  assert.doesNotMatch(network, /61997|studioDevnet|preview/i);
});

