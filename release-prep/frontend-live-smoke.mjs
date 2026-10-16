#!/usr/bin/env node
// Read-only browser smoke test against a separately deployed test contract.
import { chromium } from "@playwright/test";

const PRODUCTION_ADDRESS = "0xf37C3D7992833A876Bb2933c09b11bD49FC817ca";
const RPC = "https://studio.genlayer.com/api";
const address = process.env.NEXT_PUBLIC_ENTREW_CONTRACT_ADDRESS || "";
if (!/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error("Set the new test contract address in this process environment.");
if (address.toLowerCase() === PRODUCTION_ADDRESS.toLowerCase()) throw new Error("Refusing to test against the existing production contract.");
if (process.env.NEXT_PUBLIC_ENTREW_CHAIN_ID !== "61999") throw new Error("Set NEXT_PUBLIC_ENTREW_CHAIN_ID=61999 in this process environment.");
if (process.env.NEXT_PUBLIC_ENTREW_RPC !== "https://studio.genlayer.com/api") throw new Error("Set the Studionet RPC in this process environment.");

const baseURL = process.env.ENTREW_TEST_URL || "http://127.0.0.1:3100";
const routes = [{ name: "explorer", path: "/" }];
if (process.env.ENTREW_TEST_PROGRAM_ID) routes.push({ name: "program", path: "/program?ref=" + encodeURIComponent(process.env.ENTREW_TEST_PROGRAM_ID) });
if (process.env.ENTREW_TEST_ENTRY_ID) routes.push({ name: "evidence", path: "/evidence?entry=" + encodeURIComponent(process.env.ENTREW_TEST_ENTRY_ID) });
const errors = [];
const readCalls = [];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", request => {
    if (request.url() !== RPC || request.method() !== "POST") return;
    try {
      const payload = JSON.parse(request.postData() || "{}");
      const call = payload.method === "gen_call" ? payload.params?.[0] : null;
      if (call?.type !== "read") return;
      if (String(call.to).toLowerCase() !== address.toLowerCase()) errors.push("Frontend read targeted a contract other than the supplied test address.");
      if (call.transaction_hash_variant !== "latest-final") errors.push("Frontend read did not request the latest finalized state snapshot.");
      readCalls.push({ to: call.to, transaction_hash_variant: call.transaction_hash_variant });
    } catch {
      errors.push("Could not inspect a Studionet RPC request.");
    }
  });
  const viewports = [320, 375, 390, 768, 1280, 1440];
  const results = [];
  for (const route of routes) {
    const response = await page.goto(new URL(route.path, baseURL).toString(), { waitUntil: "networkidle", timeout: 30000 });
    if (!response || !response.ok()) throw new Error(route.name + " returned " + (response?.status() ?? "no response"));
    const heading = (await page.locator("h1").first().textContent())?.trim() || "";
    if (!heading || /unavailable/i.test(heading)) throw new Error(route.name + " did not load from canonical contract state: " + heading);
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 900 });
      const dimensions = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
      if (dimensions.document > dimensions.viewport + 1) throw new Error(route.name + " overflows at " + width + "px");
    }
    await page.reload({ waitUntil: "networkidle", timeout: 30000 });
    results.push({ route: route.name, heading, reload: "passed", viewports });
  }
  if (!readCalls.length) throw new Error("No live public contract reads were observed.");
  if (errors.length) throw new Error("Browser console/page/RPC errors: " + errors.join(" | "));
  console.log(JSON.stringify({ contract_address: address, chain_id: 61999, base_url: baseURL, routes: results, canonical_read_calls: readCalls.length, read_snapshot: "latest-final", wallet_interaction: "not tested" }, null, 2));
} finally {
  await browser.close();
}
