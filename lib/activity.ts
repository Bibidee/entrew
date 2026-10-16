import { NETWORK } from "./network";

const STORAGE_KEY = "entrew:submitted-transactions:v1";
const MAX_RECORDS = 80;

export type ActivityRecord = {
  hash: `0x${string}`;
  chainId: number;
  contractAddress: `0x${string}`;
  signer: `0x${string}`;
  operation: string;
  submittedAt: number;
  itemIdentity: string;
  payloadDigest: string;
};

export function readActivity(): ActivityRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((row): row is ActivityRecord =>
      row && typeof row.hash === "string" && row.chainId === NETWORK.id &&
      typeof row.contractAddress === "string" && typeof row.signer === "string" &&
      typeof row.operation === "string" && typeof row.submittedAt === "number",
    ).slice(0, MAX_RECORDS);
  } catch {
    return [];
  }
}

export function rememberSubmitted(record: ActivityRecord): void {
  if (typeof window === "undefined") return;
  const existing = readActivity().filter((row) => row.hash !== record.hash);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([record, ...existing].slice(0, MAX_RECORDS)));
}

