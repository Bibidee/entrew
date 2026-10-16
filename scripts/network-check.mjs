import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const activeRoots = ["app", "components", "contracts", "lib", "scripts"];
const activeFiles = ["next.config.ts", "package.json", ".env.example"];
const forbidden = /61997|studioDevnet|studio-dev|preview network/i;
const findings = [];

async function scan(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    if (entry.isDirectory()) await scan(full);
    else if (full !== fileURLToPath(import.meta.url) && /\.(?:[cm]?[jt]sx?|json|py|css|ya?ml|toml|env)$/.test(entry.name)) {
      const source = await readFile(full, "utf8");
      if (forbidden.test(source)) findings.push(full.slice(root.length + 1));
    }
  }
}

for (const relative of activeRoots) {
  try { await scan(join(root, relative)); } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
for (const relative of activeFiles) {
  const source = await readFile(join(root, relative), "utf8");
  if (forbidden.test(source)) findings.push(relative);
}
if (findings.length) {
  console.error(`Forbidden alternate network reference in active source: ${findings.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("Active source scan: no 61997 or preview-network contamination.");
}

const network = await readFile(join(root, "lib", "network.ts"), "utf8");
if (!/id:\s*61999/.test(network) || !network.includes("https://studio.genlayer.com/api") || !network.includes("https://explorer-studio.genlayer.com")) {
  console.error("Pinned Studionet configuration does not match chain 61999 and its official endpoints.");
  process.exitCode = 1;
}

try {
  const response = await fetch("https://studio.genlayer.com/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`RPC returned HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(body.error.message || "RPC returned an error");
  const chainId = Number.parseInt(body.result, 16);
  if (chainId !== 61999) throw new Error(`RPC chain ID is ${chainId}; expected 61999`);
  console.log(`RPC check: ${body.result} (${chainId}) at https://studio.genlayer.com/api`);
} catch (error) {
  console.error(`RPC check could not be verified: ${error.message}`);
  process.exitCode = 1;
}
