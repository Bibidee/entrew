export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const row = value as Record<string, unknown>;
  return `{${Object.keys(row).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(row[key])}`).join(",")}}`;
}

export async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

export function formatDate(seconds: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(seconds * 1000)) + " UTC";
}

export function shortAddress(value: string, edge = 5): string {
  if (value.length <= edge * 2 + 3) return value;
  return `${value.slice(0, edge + 2)}…${value.slice(-edge)}`;
}

export function shortHash(value: string, edge = 7): string {
  if (value.length <= edge * 2 + 4) return value;
  return `${value.slice(0, edge + 2)}…${value.slice(-edge)}`;
}

