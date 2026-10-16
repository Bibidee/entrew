import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = new URL("../../", import.meta.url);
const source = readFileSync(new URL("contracts/entrew_registry.py", root));
const sourceHash = createHash("sha256").update(source).digest("hex");
const deploy = readFileSync(new URL("scripts/deploy-studionet.mjs", root), "utf8");
const verifier = readFileSync(new URL("release-prep/live-verify.mjs", root), "utf8");
const template = JSON.parse(readFileSync(new URL("release-prep/live-run.template.json", root), "utf8"));
const manifest = JSON.parse(readFileSync(new URL("release-prep/heldout-v1/manifest.json", root), "utf8"));

test("every release consumer pins the exact reviewed source bytes", () => {
  assert.match(deploy, new RegExp(`reviewedHash\\s*=\\s*"${sourceHash}"`));
  assert.match(verifier, new RegExp(`SOURCE_HASH\\s*=\\s*"${sourceHash}"`));
  assert.equal(template.contract_source_sha256, sourceHash);
  assert.equal(manifest.target_contract_source_sha256, sourceHash);
});

test("the live verifier fails closed on network identity and incomplete lifecycle evidence", () => {
  assert.match(verifier, /await rpc\("eth_chainId", \[\]\)/);
  assert.match(verifier, /rpcChainId !== CHAIN_ID/);
  assert.match(verifier, /REQUIRED_CASE_OUTCOMES/);
  assert.match(verifier, /positive: "QUALIFIED"/);
  assert.match(verifier, /"corrected-r2": "QUALIFIED"/);
  assert.match(verifier, /"unavailable-evidence": "INCONCLUSIVE"/);
  assert.match(verifier, /Run config must include the required unauthorized-action control/);
  assert.match(verifier, /fullTransaction: true/);
  assert.match(verifier, /bindCallTransaction/);
  assert.match(verifier, /bindDeploymentTransaction/);
  assert.match(verifier, /Unauthorized action must be finalized after the target assessment/);
  assert.doesNotMatch(verifier, /for \(const testCase of config\.cases \|\| \[\]\)/);
});

test("an incomplete matrix is rejected before any live RPC request", () => {
  const dir = mkdtempSync(join(tmpdir(), "entrew-live-verify-"));
  const configPath = join(dir, "incomplete.json");
  try {
    const incomplete = { ...template, cases: [], unauthorized_action: null };
    writeFileSync(configPath, JSON.stringify(incomplete), "utf8");
    const result = spawnSync(process.execPath, [fileURLToPath(new URL("release-prep/live-verify.mjs", root)), configPath], {
      cwd: fileURLToPath(root),
      encoding: "utf8",
      timeout: 10000,
    });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}\n${result.stderr}`, /Run config must contain exactly/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
