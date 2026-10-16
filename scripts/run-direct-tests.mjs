import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
let result;

if (process.platform === "win32") {
  const pytestLocations = spawnSync("where.exe", ["pytest"], { encoding: "utf8" });
  const pytestPath = pytestLocations.stdout?.split(/\r?\n/).find(Boolean);
  const pythonCandidates = pytestPath
    ? [resolve(dirname(pytestPath), "python.exe"), resolve(dirname(dirname(pytestPath)), "python.exe")]
    : [];
  const pythonPath = pythonCandidates.find((candidate) => existsSync(candidate));

  if (!pythonPath) {
    console.error("Could not find the Python interpreter associated with pytest.");
    process.exit(1);
  }

  result = spawnSync(
    pythonPath,
    [resolve(scriptDirectory, "run-direct-pytest.py"), ...process.argv.slice(2)],
    { stdio: "inherit" },
  );
} else {
  result = spawnSync(
    process.env.PYTHON || "python3",
    [resolve(scriptDirectory, "run-direct-pytest.py"), ...process.argv.slice(2)],
    { stdio: "inherit" },
  );
}

if (result.error) {
  console.error(`Could not start pytest: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
