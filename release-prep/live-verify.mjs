#!/usr/bin/env node
// Read-only release verifier. It never submits transactions or invokes a wallet.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionHashVariant, TransactionStatus } from "genlayer-js/types";

const HERE = resolve(fileURLToPath(new URL(".", import.meta.url)));
const SOURCE_PATH = resolve(HERE, "../contracts/entrew_registry.py");
const RPC = "https://studio.genlayer.com/api";
const CHAIN_ID = 61999;
const PRODUCTION_ADDRESS = "0xf37C3D7992833A876Bb2933c09b11bD49FC817ca";
const SOURCE_HASH = "4e3239074eec24ccf9328908083a34d012356b698286903e91111a0d9c3e105b";
const STATUS_FINALIZED = TransactionStatus.FINALIZED;
const SUCCESS = String(ExecutionResult.FINISHED_WITH_RETURN);
const client = createClient({ chain: studionet });

function requireValue(value, label) {
  if (value === null || value === undefined || value === "") throw new Error("Missing required config field: " + label);
  return value;
}
function parseRecord(raw, label) {
  if (typeof raw !== "string") throw new Error(label + " returned a non-string record.");
  return JSON.parse(raw);
}
function decodeBase64Strict(value, label) {
  if (typeof value !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error(label + " is not canonical base64.");
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) throw new Error(label + " did not round-trip as canonical base64.");
  return bytes;
}
function stable(value) {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + stable(value[k])).join(",") + "}";
  return JSON.stringify(value);
}
async function rpc(method, params) {
  const response = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(method + " returned HTTP " + response.status);
  const body = await response.json();
  if (body.error) throw new Error(method + " RPC error: " + (body.error.message || "unknown"));
  return body.result;
}
async function read(address, functionName, args = []) {
  return client.readContract({
    address,
    functionName,
    args,
    transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
  });
}
async function finalizedTransaction(hash, shouldSucceed = true) {
  requireValue(hash, "transaction hash");
  let timer;
  try {
    const receipt = await Promise.race([
      client.waitForTransactionReceipt({ hash, status: STATUS_FINALIZED, interval: 5000, retries: 36 }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("finality wait timed out")), 180000); }),
    ]);
    const tx = await client.getTransaction({ hash });
    const status = String(tx?.statusName || tx?.status || "");
    if (!/finalized/i.test(status)) throw new Error(hash + " is not finalized (status " + (status || "unknown") + ").");
    const execution = String(tx?.txExecutionResultName || receipt?.txExecutionResultName || "UNKNOWN");
    const succeeded = execution === SUCCESS;
    if (shouldSucceed && !succeeded) throw new Error(hash + " finalized with unsuccessful execution: " + execution);
    if (!shouldSucceed && succeeded) throw new Error(hash + " unexpectedly succeeded.");
    return { hash, status, execution };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
async function roster(address, programId) {
  const count = Number(await read(address, "get_program_qualified_count", [programId]));
  const ids = [];
  for (let offset = 0; offset < count; offset += 25) {
    const page = parseRecord(await read(address, "get_program_qualified_page", [programId, offset, 25]), "qualified roster");
    ids.push(...page.map(entry => entry.entry_id));
  }
  return ids;
}

