import { studionet } from "genlayer-js/chains";

export const NETWORK = Object.freeze({
  id: 61999,
  name: "GenLayer Studionet",
  rpc: "https://studio.genlayer.com/api",
  explorer: "https://explorer-studio.genlayer.com",
  symbol: "GEN",
});

export function configuredContract(): `0x${string}` | null {
  const configuredId = process.env.NEXT_PUBLIC_ENTREW_CHAIN_ID;
  const configuredRpc = process.env.NEXT_PUBLIC_ENTREW_RPC;
  const address = process.env.NEXT_PUBLIC_ENTREW_CONTRACT_ADDRESS?.trim();
  if (configuredId && configuredId !== String(NETWORK.id)) throw new Error("Configured chain must be Studionet 61999.");
  if (configuredRpc && configuredRpc !== NETWORK.rpc) throw new Error("Configured RPC must be the Studionet RPC.");
  if (!address) return null;
  if (!/^0x[0-9a-fA-F]{40}$/.test(address) || /^0x0{40}$/i.test(address)) {
    throw new Error("The configured ENTREW contract address is missing or invalid.");
  }
  return address as `0x${string}`;
}

export function assertPinnedSdkNetwork(): void {
  const chain = studionet as unknown as { id?: number; rpcUrls?: { default?: { http?: string[] } } };
  if (chain.id !== NETWORK.id || chain.rpcUrls?.default?.http?.[0] !== NETWORK.rpc) {
    throw new Error("The pinned GenLayer SDK Studionet definition does not match the locked chain and RPC.");
  }
}

export function explorerTransaction(hash: string): string {
  return `${NETWORK.explorer}/tx/${encodeURIComponent(hash)}`;
}

