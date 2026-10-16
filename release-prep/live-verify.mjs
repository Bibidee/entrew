#!/usr/bin/env node
// Read-only release verifier. It never submits transactions or invokes a wallet.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionHashVariant, TransactionStatus } from "genlayer-js/types";
import { bindCallTransaction, bindDeploymentTransaction, transactionCreatedTimestamp } from "./transaction-evidence.mjs";

const HERE = resolve(fileURLToPath(new URL(".", import.meta.url)));
const SOURCE_PATH = resolve(HERE, "../contracts/entrew_registry.py");
const RPC = "https://studio.genlayer.com/api";
const CHAIN_ID = 61999;
const PRODUCTION_ADDRESS = "0xf37C3D7992833A876Bb2933c09b11bD49FC817ca";
const SOURCE_HASH = "cac38f9d2a607446b071aecfe7e00ed0be96c2b31dd4ea9f9633477295e1b45e";
const STATUS_FINALIZED = TransactionStatus.FINALIZED;
const SUCCESS_EXECUTIONS = new Set([String(ExecutionResult.FINISHED_WITH_RETURN), "SUCCESS"]);
const client = createClient({ chain: studionet });
const REQUIRED_CASE_OUTCOMES = Object.freeze({
  positive: "QUALIFIED",
  negative: "NOT_ESTABLISHED",
  "corrected-r1": "NOT_ESTABLISHED",
  "corrected-r2": "QUALIFIED",
  "unavailable-evidence": "INCONCLUSIVE",
});

