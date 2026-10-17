import assert from "node:assert/strict";
import test from "node:test";
import { abi } from "genlayer-js";
import { bindCallTransaction, bindDeploymentTransaction, transactionCreatedTimestamp } from "../../release-prep/transaction-evidence.mjs";

const sender = "0x1111111111111111111111111111111111111111";
const otherSender = "0x2222222222222222222222222222222222222222";
const address = "0x3333333333333333333333333333333333333333";
const source = Buffer.from("print('entrew')\n", "utf8");

function callTransaction(method, args, overrides = {}) {
  const encoded = abi.calldata.encode(abi.calldata.makeCalldataObject(method, args));
  return {
    sender,
    from_address: sender,
    recipient: address,
    to_address: address,
    created_timestamp: "100",
    data: { calldata: { base64: Buffer.from(encoded).toString("base64") } },
    ...overrides,
  };
}

test("binds a finalized Studio call to application wallet, contract, method and arguments", () => {
  const tx = callTransaction("evaluate_revision", ["e1", "e1:r1"]);
  assert.deepEqual(bindCallTransaction(tx, { sender, recipient: address, method: "evaluate_revision", args: ["e1", "e1:r1"] }, "assessment"), {
    sender,
    recipient: address,
    method: "evaluate_revision",
    args: ["e1", "e1:r1"],
  });
});

test("rejects unrelated recipient, method, argument and conflicting application aliases", () => {
  assert.throws(() => bindCallTransaction(callTransaction("evaluate_revision", ["e1", "e1:r1"], { recipient: otherSender, to_address: otherSender }), { sender, recipient: address, method: "evaluate_revision", args: ["e1", "e1:r1"] }, "assessment"), /recipient mismatch/);
  assert.throws(() => bindCallTransaction(callTransaction("submit_entry", ["p1"]), { sender, recipient: address, method: "evaluate_revision", args: ["e1", "e1:r1"] }, "assessment"), /method mismatch/);
  assert.throws(() => bindCallTransaction(callTransaction("evaluate_revision", ["e2", "e2:r1"]), { sender, recipient: address, method: "evaluate_revision", args: ["e1", "e1:r1"] }, "assessment"), /arguments mismatch/);
  assert.throws(() => bindCallTransaction(callTransaction("evaluate_revision", ["e1", "e1:r1"], { from_address: otherSender }), { sender, recipient: address, method: "evaluate_revision", args: ["e1", "e1:r1"] }, "assessment"), /conflicting application address aliases/);
});

test("requires exact deployment recipient, returned address and source bytes", () => {
  const tx = {
    sender,
    from_address: sender,
    recipient: address,
    to_address: address,
    created_timestamp: "100",
    data: {
      contract_address: address,
      contract_code: source.toString("base64"),
      calldata: { base64: "Bg==" },
    },
  };
  assert.deepEqual(bindDeploymentTransaction(tx, { sender, recipient: address, sourceBytes: source }, "deployment"), { sender, recipient: address, contract_address: address });
  assert.throws(() => bindDeploymentTransaction({ ...tx, data: { ...tx.data, contract_address: otherSender } }, { sender, recipient: address, sourceBytes: source }, "deployment"), /deployed contract address mismatch/);
  assert.throws(() => bindDeploymentTransaction({ ...tx, data: { ...tx.data, contract_code: Buffer.from("other", "utf8").toString("base64") } }, { sender, recipient: address, sourceBytes: source }, "deployment"), /deployed contract bytes mismatch/);
});

test("requires a single consistent numeric creation timestamp", () => {
  assert.equal(transactionCreatedTimestamp({ created_timestamp: "42", createdTimestamp: "42" }, "tx"), 42n);
  assert.throws(() => transactionCreatedTimestamp({}, "tx"), /missing a created timestamp/);
  assert.throws(() => transactionCreatedTimestamp({ created_timestamp: "42", createdTimestamp: "43" }, "tx"), /conflicting created timestamps/);
});
