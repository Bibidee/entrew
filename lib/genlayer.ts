import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { ExecutionResult, TransactionHashVariant, TransactionStatus } from "genlayer-js/types";
import { assertPinnedSdkNetwork, configuredContract, NETWORK } from "./network";
import { rememberSubmitted } from "./activity";
import type { Eip1193Provider } from "./types";

type FeeEstimate = { distribution?: unknown; feeValue?: unknown };
type RuntimeClient = {
  readContract(args: { address: `0x${string}`; functionName: string; args: unknown[]; transactionHashVariant: typeof TransactionHashVariant.LATEST_FINAL }): Promise<unknown>;
  estimateTransactionFeesForWrite?: (args: { account: `0x${string}`; address: `0x${string}`; functionName: string; args: unknown[]; value: bigint }) => Promise<FeeEstimate>;
  writeContract(args: { address: `0x${string}`; functionName: string; args: unknown[]; value: bigint; fees?: { distribution?: unknown; feeValue?: unknown } }): Promise<`0x${string}`>;
  waitForTransactionReceipt(args: { hash: `0x${string}`; status: typeof TransactionStatus.FINALIZED; fullTransaction: boolean }): Promise<{ txExecutionResultName?: unknown }>;
  getTransaction(args: { hash: `0x${string}` }): Promise<{ statusName?: unknown; status?: unknown; txExecutionResultName?: unknown }>;
};

export type TxPhase =
  | "SUBMITTED"
  | "FINALIZED_UNVERIFIED"
  | "FINALIZED_EXECUTION_FAILED"
  | "CANONICAL_CONFIRMED"
  | "MONITORING_STOPPED";

export type WriteResult = { hash: `0x${string}`; phase: TxPhase; canonical: boolean; message: string };

function readClient(): RuntimeClient {
  assertPinnedSdkNetwork();
  return createClient({ chain: studionet }) as unknown as RuntimeClient;
}

export function contractAddress(): `0x${string}` {
  const address = configuredContract();
  if (!address) throw new Error("The ENTREW contract has not been deployed to Studionet yet.");
  return address;
}

export async function readContract<T>(functionName: string, args: unknown[] = []): Promise<T> {
  const address = contractAddress();
  const result = await readClient().readContract({
    address,
    functionName,
    args,
    transactionHashVariant: TransactionHashVariant.LATEST_FINAL,
  });
  return result as T;
}

export function decodeJson<T>(raw: unknown): T {
  if (typeof raw !== "string" || raw.length > 256_000) throw new Error("The contract returned an invalid or oversized record.");
  return JSON.parse(raw) as T;
}

export async function writeAndVerify(args: {
  provider: Eip1193Provider;
  signer: `0x${string}`;
  functionName: string;
  contractArgs: unknown[];
  operation: string;
  itemIdentity: string;
  payloadDigest: string;
  canonicalReadback: () => Promise<boolean>;
}): Promise<WriteResult> {
  assertPinnedSdkNetwork();
  const address = contractAddress();
  const initialChain = await args.provider.request({ method: "eth_chainId" });
  if (typeof initialChain !== "string" || Number.parseInt(initialChain, 16) !== NETWORK.id) throw new Error("Switch the selected wallet to GenLayer Studionet (61999) before signing.");
  const accounts = await args.provider.request({ method: "eth_accounts" });
  if (!Array.isArray(accounts) || String(accounts[0]).toLowerCase() !== args.signer.toLowerCase()) {
    throw new Error("The selected account changed. Reconnect before signing.");
  }

  const client = createClient({ chain: studionet, account: args.signer, provider: args.provider }) as unknown as RuntimeClient;
  let fees: { fees?: { distribution?: unknown; feeValue?: unknown } } = {};
  if (typeof client.estimateTransactionFeesForWrite === "function") {
    const estimate = await client.estimateTransactionFeesForWrite({
      account: args.signer,
      address,
      functionName: args.functionName,
      args: args.contractArgs,
      value: 0n,
    });
    if (estimate?.distribution && estimate?.feeValue !== undefined) {
      fees = { fees: { distribution: estimate.distribution, feeValue: estimate.feeValue } };
    }
  }
  const txHash = await client.writeContract({
    address,
    functionName: args.functionName,
    args: args.contractArgs,
    value: 0n,
    ...fees,
  }) as `0x${string}`;

  try {
    rememberSubmitted({
      hash: txHash,
      chainId: NETWORK.id,
      contractAddress: address,
      signer: args.signer,
      operation: args.operation,
      submittedAt: Date.now(),
      itemIdentity: args.itemIdentity,
      payloadDigest: args.payloadDigest,
    });
  } catch {
    // Hash remains visible to this session even if browser storage is unavailable.
  }

  // Older wallet/SDK versions can return a hash just before a provider event;
  // retain the hash first and never silently retry the write.
  const afterChain = await args.provider.request({ method: "eth_chainId" }).catch(() => null);
  const afterAccounts = await args.provider.request({ method: "eth_accounts" }).catch(() => null);
  const walletStable = afterChain === initialChain && Array.isArray(afterAccounts) && String(afterAccounts[0]).toLowerCase() === args.signer.toLowerCase();

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const receipt = await Promise.race([
      client.waitForTransactionReceipt({ hash: txHash, status: TransactionStatus.FINALIZED, fullTransaction: true }),
      new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error("monitor timeout")), 120_000); }),
    ]);
    const execution = receipt?.txExecutionResultName;
    if (execution !== ExecutionResult.FINISHED_WITH_RETURN) {
      return { hash: txHash, phase: "FINALIZED_EXECUTION_FAILED", canonical: false, message: "Finalized execution failed. The application record was not confirmed." };
    }
    if (!walletStable) {
      return { hash: txHash, phase: "FINALIZED_UNVERIFIED", canonical: false, message: "The wallet changed during signing. The transaction is finalized; recheck its exact canonical record in Activity." };
    }
    const canonical = await args.canonicalReadback();
    if (!canonical) {
      return { hash: txHash, phase: "FINALIZED_UNVERIFIED", canonical: false, message: "The transaction finalized, but exact canonical state readback did not match." };
    }
    return { hash: txHash, phase: "CANONICAL_CONFIRMED", canonical: true, message: "Finalized and verified against canonical contract state." };
  } catch {
    return { hash: txHash, phase: "MONITORING_STOPPED", canonical: false, message: "The hash is saved for recovery. Finality is unknown; do not submit this action again." };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function inspectTransaction(hash: `0x${string}`): Promise<{ status: string; execution: string }> {
  const tx = await readClient().getTransaction({ hash });
  return { status: String(tx?.statusName || tx?.status || "UNKNOWN"), execution: String(tx?.txExecutionResultName || "UNKNOWN") };
}

export function isSuccessfulExecution(execution: string): boolean {
  return execution === String(ExecutionResult.FINISHED_WITH_RETURN);
}

