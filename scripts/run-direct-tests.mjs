import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createReadStream, createWriteStream, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const genvmVersion = "v0.3.0-rc7";
const genvmCache = resolve(homedir(), ".cache", "gltest-direct");
const genvmArchive = resolve(genvmCache, `genvm-universal-${genvmVersion}.tar.xz`);
const genvmArchiveUrl = `https://github.com/genlayerlabs/genvm/releases/download/${genvmVersion}/genvm-runners-all.tar.xz`;
const genvmArchiveSha256 = "e218a1854214681560351051f76fe2b878545cf3409455ef372d57014a88ca67";
let result;

async function sha256(path) {
  const digest = createHash("sha256");
  for await (const chunk of createReadStream(path)) digest.update(chunk);
  return digest.digest("hex");
}

async function prepareGenVmRuntime() {
  if (existsSync(genvmArchive) && (await sha256(genvmArchive)) === genvmArchiveSha256) return;

  mkdirSync(genvmCache, { recursive: true });
  const temporaryArchive = `${genvmArchive}.download`;
  rmSync(temporaryArchive, { force: true });
  console.log(`Preparing pinned GenVM ${genvmVersion} Direct Mode runtime…`);

  const response = await fetch(genvmArchiveUrl);
  if (!response.ok || !response.body) {
    throw new Error(`Could not download the official GenVM runtime (${response.status} ${response.statusText}).`);
  }

  try {
    await pipeline(Readable.fromWeb(response.body), createWriteStream(temporaryArchive, { flags: "wx" }));
    const actualSha256 = await sha256(temporaryArchive);
    if (actualSha256 !== genvmArchiveSha256) {
      throw new Error(`GenVM runtime checksum mismatch: expected ${genvmArchiveSha256}, got ${actualSha256}.`);
    }
    rmSync(genvmArchive, { force: true });
    renameSync(temporaryArchive, genvmArchive);
  } catch (error) {
    rmSync(temporaryArchive, { force: true });
    throw error;
  }
}

try {
  await prepareGenVmRuntime();
} catch (error) {
  console.error(`Could not prepare the pinned GenVM Direct Mode runtime: ${error.message}`);
  process.exit(1);
}

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