const configPath = process.argv[2];
if (!configPath) throw new Error("Usage: node release-prep/live-verify.mjs <filled-run-config.json>");
const config = JSON.parse(await readFile(resolve(configPath), "utf8"));
if (config.chain_id !== CHAIN_ID) throw new Error("Run config must pin Studionet 61999.");
const address = requireValue(config.contract_address, "contract_address");
if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error("Malformed test contract address.");
if (address.toLowerCase() === PRODUCTION_ADDRESS.toLowerCase()) throw new Error("Refusing to inspect the existing production contract as the remediation test target.");
if (config.contract_source_sha256 !== SOURCE_HASH) throw new Error("Run config source hash does not match the reviewed source.");
const localBytes = await readFile(SOURCE_PATH);
const localHash = createHash("sha256").update(localBytes).digest("hex");
if (localHash !== SOURCE_HASH) throw new Error("Local source bytes changed after review: " + localHash);
const deployedBase64 = await rpc("gen_getContractCode", [{ address, status: "finalized" }]);
const deployedBytes = decodeBase64Strict(deployedBase64, "finalized contract source");
if (!deployedBytes.equals(localBytes)) throw new Error("Deployed source bytes differ from the exact reviewed local bytes.");
const deployedHash = createHash("sha256").update(deployedBytes).digest("hex");
if (deployedHash !== SOURCE_HASH) throw new Error("Deployed source mismatch: " + deployedHash);
const info = parseRecord(await read(address, "get_info"), "get_info");
if (info.chain_id !== CHAIN_ID || info.name !== "ENTREW" || info.contract !== "EntrewRegistry") throw new Error("Canonical contract info mismatch.");
const deployment = await finalizedTransaction(config.deployment_tx_hash);
const programId = requireValue(config.program_id, "program_id");
const programPublish = await finalizedTransaction(config.program_publish_tx_hash);
const program = parseRecord(await read(address, "get_program", [programId]), "get_program");
if (program.program_id !== programId) throw new Error("Canonical program id mismatch.");
const caseResults = [];
for (const testCase of config.cases || []) {
  const submission = await finalizedTransaction(testCase.submission_tx_hash);
  const assessment = await finalizedTransaction(testCase.assessment_tx_hash);
  const revision = parseRecord(await read(address, "get_revision", [testCase.revision_id]), "get_revision");
  const review = parseRecord(await read(address, "get_review", [testCase.attempt_id]), "get_review");
  const statuses = review.criteria.map(row => row.status);
  const expectedRepository = requireValue(testCase.expected_repository, testCase.case_id + ".expected_repository");
  const expectedCommit = requireValue(testCase.expected_commit_sha, testCase.case_id + ".expected_commit_sha").toLowerCase();
  const expectedWallet = requireValue(testCase.expected_wallet, testCase.case_id + ".expected_wallet").toLowerCase();
  const expectedNonce = requireValue(testCase.expected_nonce, testCase.case_id + ".expected_nonce");
  if (!/^[0-9a-f]{40}$/.test(expectedCommit)) throw new Error(testCase.case_id + " must use a full immutable commit SHA.");
  if (!/^0x[0-9a-f]{40}$/.test(expectedWallet)) throw new Error(testCase.case_id + " applicant wallet must be a full address.");
  if (revision.revision_id !== testCase.revision_id || review.revision_id !== testCase.revision_id) throw new Error(testCase.case_id + " revision binding mismatch.");
  if ((revision.owner + "/" + revision.repo).toLowerCase() !== expectedRepository.toLowerCase() || revision.commit_sha !== expectedCommit) throw new Error(testCase.case_id + " repository/commit binding mismatch.");
  if (revision.applicant.toLowerCase() !== expectedWallet || revision.program_id !== programId || revision.claim_nonce !== expectedNonce) throw new Error(testCase.case_id + " wallet/program/nonce binding mismatch.");
  if (review.repo.toLowerCase() !== expectedRepository.toLowerCase() || review.commit_sha !== expectedCommit) throw new Error(testCase.case_id + " review source binding mismatch.");
  if (testCase.expected_marker_sha256 && review.marker_sha256 !== testCase.expected_marker_sha256.toLowerCase()) throw new Error(testCase.case_id + " marker hash mismatch.");
  if (Array.isArray(testCase.expected_files)) {
    const actualFiles = new Map(review.files.map(file => [file.path, file]));
    for (const expectedFile of testCase.expected_files) {
      const actualFile = actualFiles.get(expectedFile.path);
      if (!actualFile || actualFile.classification !== expectedFile.classification || actualFile.sha256 !== expectedFile.sha256) {
        throw new Error(testCase.case_id + " source fingerprint mismatch at " + expectedFile.path);
      }
    }
  }
  if (review.outcome !== testCase.expected_outcome) throw new Error(testCase.case_id + " outcome mismatch: " + review.outcome);
  if (review.provenance !== testCase.expected_provenance || review.issue_code !== testCase.expected_issue_code) throw new Error(testCase.case_id + " provenance/issue mismatch.");
  if (stable(statuses) !== stable(testCase.expected_criteria_statuses)) throw new Error(testCase.case_id + " criterion vector mismatch: " + stable(statuses));
  if (testCase.assert_current_revision) {
    const entry = parseRecord(await read(address, "get_entry", [testCase.entry_id]), "get_entry");
    if (entry.current_revision !== testCase.revision_id || entry.current_result !== testCase.expected_outcome) throw new Error(testCase.case_id + " current entry readback mismatch.");
  }
  caseResults.push({ case_id: testCase.case_id, submission, assessment, outcome: review.outcome, provenance: review.provenance, issue_code: review.issue_code, criteria: statuses });
}
const actualRoster = await roster(address, programId);
const expectedRoster = [...(config.expected_qualified_entry_ids || [])].sort();
if (stable([...actualRoster].sort()) !== stable(expectedRoster)) throw new Error("Canonical qualified roster mismatch.");
let unauthorized = null;
if (config.unauthorized_action) {
  const attack = config.unauthorized_action;
  const attackTx = await finalizedTransaction(attack.transaction_hash, false);
  const after = parseRecord(await read(address, "get_entry", [attack.entry_id]), "unauthorized target entry");
  for (const key of ["current_revision", "current_result", "revision_count", "qualified"]) {
    if (stable(after[key]) !== stable(attack.entry_state_before[key])) throw new Error("Unauthorized action changed " + key + ".");
  }
  unauthorized = { transaction: attackTx, entry_id: attack.entry_id, state_unchanged: true };
}
console.log(JSON.stringify({
  network: { chain_id: CHAIN_ID, rpc: RPC },
  contract: { address, source_sha256: deployedHash, source_status: "FINALIZED" },
  deployment,
  program: { program_id: programId, publish: programPublish, terms_digest: program.terms_digest },
  cases: caseResults,
  qualified_entry_ids: actualRoster,
  unauthorized_action: unauthorized,
}, null, 2));
