import type { Criterion, CriterionKind } from "./types";

export const EVIDENCE_LIMITS = Object.freeze({ files: 3, perFileChars: 12000, totalChars: 24000 });
const criterionKinds: CriterionKind[] = ["IMPLEMENTATION", "DOCUMENTATION", "INTEGRATION"];
const vagueTerms = ["best", "beautiful", "high-quality", "high quality", "impressive", "professional", "elegant"];

export function normalizeRepo(owner: string, repo: string): { owner: string; repo: string } {
  const validPart = /^[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,98}[A-Za-z0-9])?$/;
  if (!validPart.test(owner) || !validPart.test(repo) || owner === "." || owner === ".." || repo === "." || repo === "..") {
    throw new Error("Enter a valid public GitHub owner and repository name.");
  }
  return { owner: owner.toLowerCase(), repo: repo.toLowerCase() };
}

export function normalizeEvidencePath(path: string): string {
  if (path !== path.trim() || path.length < 1 || path.length > 180 || path.startsWith("/")) throw new Error("Evidence paths must be relative and at most 180 characters.");
  if (/[\\%?#:@]/.test(path) || !/^[A-Za-z0-9._/-]+$/.test(path) || path.includes("//")) throw new Error("This evidence path uses an unsupported character.");
  if (path.split("/").some((part) => part === "" || part === "." || part === "..")) throw new Error("Evidence paths cannot traverse directories.");
  if (path === ".entrew/claim.json") throw new Error("The claim marker is checked separately.");
  return path;
}

export function validateSnapshot(sha: string, paths: string[], mapping: Record<string, string[]>, criteriaCount: number): void {
  if (!/^[0-9a-fA-F]{40}$/.test(sha)) throw new Error("Enter the full 40-character commit SHA.");
  if (!Array.isArray(paths) || paths.length < 1 || paths.length > EVIDENCE_LIMITS.files) throw new Error("Add one to three evidence files.");
  const normalized = paths.map(normalizeEvidencePath);
  if (new Set(normalized).size !== normalized.length) throw new Error("Evidence paths must be unique.");
  if (Object.keys(mapping).length !== criteriaCount) throw new Error("Map evidence to every mandatory criterion.");
  for (let index = 0; index < criteriaCount; index += 1) {
    const mapped = mapping[String(index)];
    if (!Array.isArray(mapped) || mapped.length === 0 || mapped.some((path) => !normalized.includes(path))) {
      throw new Error(`Criterion ${index + 1} needs at least one declared evidence file.`);
    }
  }
}

export function validateProgram(title: string, summary: string, description: string, criteria: Criterion[], deadline: number): void {
  if (title.trim().length < 12 || title.trim().length > 100) throw new Error("Title must be 12 to 100 characters.");
  if (summary.length > 360) throw new Error("Summary must be 360 characters or fewer.");
  if (!description.trim() || description.length > 1200) throw new Error("Description must be 1 to 1,200 characters.");
  if (criteria.length < 2 || criteria.length > 3) throw new Error("A program needs two or three mandatory criteria.");
  const keys = new Set<string>();
  criteria.forEach((criterion, index) => {
    if (!/^[a-z0-9][a-z0-9-]{1,31}$/.test(criterion.key) || keys.has(criterion.key)) throw new Error(`Criterion ${index + 1} needs a unique lowercase key.`);
    keys.add(criterion.key);
    if (!criterionKinds.includes(criterion.type)) throw new Error(`Criterion ${index + 1} has an unsupported type.`);
    if (criterion.requirement.length < 40 || criterion.requirement.length > 360) throw new Error(`Criterion ${index + 1} requirement must be 40 to 360 characters.`);
    if (!criterion.evidence_expectations.trim() || criterion.evidence_expectations.length > 240) throw new Error(`Criterion ${index + 1} needs bounded evidence expectations.`);
    if (vagueTerms.some((word) => criterion.requirement.toLowerCase().includes(word))) throw new Error("Use observable evidence requirements instead of taste-based language.");
  });
  const secondsFromNow = deadline - Math.floor(Date.now() / 1000);
  if (secondsFromNow < 86400 || secondsFromNow > 90 * 86400) throw new Error("Deadline must be between one and ninety days from now.");
}