function requireValue(value, label) {
  if (value === null || value === undefined || value === "") throw new Error("Missing required config field: " + label);
  return value;
}
function requireSha256(value, label) {
  const normalized = requireValue(value, label);
  if (typeof normalized !== "string" || !/^[0-9a-fA-F]{64}$/.test(normalized)) throw new Error(label + " must be a SHA-256 digest.");
  return normalized.toLowerCase();
}
function requireAddress(value, label) {
  const normalized = requireValue(value, label);
  if (typeof normalized !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(normalized)) throw new Error(label + " must be a full wallet address.");
  return normalized.toLowerCase();
}
function requireTxHash(value, label) {
  const normalized = requireValue(value, label);
  if (typeof normalized !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(normalized)) throw new Error(label + " must be a full transaction hash.");
  return normalized;
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
function validateRunMatrix(config) {
  if (!Array.isArray(config.cases)) throw new Error("Run config cases must be an array.");
  const expectedIds = Object.keys(REQUIRED_CASE_OUTCOMES);
  const cases = new Map();
  for (const testCase of config.cases) {
    if (!testCase || typeof testCase !== "object") throw new Error("Each lifecycle case must be an object.");
    const caseId = requireValue(testCase.case_id, "case_id");
    if (!Object.hasOwn(REQUIRED_CASE_OUTCOMES, caseId)) throw new Error("Unexpected lifecycle case: " + caseId);
    if (cases.has(caseId)) throw new Error("Duplicate lifecycle case: " + caseId);
    if (testCase.expected_outcome !== REQUIRED_CASE_OUTCOMES[caseId]) throw new Error(caseId + " has an invalid expected outcome for the required lifecycle matrix.");
    if (typeof testCase.assert_current_revision !== "boolean") throw new Error(caseId + " must explicitly declare assert_current_revision.");
    requireValue(testCase.entry_id, caseId + ".entry_id");
    requireValue(testCase.revision_id, caseId + ".revision_id");
    requireValue(testCase.attempt_id, caseId + ".attempt_id");
    requireTxHash(testCase.submission_tx_hash, caseId + ".submission_tx_hash");
    requireTxHash(testCase.assessment_tx_hash, caseId + ".assessment_tx_hash");
    requireAddress(testCase.expected_wallet, caseId + ".expected_wallet");
    requireValue(testCase.expected_commit_sha, caseId + ".expected_commit_sha");
    requireValue(testCase.expected_nonce, caseId + ".expected_nonce");
    requireValue(testCase.expected_provenance, caseId + ".expected_provenance");
    requireValue(testCase.expected_issue_code, caseId + ".expected_issue_code");
    if (!Array.isArray(testCase.expected_files) || !testCase.expected_files.length) throw new Error(caseId + " must include finalized expected file fingerprints.");
    requireSha256(testCase.expected_marker_sha256, caseId + ".expected_marker_sha256");
    cases.set(caseId, testCase);
  }
  if (cases.size !== expectedIds.length || expectedIds.some(caseId => !cases.has(caseId))) {
    throw new Error("Run config must contain exactly the positive, negative, corrected-r1, corrected-r2, and unavailable-evidence lifecycle cases.");
  }
  const positive = cases.get("positive");
  const negative = cases.get("negative");
  const correctedR1 = cases.get("corrected-r1");
  const correctedR2 = cases.get("corrected-r2");
  const unavailable = cases.get("unavailable-evidence");
  requireAddress(config.deployer_wallet, "deployer_wallet");
  requireAddress(config.organizer_wallet, "organizer_wallet");
  requireTxHash(config.deployment_tx_hash, "deployment_tx_hash");
  requireTxHash(config.program_publish_tx_hash, "program_publish_tx_hash");
  requireValue(config.program_id, "program_id");
  if (!positive.assert_current_revision || !negative.assert_current_revision || correctedR1.assert_current_revision || !correctedR2.assert_current_revision || !unavailable.assert_current_revision) {
    throw new Error("Only corrected-r1 may be superseded; every final lifecycle result must require canonical current-revision readback.");
  }
  if (requireValue(correctedR1.entry_id, "corrected-r1.entry_id") !== requireValue(correctedR2.entry_id, "corrected-r2.entry_id")) {
    throw new Error("Corrected revisions must use the same entry.");
  }
  if (requireValue(correctedR1.revision_id, "corrected-r1.revision_id") === requireValue(correctedR2.revision_id, "corrected-r2.revision_id")) {
    throw new Error("Corrected revisions must have distinct revision IDs.");
  }
  if (requireValue(correctedR1.expected_commit_sha, "corrected-r1.expected_commit_sha").toLowerCase() === requireValue(correctedR2.expected_commit_sha, "corrected-r2.expected_commit_sha").toLowerCase()) {
    throw new Error("Corrected revisions must bind distinct immutable commits.");
  }
  if (requireAddress(correctedR1.expected_wallet, "corrected-r1.expected_wallet") !== requireAddress(correctedR2.expected_wallet, "corrected-r2.expected_wallet")) {
    throw new Error("Corrected revisions must use the same applicant wallet.");
  }
  const attacker = config.unauthorized_action;
  if (!attacker || typeof attacker !== "object") throw new Error("Run config must include the required unauthorized-action control.");
  requireTxHash(attacker.transaction_hash, "unauthorized_action.transaction_hash");
  const targetCaseId = requireValue(attacker.target_case_id, "unauthorized_action.target_case_id");
  if (!["positive", "negative", "corrected-r2", "unavailable-evidence"].includes(targetCaseId)) throw new Error("unauthorized_action.target_case_id must name a current lifecycle case.");
  requireAddress(attacker.expected_wallet, "unauthorized_action.expected_wallet");
  if (attacker.expected_method !== "submit_revision") throw new Error("unauthorized_action.expected_method must be submit_revision.");
  if (!Array.isArray(attacker.expected_args) || attacker.expected_args.length !== 5) throw new Error("unauthorized_action.expected_args must contain the five submit_revision arguments.");
  if (requireValue(attacker.expected_args[0], "unauthorized_action.expected_args[0]") !== requireValue(cases.get(targetCaseId).entry_id, targetCaseId + ".entry_id")) throw new Error("unauthorized_action must target the selected lifecycle entry.");
  if (requireAddress(attacker.expected_wallet, "unauthorized_action.expected_wallet") === requireAddress(cases.get(targetCaseId).expected_wallet, targetCaseId + ".expected_wallet")) throw new Error("unauthorized_action wallet must differ from the target applicant wallet.");
  if (!Array.isArray(config.expected_qualified_entry_ids)) throw new Error("expected_qualified_entry_ids must be an array.");
  const expectedQualified = config.expected_qualified_entry_ids.map((entryId, index) => requireValue(entryId, "expected_qualified_entry_ids[" + index + "]"));
  if (new Set(expectedQualified).size !== expectedQualified.length) throw new Error("expected_qualified_entry_ids contains duplicates.");
  const requiredQualified = [...new Set([
    requireValue(positive.entry_id, "positive.entry_id"),
    requireValue(correctedR2.entry_id, "corrected-r2.entry_id"),
  ])].sort();
  if (stable([...expectedQualified].sort()) !== stable(requiredQualified)) throw new Error("The qualified roster must contain exactly the positive and corrected-r2 entries.");
  return cases;
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
  requireTxHash(hash, "transaction hash");
  let timer;
  try {
    const receipt = await Promise.race([
      client.waitForTransactionReceipt({ hash, status: STATUS_FINALIZED, interval: 5000, retries: 36, fullTransaction: true }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("finality wait timed out")), 180000); }),
    ]);
    const tx = receipt && typeof receipt === "object" ? receipt : await client.getTransaction({ hash });
    const status = String(tx?.statusName || tx?.status || "");
    if (!/finalized/i.test(status)) throw new Error(hash + " is not finalized (status " + (status || "unknown") + ").");
    const directExecution = [tx?.txExecutionResultName, tx?.tx_execution_result_name, receipt?.txExecutionResultName, receipt?.tx_execution_result_name]
      .find(value => value !== null && value !== undefined && value !== "");
    const leaderReceipts = tx?.consensus_data?.leader_receipt;
    const leaderList = Array.isArray(leaderReceipts) ? leaderReceipts : leaderReceipts ? [leaderReceipts] : [];
    const leaderExecution = leaderList
      .map(item => item && (item.execution_result ?? item.executionResult))
      .find(value => value !== null && value !== undefined && value !== "");
    const execution = String(directExecution ?? leaderExecution ?? "UNKNOWN");
    if (execution === "UNKNOWN") throw new Error(hash + " has no supported finalized execution result.");
    const succeeded = SUCCESS_EXECUTIONS.has(execution);
    if (shouldSucceed && !succeeded) throw new Error(hash + " finalized with unsuccessful execution: " + execution);
    if (!shouldSucceed && succeeded) throw new Error(hash + " unexpectedly succeeded.");
    return { hash, status, execution, tx };
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

