import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/program?ref=p999",
  "/publish",
  "/apply?program=p999",
  "/evidence?entry=e999",
  "/workspace",
  "/activity",
];

test("all static query-ID routes render useful unconfigured states", async ({ page }) => {
  test.setTimeout(60_000);
  for (const route of publicRoutes) {
    await page.goto(route);
    await expect(page.locator(".brand")).toContainText("entrew");
    await expect(page.locator("main")).not.toBeEmpty();
    if (!["/publish", "/activity", "/workspace"].includes(route)) {
      await expect(page.getByText(/not configured yet|has not been deployed|no published programs/i).first()).toBeVisible();
    }
  }
  await page.goto("/workspace");
  await expect(page.getByText(/Connect a wallet to see your workspace/i)).toBeVisible();
});

test("public explorer shows no invented registry rows while unconfigured", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/No programs or counts are shown until a real Studionet deployment is integrated/i)).toBeVisible();
  await expect(page.locator(".program-card")).toHaveCount(0);
  await expect(page.getByText(/published in finalized contract state/)).toHaveCount(0);
});

test("all routes fit every requested viewport", async ({ page }) => {
  for (const width of [320, 375, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of publicRoutes) {
      await page.goto(route);
      const dimensions = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
      expect(dimensions.document, route + " has horizontal overflow at " + width + "px").toBeLessThanOrEqual(dimensions.viewport + 1);
    }
  }
});

test("every route has no automated accessibility violations", async ({ page }) => {
  for (const route of publicRoutes) {
    await page.goto(route);
    if (route.startsWith("/evidence")) await expect(page.getByRole("heading", { level: 1 })).toHaveText("Evidence record unavailable");
    if (route.startsWith("/program")) await expect(page.getByRole("heading", { level: 1 })).toHaveText("Program unavailable");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.map(({ id, impact, nodes }) => ({
      id,
      impact,
      targets: nodes.map(({ target }) => target.join(" ")),
    })), route).toEqual([]);
  }
});

test("MetaMask and Rabby can be selected independently and switch to exact Studionet", async ({ page }) => {
  await page.addInitScript(() => {
    let chain = "0x1";
    const makeProvider = (kind: "metamask" | "rabby") => ({
      isMetaMask: kind === "metamask",
      isRabby: kind === "rabby",
      request: async ({ method }: { method: string }) => {
        if (method === "eth_requestAccounts" || method === "eth_accounts") return [kind === "metamask" ? "0x1111111111111111111111111111111111111111" : "0x2222222222222222222222222222222222222222"];
        if (method === "eth_chainId") return chain;
        if (method === "wallet_switchEthereumChain") { chain = "0xf22f"; return null; }
        if (method === "wallet_addEthereumChain") return null;
        throw new Error(`Unexpected test provider request: ${method}`);
      },
      on: () => undefined,
      removeListener: () => undefined,
    });
    Object.defineProperty(window, "ethereum", { configurable: true, value: { providers: [makeProvider("metamask"), makeProvider("rabby")] } });
  });
  await page.goto("/");
  const connectButton = page.getByRole("button", { name: "Connect wallet" });
  await connectButton.click();
  const dialog = page.getByRole("dialog", { name: /Choose a signing wallet/i });
  await expect(dialog).toBeVisible();
  const closeButton = page.getByRole("button", { name: "Close wallet selection" });
  const walletChoices = dialog.getByRole("button", { name: /MetaMask|Rabby/ });
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(walletChoices.last()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(connectButton).toBeFocused();
  await connectButton.click();
  await expect(dialog).toBeVisible();
  await page.getByRole("button", { name: /Rabby/ }).click();
  await expect(page.getByRole("button", { name: "Switch network" })).toBeVisible();
  await page.getByRole("button", { name: "Switch network" }).click();
  await expect(page.locator(".wallet-pill")).toHaveAttribute("title", /Rabby · 0x2222/);
  await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible();
  await page.getByRole("button", { name: "Disconnect" }).click();
  await expect(page.getByRole("button", { name: "Connect wallet" })).toBeVisible();
});
