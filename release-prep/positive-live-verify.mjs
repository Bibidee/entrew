#!/usr/bin/env node
// Read-only verifier for the separately deployed corrected contract's one authorized positive lifecycle.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionHashVariant, TransactionStatus } from "genlayer-js/types";
import { bindCallTransaction, bindDeploymentTransaction, canonicalValue, requireAddress, stable } from "./transaction-evidence.mjs";

const HERE = resolve(fileURLToPath(new URL(".", import.meta.url)));
const SOURCE_PATH = resolve(HERE, "../contracts/entrew_registry.py");
const RPC = "https://studio.genlayer.com/api";
const CHAIN_ID = 61999;
const client = createClient({ chain: studionet });
const SUCCESS = new Set([String(ExecutionResult.FINISHED_WITH_RETURN), "SUCCESS"]);

function fail(message) { throw new Error(message); }
function equal(actual, expected, label) { if (stable(actual) !== stable(expected)) fail(label + " mismatch"); }
function txHash(value, label) { if (typeof value !== "string" || !/^0x[0-9a-f]{64}$/i.test(value)) fail(label + " must be a transaction hash"); return value; }
function sha256(value, label) { if (typeof value !== "string" || !/^[0-9a-f]{64}$/i.test(value)) fail(label + " must be a SHA-256 digest"); return value.toLowerCase(); }
function json(value, label) { if (typeof value !== "string") fail(label + " did not return JSON text"); try { return JSON.parse(value); } catch { fail(label + " returned invalid JSON"); } }
async function rpc(method, params) {
  const response = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(20000) });
  if (!response.ok) fail(method + " HTTP " + response.status);
  const body = await response.json();
  if (body.error) fail(method + " RPC error: " + body.error.message);
  return body.result;
}
async function read(address, functionName, args = []) {
  return client.readContract({ address, functionName, args, transactionHashVariant: TransactionHashVariant.LATEST_FINAL });
}
async function finalized(hash, label) {
  txHash(hash, label);
  const receipt = await client.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED, interval: 5000, retries: 36, fullTransaction: true });
  const tx = receipt && typeof receipt === "object" ? receipt : await client.getTransaction({ hash });
  const status = String(tx?.statusName ?? tx?.status ?? "");
  if (!/finalized/i.test(status)) fail(label + " is not finalized");
  const leader = Array.isArray(tx?.consensus_data?.leader_receipt) ? tx.consensus_data.leader_receipt[0] : tx?.consensus_data?.leader_receipt;
  const execution = String(tx?.txExecutionResultName ?? tx?.tx_execution_result_name ?? receipt?.txExecutionResultName ?? leader?.execution_result ?? "");
  if (!SUCCESS.has(execution)) fail(label + " did not execute successfully: " + (execution || "unknown"));
  if (String(tx?.resultName ?? tx?.result_name ?? "") && !/MAJORITY_AGREE/i.test(String(tx?.resultName ?? tx?.result_name))) fail(label + " lacks MAJORITY_AGREE consensus");
  return tx;
}
function decodeGithub(content, label) {
  if (!content || content.type !== "file" || typeof content.content !== "string" || typeof content.sha !== "string") fail(label + " is not a GitHub file response");
  const normalized = content.content.replace(/\s/g, "");
  const bytes = Buffer.from(normalized, "base64");
  if (!bytes.length || bytes.toString("base64") !== normalized) fail(label + " has invalid base64");
  return { bytes, blob: content.sha };
}
async function github(url, label) {
  const response = await fetch(url, { headers: { accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) fail(label + " GitHub HTTP " + response.status);
  return response.json();
}

const configPath = process.argv[2];
if (!configPath) fail("Usage: node release-prep/positive-live-verify.mjs <record.json>");
const config = JSON.parse(await readFile(resolve(configPath), "utf8"));
if (config.chain_id !== CHAIN_ID) fail("record must pin Studionet 61999");
if (typeof config.contract_address !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(config.contract_address)) fail("contract_address must be a full address");
// Studio's address-only code RPC is currently checksum-sensitive. Keep the
// recorded spelling for RPC/read calls, while normalized values are still used
// by the transaction-binding helpers for comparisons.
const contractAddress = config.contract_address;
const address = requireAddress(contractAddress, "contract_address");
const localBytes = await readFile(SOURCE_PATH);
const sourceHash = createHash("sha256").update(localBytes).digest("hex");
if (sourceHash !== sha256(config.contract_source_sha256, "contract_source_sha256")) fail("local reviewed source bytes changed");
if (Number.parseInt(await rpc("eth_chainId", []), 16) !== CHAIN_ID) fail("RPC chain is not Studionet 61999");
const code = Buffer.from(await rpc("gen_getContractCode", [contractAddress]), "base64");
if (!code.equals(localBytes) || createHash("sha256").update(code).digest("hex") !== sourceHash) fail("finalized deployed source bytes differ from reviewed bytes");
equal(json(await read(contractAddress, "get_info"), "get_info"), { chain_id: 61999, contract: "EntrewRegistry", name: "ENTREW", page_limit: 25, protocol_outcomes_are_product_results: false, schema_version: 1 }, "contract info");

const deployment = await finalized(config.deployment_tx_hash, "deployment");
bindDeploymentTransaction(deployment, { sender: config.deployer_wallet, recipient: address, sourceBytes: localBytes }, "deployment binding");
const programTx = await finalized(config.program_publish_tx_hash, "program publication");
bindCallTransaction(programTx, { sender: config.organizer_wallet, recipient: address, method: "publish_program", args: [config.program.title, config.program.summary, config.program.description, JSON.stringify(config.program.criteria), config.program.deadline] }, "program publication binding");
const program = json(await read(contractAddress, "get_program", [config.program_id]), "program");
if (program.program_id !== config.program_id || requireAddress(program.organizer, "program.organizer") !== requireAddress(config.organizer_wallet, "organizer_wallet")) fail("canonical program identity mismatch");
for (const key of ["title", "summary", "description", "deadline", "terms_digest", "criteria"]) if (stable(canonicalValue(program[key], "program." + key)) !== stable(canonicalValue(config.program[key], "expected." + key))) fail("canonical program " + key + " mismatch");

const submission = await finalized(config.submission_tx_hash, "positive submission");
bindCallTransaction(submission, { sender: config.applicant_wallet, recipient: address, method: "submit_entry", args: [config.program_id, config.fixture.owner, config.fixture.repo, config.fixture.commit_sha, JSON.stringify(config.fixture.evidence_paths), JSON.stringify(config.fixture.evidence_mappings), config.fixture.nonce] }, "positive submission binding");
const assessment = await finalized(config.assessment_tx_hash, "positive assessment");
bindCallTransaction(assessment, { sender: config.applicant_wallet, recipient: address, method: "evaluate_revision", args: [config.entry_id, config.revision_id] }, "positive assessment binding");
const canonicalOwner = config.fixture.owner.toLowerCase();
const canonicalRepo = config.fixture.repo.toLowerCase();
const entry = json(await read(contractAddress, "get_entry", [config.entry_id]), "entry");
for (const [key, value] of Object.entries({ entry_id: config.entry_id, program_id: config.program_id, applicant: requireAddress(config.applicant_wallet, "applicant_wallet"), owner: canonicalOwner, repo: canonicalRepo, current_revision: config.revision_id, current_result: "QUALIFIED", last_conclusive_revision: config.revision_id, qualified: true, revision_count: 1 })) if (stable(entry[key]) !== stable(value)) fail("canonical entry " + key + " mismatch");
const revision = json(await read(contractAddress, "get_revision", [config.revision_id]), "revision");
for (const [key, value] of Object.entries({ revision_id: config.revision_id, entry_id: config.entry_id, program_id: config.program_id, applicant: requireAddress(config.applicant_wallet, "applicant_wallet"), owner: canonicalOwner, repo: canonicalRepo, commit_sha: config.fixture.commit_sha, claim_nonce: config.fixture.nonce, final_outcome: "QUALIFIED", provenance: "REVISION_BOUND" })) if (stable(revision[key]) !== stable(value)) fail("canonical revision " + key + " mismatch");
equal(revision.evidence_paths, [...config.fixture.evidence_paths].sort(), "canonical evidence paths");
equal(revision.evidence_mappings, config.fixture.evidence_mappings, "canonical evidence mappings");
const review = json(await read(contractAddress, "get_review", [config.attempt_id]), "review");
for (const [key, value] of Object.entries({ attempt_id: config.attempt_id, entry_id: config.entry_id, revision_id: config.revision_id, outcome: "QUALIFIED", provenance: "REVISION_BOUND", issue_code: "NONE", marker_sha256: config.fixture.marker_sha256 })) if (stable(review[key]) !== stable(value)) fail("canonical review " + key + " mismatch");
equal(review.criteria.map(item => item.status), ["MET", "MET"], "canonical criterion vector");
equal(review.files, [
  { classification: "REVISION_BOUND", path: "replacement-fixtures/positive/docs/idempotency.md", sha256: config.fixture.artifacts[2].sha256 },
  { classification: "REVISION_BOUND", path: "replacement-fixtures/positive/src/charges.py", sha256: config.fixture.artifacts[1].sha256 },
], "canonical evidence fingerprints");
if (Number(await read(contractAddress, "get_program_qualified_count", [config.program_id])) !== 1) fail("qualified roster count is not one");
const roster = json(await read(contractAddress, "get_program_qualified_page", [config.program_id, 0, 25]), "qualified roster");
if (roster.length !== 1 || roster[0]?.entry_id !== config.entry_id) fail("qualified roster does not contain the entry exactly once");

const repoApi = "https://api.github.com/repos/" + config.fixture.owner + "/" + config.fixture.repo;
const repository = await github(repoApi, "repository");
if (String(repository.full_name).toLowerCase() !== (config.fixture.owner + "/" + config.fixture.repo).toLowerCase()) fail("GitHub repository identity mismatch");
const commit = await github(repoApi + "/commits/" + config.fixture.commit_sha, "commit");
if (String(commit.sha).toLowerCase() !== config.fixture.commit_sha) fail("GitHub immutable commit identity mismatch");
for (const artifact of config.fixture.artifacts) {
  const response = await github(repoApi + "/contents/" + artifact.path.split("/").map(encodeURIComponent).join("/") + "?ref=" + config.fixture.commit_sha, artifact.path);
  const file = decodeGithub(response, artifact.path);
  if (file.blob !== artifact.git_blob || createHash("sha256").update(file.bytes).digest("hex") !== sha256(artifact.sha256, artifact.path + ".sha256")) fail(artifact.path + " fingerprint mismatch");
}
console.log(JSON.stringify({ verified: true, chain_id: CHAIN_ID, contract_address: config.contract_address, source_sha256: sourceHash, program_publish_tx_hash: config.program_publish_tx_hash, submission_tx_hash: config.submission_tx_hash, assessment_tx_hash: config.assessment_tx_hash, outcome: review.outcome, criterion_results: review.criteria.map(item => item.status), provenance: review.provenance, qualified_entry_id: config.entry_id }));