function parseCallJson(value, label) {
  if (typeof value !== "string") throw new Error(label + " must be a JSON string argument.");
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(label + " is not valid JSON: " + (error instanceof Error ? error.message : String(error)));
  }
}
function normalizeCallPaths(value, label) {
  if (!Array.isArray(value) || !value.length || value.some(item => typeof item !== "string")) throw new Error(label + " must be a non-empty string array.");
  const paths = [...new Set(value)].sort();
  if (paths.length !== value.length) throw new Error(label + " contains duplicate paths.");
  return paths;
}
function normalizeCallMapping(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(label + " must be an object.");
  const mapping = {};
  for (const key of Object.keys(value).sort()) {
    const entries = value[key];
    if (!Array.isArray(entries) || !entries.length || entries.some(item => typeof item !== "string")) throw new Error(label + " contains an invalid criterion mapping.");
    mapping[key] = [...new Set(entries)].sort();
  }
  return mapping;
}
function assertRevisionSubmissionArgs(binding, revision, programId, initial, label) {
  const args = binding.args;
  const expectedLength = initial ? 7 : 5;
  if (args.length !== expectedLength) throw new Error(label + " argument count mismatch.");
  if (initial) {
    if (args[0] !== programId || String(args[1]).toLowerCase() !== revision.owner || String(args[2]).toLowerCase() !== revision.repo) throw new Error(label + " program or repository arguments mismatch.");
  } else if (args[0] !== revision.entry_id) {
    throw new Error(label + " entry argument mismatch.");
  }
  const commitIndex = initial ? 3 : 1;
  const pathsIndex = initial ? 4 : 2;
  const mappingIndex = initial ? 5 : 3;
  const nonceIndex = initial ? 6 : 4;
  if (String(args[commitIndex]).toLowerCase() !== revision.commit_sha || stable(normalizeCallPaths(parseCallJson(args[pathsIndex], label + ".evidence_paths")) ) !== stable(revision.evidence_paths)) throw new Error(label + " revision snapshot arguments mismatch.");
  if (stable(normalizeCallMapping(parseCallJson(args[mappingIndex], label + ".evidence_mappings"))) !== stable(revision.evidence_mappings)) throw new Error(label + " criterion mapping arguments mismatch.");
  if (args[nonceIndex] !== revision.claim_nonce) throw new Error(label + " claim nonce mismatch.");
}
function assertAssessmentArgs(binding, entryId, revisionId, label) {
  if (binding.args.length !== 2 || binding.args[0] !== entryId || binding.args[1] !== revisionId) throw new Error(label + " entry/revision arguments mismatch.");
}
function assertProgramPublishArgs(binding, program, label) {
  if (binding.args.length !== 5 || binding.args[0] !== program.title || binding.args[1] !== program.summary || binding.args[2] !== program.description) throw new Error(label + " program text arguments mismatch.");
  if (stable(parseCallJson(binding.args[3], label + ".criteria")) !== stable(program.criteria) || binding.args[4] !== program.deadline) throw new Error(label + " program terms arguments mismatch.");
}

