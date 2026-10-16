import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const localCli = resolve(root, "node_modules/.bin", process.platform === "win32" ? "genlayer.cmd" : "genlayer");
if (!existsSync(localCli)) {
  console.error("Repository-local GenLayer CLI is missing. Run npm ci with the committed lockfile first; a global command is not accepted.");
  process.exit(2);
}
const result = spawnSync(localCli, ["--version"], { cwd: root, encoding: "utf8", shell: process.platform === "win32" });
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
if (!/(?:^|\D)0\.39\.1(?:\D|$)/.test((result.stdout || "") + (result.stderr || ""))) {
  console.error("Repository-local CLI version must be exactly 0.39.1.");
  process.exit(1);
}
