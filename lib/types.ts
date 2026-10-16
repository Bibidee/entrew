export type CriterionKind = "IMPLEMENTATION" | "DOCUMENTATION" | "INTEGRATION";
export type CriterionStatus = "MET" | "NOT_MET" | "UNVERIFIABLE";
export type ProductOutcome = "PENDING" | "QUALIFIED" | "NOT_ESTABLISHED" | "INCONCLUSIVE";

export interface Criterion {
  key: string;
  type: CriterionKind;
  requirement: string;
  evidence_expectations: string;
}

export interface Program {
  program_id: string;
  organizer: string;
  title: string;
  summary: string;
  description: string;
  criteria: Criterion[];
  deadline: number;
  created_at: number;
  schema_version: number;
  terms_digest: string;
}

export interface Entry {
  entry_id: string;
  program_id: string;
  applicant: string;
  owner: string;
  repo: string;
  current_revision: string;
  revision_count: number;
  current_result: ProductOutcome;
  last_conclusive_revision: string;
  created_at: number;
  deadline_snapshot: number;
  qualified: boolean;
}

export interface Revision {
  revision_id: string;
  entry_id: string;
  program_id: string;
  applicant: string;
  owner: string;
  repo: string;
  commit_sha: string;
  evidence_paths: string[];
  evidence_mappings: Record<string, string[]>;
  claim_nonce: string;
  snapshot_digest: string;
  revision_index: number;
  submitted_at: number;
  provenance: string;
  final_outcome?: ProductOutcome;
}

export interface ReviewAttempt {
  attempt_id: string;
  entry_id: string;
  revision_id: string;
  snapshot_digest: string;
  criteria: Array<{ index: number; status: CriterionStatus; evidence_paths: string[]; explanation: string }>;
  outcome: Exclude<ProductOutcome, "PENDING">;
  provenance: string;
  issue_code: string;
  repo: string;
  commit_sha: string;
  marker_sha256: string;
  files: Array<{ path: string; sha256: string; classification: string }>;
  assessed_at: number;
  review_version: number;
}

export interface WalletState {
  address: `0x${string}`;
  provider: Eip1193Provider;
  name: string;
  chainId: number | null;
}

export interface Eip1193Provider {
  isMetaMask?: boolean;
  isRabby?: boolean;
  providers?: Eip1193Provider[];
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  removeListener?(event: string, listener: (...args: unknown[]) => void): void;
}

