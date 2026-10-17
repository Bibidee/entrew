import type { Eip1193Provider } from "./types";
import { NETWORK } from "./network";

export interface WalletOption { id: string; name: string; provider: Eip1193Provider }

declare global {
  interface Window { ethereum?: Eip1193Provider }
}

function providerName(provider: Eip1193Provider, fallback = "Injected wallet"): string {
  if (provider.isRabby) return "Rabby";
  if (provider.isMetaMask) return "MetaMask";
  return fallback;
}

function providerKey(provider: Eip1193Provider): string | null {
  if (provider.isRabby) return "rabby";
  if (provider.isMetaMask) return "metamask";
  return null;
}

export async function discoverWallets(timeoutMs = 250): Promise<WalletOption[]> {
  if (typeof window === "undefined") return [];
  const announced = new Map<string, WalletOption>();
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ info?: { uuid?: string; name?: string }; provider?: Eip1193Provider }>).detail;
    if (detail?.provider) {
      const brandKey = providerKey(detail.provider);
      const name = brandKey ? providerName(detail.provider) : detail.info?.name || providerName(detail.provider);
      announced.set(brandKey || detail.info?.uuid || name, { id: brandKey || detail.info?.uuid || name, name, provider: detail.provider });
    }
  };
  window.addEventListener("eip6963:announceProvider", listener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise((resolve) => setTimeout(resolve, timeoutMs));
  window.removeEventListener("eip6963:announceProvider", listener);
  const fallback = window.ethereum?.providers?.length ? window.ethereum.providers : window.ethereum ? [window.ethereum] : [];
  for (const provider of fallback) {
    const name = providerName(provider);
    const brandKey = providerKey(provider);
    const id = brandKey || `${name}:${String((provider as { _metamask?: unknown })._metamask ? "metamask" : fallback.indexOf(provider))}`;
    if (![...announced.values()].some((option) => option.provider === provider) && !announced.has(id)) announced.set(id, { id, name, provider });
  }
  return [...announced.values()].filter((option, index, all) => all.findIndex((other) => other.provider === option.provider) === index);
}

export async function connectProvider(provider: Eip1193Provider): Promise<`0x${string}`> {
  const accounts = await provider.request({ method: "eth_requestAccounts" });
  return firstAccount(accounts);
}

export async function connectedProviderAccount(provider: Eip1193Provider): Promise<`0x${string}` | null> {
  const accounts = await provider.request({ method: "eth_accounts" });
  try {
    return firstAccount(accounts);
  } catch {
    return null;
  }
}

function firstAccount(accounts: unknown): `0x${string}` {
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(accounts[0])) {
    throw new Error("The selected wallet did not return a valid account.");
  }
  return accounts[0] as `0x${string}`;
}

export async function providerChainId(provider: Eip1193Provider): Promise<number> {
  const value = await provider.request({ method: "eth_chainId" });
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]+$/.test(value)) throw new Error("Wallet returned an invalid chain ID.");
  return Number.parseInt(value, 16);
}

export async function switchToStudionet(provider: Eip1193Provider): Promise<void> {
  const chainHex = `0x${NETWORK.id.toString(16)}`;
  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] });
  } catch (error) {
    const code = (error as { code?: number })?.code;
    if (code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{ chainId: chainHex, chainName: NETWORK.name, nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 }, rpcUrls: [NETWORK.rpc], blockExplorerUrls: [NETWORK.explorer] }],
    });
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainHex }] });
  }
  const current = await providerChainId(provider);
  if (current !== NETWORK.id) throw new Error("The wallet is still connected to the wrong network.");
}

