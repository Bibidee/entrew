import { contractAddress, decodeJson, inspectTransaction, isSuccessfulExecution, readContract } from "./genlayer";
import type { ActivityRecord } from "./activity";
import type { Entry, Program, ReviewAttempt, Revision } from "./types";

type RecoveryIdentity =
  | { kind: "publish"; offset: number }
  | { kind: "entry"; programId: string; offset: number }
  | { kind: "revision"; entryId: string; offset: number }
  | { kind: "review"; entryId: string; revisionId: string; offset: number; qualifiedOffset: number };

export function recoveryIdentity(raw: string): RecoveryIdentity | null {
  try {
    const value = JSON.parse(raw) as RecoveryIdentity;
    if (!value || !Number.isSafeInteger(value.offset) || value.offset < 0) return null;
    if (value.kind === "publish") return value;
    if (value.kind === "entry" && typeof value.programId === "string") return value;
    if (value.kind === "revision" && typeof value.entryId === "string") return value;
    if (value.kind === "review" && typeof value.entryId === "string" && typeof value.revisionId === "string" && Number.isSafeInteger(value.qualifiedOffset) && value.qualifiedOffset >= 0) return value;
    return null;
  } catch { return null; }
}

export async function reconcileActivity(record: ActivityRecord): Promise<{ label: string; detail: string }> {
  if (record.chainId !== 61999) return { label: "Different network", detail: "This hash belongs to a network other than Studionet 61999." };
  if (!record.contractAddress || !record.hash) return { label: "Invalid recovery record", detail: "The saved recovery metadata is incomplete." };
  let transaction: { status: string; execution: string };
  try { transaction = await inspectTransaction(record.hash); }
  catch { return { label: "Status unavailable", detail: "The RPC did not return a transaction status. Keep the hash; do not rebroadcast." }; }
  if (transaction.status.toUpperCase() !== "FINALIZED") {
    return { label: transaction.status, detail: "This is protocol progress only. It is not a finalized application action." };
  }
  if (!isSuccessfulExecution(transaction.execution)) {
    return { label: "Finalized execution failed", detail: `Execution result: ${transaction.execution}. No application success was confirmed.` };
  }
  if (record.contractAddress.toLowerCase() !== contractAddress().toLowerCase()) {
    return { label: "Historical contract address", detail: "The transaction finalized at another registry address. Current contract state was not used to reconcile it." };
  }
  const identity = recoveryIdentity(record.itemIdentity);
  if (!identity) return { label: "Finalized, canonical state not verified", detail: "The submitted transaction finalized successfully, but this recovery record has no exact bounded readback plan." };
  const payloadDigest = record.payloadDigest;
  try {
    if (identity.kind === "publish") {
      const rows = decodeJson<Program[]>(await readContract("get_wallet_programs_page", [record.signer, identity.offset, 25]));
      const matched = rows.some((row) => row.organizer.toLowerCase() === record.signer.toLowerCase() && row.terms_digest === payloadDigest);
      return matched
        ? { label: "Finalized; canonical program match", detail: "The organizer page contains the exact terms digest after the saved append offset." }
        : { label: "Finalized, canonical match pending", detail: "No exact program terms digest was found at the saved page boundary. Recheck later; do not republish automatically." };
    }
    if (identity.kind === "entry") {
      const rows = decodeJson<Entry[]>(await readContract("get_wallet_entries_page", [record.signer, identity.offset, 25]));
      for (const entry of rows) {
        if (entry.program_id !== identity.programId || entry.applicant.toLowerCase() !== record.signer.toLowerCase()) continue;
        const revisions = decodeJson<Revision[]>(await readContract("get_entry_revisions_page", [entry.entry_id, 0, 1]));
        if (revisions[0]?.snapshot_digest === payloadDigest) return { label: "Finalized; canonical entry match", detail: `Entry ${entry.entry_id} is bound to the exact submitted revision digest.` };
      }
      return { label: "Finalized, canonical match pending", detail: "No matching entry and revision digest was found. Keep this hash and recheck; do not resubmit automatically." };
    }
    if (identity.kind === "revision") {
      const rows = decodeJson<Revision[]>(await readContract("get_entry_revisions_page", [identity.entryId, identity.offset, 25]));
      const matched = rows.some((revision) => revision.applicant.toLowerCase() === record.signer.toLowerCase() && revision.snapshot_digest === payloadDigest);
      return matched
        ? { label: "Finalized; canonical revision match", detail: `Entry ${identity.entryId} contains the exact new revision digest.` }
        : { label: "Finalized, canonical match pending", detail: "No exact revision digest was found at the saved page boundary. Do not resubmit automatically." };
    }
    const attempts = decodeJson<ReviewAttempt[]>(await readContract("get_revision_attempts_page", [identity.revisionId, identity.offset, 25]));
    const attempt = attempts.find((row) => row.entry_id === identity.entryId && row.revision_id === identity.revisionId && row.snapshot_digest === payloadDigest);
    if (!attempt) return { label: "Finalized, canonical match pending", detail: "No exact review attempt was found yet. Keep the hash and recheck; do not assess again automatically." };
    const entry = decodeJson<Entry>(await readContract("get_entry", [identity.entryId]));
    if (entry.current_revision !== identity.revisionId || entry.current_result !== attempt.outcome) {
      return { label: "Finalized, canonical state changed", detail: "A later revision or attempt is now current. The immutable history remains available on the evidence page." };
    }
    if (attempt.outcome === "QUALIFIED") {
      const roster = decodeJson<Entry[]>(await readContract("get_program_qualified_page", [entry.program_id, identity.qualifiedOffset, 25]));
      if (!roster.some((row) => row.entry_id === entry.entry_id && row.qualified)) return { label: "Finalized, roster readback pending", detail: "The attempt says QUALIFIED, but its entry was not found in the finalized roster page." };
    }
    return { label: `Finalized; canonical ${attempt.outcome.toLowerCase()} match`, detail: `Attempt ${attempt.attempt_id}, the complete criterion vector, and current entry state were read from finalized contract state.` };
  } catch {
    return { label: "Finalized; canonical readback unavailable", detail: "The final receipt succeeded, but the bounded contract readback failed. No qualification is shown from the receipt alone." };
  }
}

