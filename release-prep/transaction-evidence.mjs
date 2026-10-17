import { abi } from "genlayer-js";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function fail(label, message) {
  throw new Error(label + ": " + message);
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(label, "must be an object");
  return value;
}

function canonicalBase64(value, label) {
  if (typeof value !== "string" || !BASE64.test(value)) fail(label, "must be canonical base64");
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) fail(label, "did not round-trip as canonical base64");
  return bytes;
}

export function requireAddress(value, label) {
  if (typeof value !== "string" || !ADDRESS.test(value)) fail(label, "must be a full wallet address");
  return value.toLowerCase();
}

function applicationAddress(tx, aliases, label) {
  const values = aliases
    .filter(alias => tx[alias] !== null && tx[alias] !== undefined && tx[alias] !== "")
    .map(alias => requireAddress(tx[alias], label + "." + alias));
  if (!values.length) fail(label, "is missing application address aliases");
  if (new Set(values).size !== 1) fail(label, "has conflicting application address aliases");
  return values[0];
}

export function canonicalValue(value, label = "value") {
  if (typeof value === "bigint") {
    const numeric = Number(value);
    if (!Number.isSafeInteger(numeric)) fail(label, "contains an unsafe bigint");
    return numeric;
  }
  if (Array.isArray(value)) return value.map((item, index) => canonicalValue(item, label + "[" + index + "]"));
  if (value instanceof Map) {
    const entries = [];
    for (const [key, item] of value.entries()) {
      if (typeof key !== "string" || !key) fail(label, "contains an invalid map key");
      entries.push([key, canonicalValue(item, label + "." + key)]);
    }
    entries.sort(([left], [right]) => left.localeCompare(right));
    if (new Set(entries.map(([key]) => key)).size !== entries.length) fail(label, "contains duplicate map keys");
    return Object.fromEntries(entries);
  }
  if (value && typeof value === "object") {
    const record = requireObject(value, label);
    const keys = Object.keys(record).sort();
    return Object.fromEntries(keys.map(key => [key, canonicalValue(record[key], label + "." + key)]));
  }
  if (typeof value === "string" || typeof value === "boolean" || value === null) return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return value;
  fail(label, "contains an unsupported value");
}

export function stable(value) {
  return JSON.stringify(canonicalValue(value));
}

function decodedCall(tx, label) {
  const data = requireObject(tx.data, label + ".data");
  const calldata = data.calldata;
  const base64 = typeof calldata === "string" ? calldata : calldata && calldata.base64;
  const bytes = canonicalBase64(base64, label + ".data.calldata.base64");
  let decoded;
  try {
    decoded = abi.calldata.decode(new Uint8Array(bytes));
  } catch (error) {
    fail(label, "calldata decoding failed: " + (error instanceof Error ? error.message : String(error)));
  }
  if (!(decoded instanceof Map) || decoded.size !== 2 || !decoded.has("method") || !decoded.has("args")) {
    fail(label, "calldata must decode to exactly method and args");
  }
  const method = decoded.get("method");
  const args = decoded.get("args");
  if (typeof method !== "string" || !method || !Array.isArray(args)) fail(label, "calldata method or args are invalid");
  return { method, args: canonicalValue(args, label + ".args") };
}

export function bindCallTransaction(tx, expected, label) {
  requireObject(tx, label);
  const sender = applicationAddress(tx, ["sender", "from_address"], label + ".sender");
  const recipient = applicationAddress(tx, ["recipient", "to_address"], label + ".recipient");
  if (sender !== requireAddress(expected.sender, label + ".expected_sender")) fail(label, "sender mismatch");
  if (recipient !== requireAddress(expected.recipient, label + ".expected_recipient")) fail(label, "recipient mismatch");
  const call = decodedCall(tx, label);
  if (call.method !== expected.method) fail(label, "method mismatch");
  if (Object.hasOwn(expected, "args") && stable(call.args) !== stable(expected.args)) fail(label, "arguments mismatch");
  return { sender, recipient, method: call.method, args: call.args };
}

export function bindDeploymentTransaction(tx, expected, label) {
  requireObject(tx, label);
  const sender = applicationAddress(tx, ["sender", "from_address"], label + ".sender");
  const recipient = applicationAddress(tx, ["recipient", "to_address"], label + ".recipient");
  if (sender !== requireAddress(expected.sender, label + ".expected_sender")) fail(label, "sender mismatch");
  if (recipient !== requireAddress(expected.recipient, label + ".expected_recipient")) fail(label, "recipient mismatch");
  const data = requireObject(tx.data, label + ".data");
  if (requireAddress(data.contract_address, label + ".data.contract_address") !== recipient) fail(label, "deployed contract address mismatch");
  const code = canonicalBase64(data.contract_code, label + ".data.contract_code");
  if (!Buffer.isBuffer(expected.sourceBytes) || !code.equals(expected.sourceBytes)) fail(label, "deployed contract bytes mismatch");
  return { sender, recipient, contract_address: recipient };
}

export function transactionCreatedTimestamp(tx, label) {
  requireObject(tx, label);
  const values = [tx.created_timestamp, tx.createdTimestamp]
    .filter(value => value !== null && value !== undefined && value !== "")
    .map(value => {
      if (typeof value === "bigint") return value;
      if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
      if (typeof value === "string" && /^[0-9]+$/.test(value)) return BigInt(value);
      fail(label, "has an invalid created timestamp");
    });
  if (!values.length) fail(label, "is missing a created timestamp");
  if (new Set(values.map(value => value.toString())).size !== 1) fail(label, "has conflicting created timestamps");
  return values[0];
}
