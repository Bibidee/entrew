import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const contractPath = resolve(root, "contracts/entrew_registry.py");
const source = await readFile(contractPath);
const expectedHash = createHash("sha256").update(source).digest("hex");
const reviewedHash = "a812dcc4884544ad77af6591d2b47cdd0221d6bd966633bd65200d1d02590f44";
if (expectedHash !== reviewedHash) {
  console.error(`Refusing deployment: source SHA-256 ${expectedHash} does not match the reviewed bytes ${reviewedHash}.`);
  process.exit(1);
}
const networkCheck = spawnSync("node", ["scripts/network-check.mjs"], { cwd: root, encoding: "utf8", stdio: "inherit" });
if (networkCheck.status !== 0) process.exit(networkCheck.status ?? 1);
const localCli = resolve(root, "node_modules/.bin", process.platform === "win32" ? "genlayer.cmd" : "genlayer");
if (!existsSync(localCli)) {
  console.error("Repository-local GenLayer CLI is missing. Refusing to use a global or npx-fetched executable.");
  process.exit(2);
}
const version = spawnSync(localCli, ["--version"], { cwd: root, encoding: "utf8", shell: process.platform === "win32" });
if (version.status !== 0) {
  console.error(version.stderr || version.stdout || "Could not run the repository-local GenLayer CLI.");
  process.exit(version.status ?? 1);
}
const actualVersion = (version.stdout + version.stderr).trim();
if (!/(?:^|\D)0\.39\.1(?:\D|$)/.test(actualVersion)) {
  console.error(`Refusing deployment: expected local GenLayer CLI 0.39.1, got ${actualVersion || "no version output"}.`);
  process.exit(1);
}
if (process.env.NEXT_PUBLIC_ENTREW_CONTRACT_ADDRESS) {
  console.error("Remove the existing contract address before deployment; this script does not rotate a live frontend.");
  process.exit(1);
}

console.log(`Deploying exact source SHA-256 ${expectedHash} to https://studio.genlayer.com/api.`);
console.log("The CLI must use a wallet explicitly configured for Studionet 61999.");
const deployment = spawnSync(localCli, ["deploy", "--contract", "contracts/entrew_registry.py", "--rpc", "https://studio.genlayer.com/api"], {
  cwd: root,
  encoding: "utf8",
  stdio: "inherit",
  shell: process.platform === "win32",
});
if (deployment.status !== 0) process.exit(deployment.status ?? 1);
console.log(`Deployment command returned successfully. Record its contract address and transaction, then independently verify finality and source hash ${expectedHash}.`);