const configPath = process.argv[2];
if (!configPath) throw new Error("Usage: node release-prep/live-verify.mjs <filled-run-config.json>");
const config = JSON.parse(await readFile(resolve(configPath), "utf8"));
if (config.chain_id !== CHAIN_ID) throw new Error("Run config must pin Studionet 61999.");
const matrix = validateRunMatrix(config);
const address = requireValue(config.contract_address, "contract_address");
if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error("Malformed test contract address.");
if (address.toLowerCase() === PRODUCTION_ADDRESS.toLowerCase()) throw new Error("Refusing to inspect the existing production contract as the remediation test target.");
if (config.contract_source_sha256 !== SOURCE_HASH) throw new Error("Run config source hash does not match the reviewed source.");
const localBytes = await readFile(SOURCE_PATH);
const localHash = createHash("sha256").update(localBytes).digest("hex");
if (localHash !== SOURCE_HASH) throw new Error("Local source bytes changed after review: " + localHash);
const rpcChainHex = await rpc("eth_chainId", []);
if (typeof rpcChainHex !== "string" || !/^0x[0-9a-fA-F]+$/.test(rpcChainHex)) throw new Error("eth_chainId returned an invalid RPC response.");
const rpcChainId = Number.parseInt(rpcChainHex, 16);
if (!Number.isSafeInteger(rpcChainId) || rpcChainId !== CHAIN_ID) throw new Error("RPC chain ID is " + rpcChainHex + "; expected Studionet 61999.");
// Studio's installed SDK uses the address-only finalized code RPC. Finality is
// established on the deployment transaction before this read is accepted.
const deployedBase64 = await rpc("gen_getContractCode", [address]);
const deployedBytes = decodeBase64Strict(deployedBase64, "finalized contract source");
if (!deployedBytes.equals(localBytes)) throw new Error("Deployed source bytes differ from the exact reviewed local bytes.");
const deployedHash = createHash("sha256").update(deployedBytes).digest("hex");
if (deployedHash !== SOURCE_HASH) throw new Error("Deployed source mismatch: " + deployedHash);
const info = parseRecord(await read(address, "get_info"), "get_info");
if (info.chain_id !== CHAIN_ID || info.name !== "ENTREW" || info.contract !== "EntrewRegistry") throw new Error("Canonical contract info mismatch.");
const deployment = await finalizedTransaction(config.deployment_tx_hash);
const deployerWallet = requireAddress(config.deployer_wallet, "deployer_wallet");
const deploymentBinding = bindDeploymentTransaction(deployment.tx, { sender: deployerWallet, recipient: address, sourceBytes: localBytes }, "deployment transaction");
const deploymentEvidence = { hash: deployment.hash, status: deployment.status, execution: deployment.execution, ...deploymentBinding };
const programId = requireValue(config.program_id, "program_id");
const programPublish = await finalizedTransaction(config.program_publish_tx_hash);
const organizerWallet = requireAddress(config.organizer_wallet, "organizer_wallet");
const programPublishBinding = bindCallTransaction(programPublish.tx, { sender: organizerWallet, recipient: address, method: "publish_program" }, "program publish transaction");
const programPublishEvidence = { hash: programPublish.hash, status: programPublish.status, execution: programPublish.execution, ...programPublishBinding };
const program = parseRecord(await read(address, "get_program", [programId]), "get_program");
if (program.program_id !== programId || String(program.organizer).toLowerCase() !== organizerWallet) throw new Error("Canonical program identity mismatch.");
assertProgramPublishArgs(programPublishBinding, program, "program publish transaction");
const caseResults = [];
const finalizedCases = new Map();
for (const testCase of matrix.values()) {
  const submission = await finalizedTransaction(testCase.submission_tx_hash);
  const assessment = await finalizedTransaction(testCase.assessment_tx_hash);
  const revision = parseRecord(await read(address, "get_revision", [testCase.revision_id]), "get_revision");
  const review = parseRecord(await read(address, "get_review", [testCase.attempt_id]), "get_review");
  const statuses = review.criteria.map(row => row.status);
  const expectedRepository = requireValue(testCase.expected_repository, testCase.case_id + ".expected_repository");
  const expectedCommit = requireValue(testCase.expected_commit_sha, testCase.case_id + ".expected_commit_sha").toLowerCase();
  const expectedWallet = requireAddress(testCase.expected_wallet, testCase.case_id + ".expected_wallet");
  const expectedNonce = requireValue(testCase.expected_nonce, testCase.case_id + ".expected_nonce");
  const initialSubmission = testCase.case_id !== "corrected-r2";
  const submissionBinding = bindCallTransaction(submission.tx, {
    sender: expectedWallet,
    recipient: address,
    method: initialSubmission ? "submit_entry" : "submit_revision",
  }, testCase.case_id + " submission transaction");
  if (!/^[0-9a-f]{40}$/.test(expectedCommit)) throw new Error(testCase.case_id + " must use a full immutable commit SHA.");
  if (revision.revision_id !== testCase.revision_id || review.revision_id !== testCase.revision_id) throw new Error(testCase.case_id + " revision binding mismatch.");
  if ((revision.owner + "/" + revision.repo).toLowerCase() !== expectedRepository.toLowerCase() || revision.commit_sha !== expectedCommit) throw new Error(testCase.case_id + " repository/commit binding mismatch.");
  if (revision.applicant.toLowerCase() !== expectedWallet || revision.program_id !== programId || revision.claim_nonce !== expectedNonce) throw new Error(testCase.case_id + " wallet/program/nonce binding mismatch.");
  assertRevisionSubmissionArgs(submissionBinding, revision, programId, initialSubmission, testCase.case_id + " submission transaction");
  if (review.repo.toLowerCase() !== expectedRepository.toLowerCase() || review.commit_sha !== expectedCommit) throw new Error(testCase.case_id + " review source binding mismatch.");
  const expectedMarkerHash = requireSha256(testCase.expected_marker_sha256, testCase.case_id + ".expected_marker_sha256");
  if (review.marker_sha256 !== expectedMarkerHash) throw new Error(testCase.case_id + " marker hash mismatch.");
  const actualFiles = new Map(review.files.map(file => [file.path, file]));
  if (actualFiles.size !== testCase.expected_files.length) throw new Error(testCase.case_id + " source fingerprint count mismatch.");
  for (const expectedFile of testCase.expected_files) {
    if (!expectedFile || typeof expectedFile !== "object" || typeof expectedFile.path !== "string" || typeof expectedFile.classification !== "string" || typeof expectedFile.sha256 !== "string") {
      throw new Error(testCase.case_id + " has an invalid expected source fingerprint.");
    }
    const actualFile = actualFiles.get(expectedFile.path);
    if (!actualFile || actualFile.classification !== expectedFile.classification || actualFile.sha256 !== expectedFile.sha256) {
      throw new Error(testCase.case_id + " source fingerprint mismatch at " + expectedFile.path);
    }
  }
  if (review.outcome !== testCase.expected_outcome) throw new Error(testCase.case_id + " outcome mismatch: " + review.outcome);
  if (review.provenance !== testCase.expected_provenance || review.issue_code !== testCase.expected_issue_code) throw new Error(testCase.case_id + " provenance/issue mismatch.");
  if (stable(statuses) !== stable(testCase.expected_criteria_statuses)) throw new Error(testCase.case_id + " criterion vector mismatch: " + stable(statuses));
  const assessmentBinding = bindCallTransaction(assessment.tx, { sender: expectedWallet, recipient: address, method: "evaluate_revision" }, testCase.case_id + " assessment transaction");
  assertAssessmentArgs(assessmentBinding, testCase.entry_id, testCase.revision_id, testCase.case_id + " assessment transaction");
  if (testCase.assert_current_revision) {
    const entry = parseRecord(await read(address, "get_entry", [testCase.entry_id]), "get_entry");
    if (entry.current_revision !== testCase.revision_id || entry.current_result !== testCase.expected_outcome) throw new Error(testCase.case_id + " current entry readback mismatch.");
  }
  finalizedCases.set(testCase.case_id, { submission, assessment });
  caseResults.push({
    case_id: testCase.case_id,
    submission: { hash: submission.hash, status: submission.status, execution: submission.execution, ...submissionBinding },
    assessment: { hash: assessment.hash, status: assessment.status, execution: assessment.execution, ...assessmentBinding },
    outcome: review.outcome,
    provenance: review.provenance,
    issue_code: review.issue_code,
    criteria: statuses,
  });
}
const actualRoster = await roster(address, programId);
const expectedRoster = [...(config.expected_qualified_entry_ids || [])].sort();
if (stable([...actualRoster].sort()) !== stable(expectedRoster)) throw new Error("Canonical qualified roster mismatch.");
const attack = config.unauthorized_action;
const attackTx = await finalizedTransaction(attack.transaction_hash, false);
const targetCase = matrix.get(attack.target_case_id);
const targetEntry = parseRecord(await read(address, "get_entry", [targetCase.entry_id]), "unauthorized target entry");
const targetApplicant = requireAddress(targetCase.expected_wallet, attack.target_case_id + ".expected_wallet");
if (targetEntry.entry_id !== targetCase.entry_id || targetEntry.applicant.toLowerCase() !== targetApplicant || targetEntry.current_revision !== targetCase.revision_id || targetEntry.current_result !== targetCase.expected_outcome || targetEntry.revision_count !== (attack.target_case_id === "corrected-r2" ? 2 : 1) || targetEntry.qualified !== (targetCase.expected_outcome === "QUALIFIED")) {
  throw new Error("Unauthorized target entry is not in the expected finalized lifecycle state.");
}
const attackBinding = bindCallTransaction(attackTx.tx, { sender: attack.expected_wallet, recipient: address, method: attack.expected_method }, "unauthorized action transaction");
if (stable(attackBinding.args) !== stable(attack.expected_args)) throw new Error("Unauthorized action arguments mismatch.");
const targetAssessment = finalizedCases.get(attack.target_case_id)?.assessment;
if (!targetAssessment) throw new Error("Unauthorized target assessment evidence is missing.");
if (transactionCreatedTimestamp(attackTx.tx, "unauthorized action") <= transactionCreatedTimestamp(targetAssessment.tx, attack.target_case_id + " assessment")) throw new Error("Unauthorized action must be finalized after the target assessment.");
const expectedTargetState = {
  current_revision: targetCase.revision_id,
  current_result: targetCase.expected_outcome,
  revision_count: attack.target_case_id === "corrected-r2" ? 2 : 1,
  qualified: targetCase.expected_outcome === "QUALIFIED",
};
for (const key of Object.keys(expectedTargetState)) {
  if (stable(targetEntry[key]) !== stable(expectedTargetState[key])) throw new Error("Unauthorized action changed " + key + ".");
}
const unauthorized = {
  transaction: { hash: attackTx.hash, status: attackTx.status, execution: attackTx.execution, sender: attackBinding.sender, recipient: attackBinding.recipient, method: attackBinding.method, args: attackBinding.args },
  entry_id: targetCase.entry_id,
  target_case_id: attack.target_case_id,
  target_applicant: targetApplicant,
  state_unchanged_from_finalized_target: true,
};
console.log(JSON.stringify({
  network: { chain_id: rpcChainId, rpc_chain_id: rpcChainHex, rpc: RPC },
  contract: { address, source_sha256: deployedHash, source_status: "FINALIZED" },
  deployment: deploymentEvidence,
  program: { program_id: programId, publish: programPublishEvidence, terms_digest: program.terms_digest },
  cases: caseResults,
  qualified_entry_ids: actualRoster,
  unauthorized_action: unauthorized,
}, null, 2));
