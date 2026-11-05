/* eslint-disable @typescript-eslint/no-require-imports */
// E2E smoke test (DEV wallet + MOCK model, dev server on :3000).
// Usage: CHROME_PATH=/path/to/chrome node scripts/e2e.cjs <path to playwright-core> <screenshot dir>
const { chromium } = require(process.argv[2]);
const out = process.argv[3];
const B = "http://localhost:3000";
const ok = (c, m) => { if (!c) throw new Error("FAIL: " + m); console.log("PASS:", m); };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto(B);
  await page.getByRole("button", { name: /DEV wallet/ }).click();
  await page.waitForURL("**/onboarding");
  await page.screenshot({ path: `${out}/1-onboarding.png` });
  const answers = ["Become a product designer", "Freedom and family", "My sister", "Disappointing my parents", "Take a job in Bangalore or stay in Jaipur"];
  for (let i = 0; i < 5; i++) {
    await page.locator("textarea").fill(answers[i]);
    await page.getByRole("button", { name: i < 4 ? "Next" : /Meet/, exact: i < 4 }).click();
  }
  await page.waitForURL(B + "/");
  ok((await page.getByPlaceholder(/Should I take/).inputValue()).includes("Bangalore"), "decide prefilled with her big decision");

  await page.getByRole("button", { name: "Hear all three" }).click();
  await page.getByRole("button", { name: /go with this/ }).first().waitFor();
  ok((await page.getByRole("button", { name: /go with this/ }).count()) === 3, "three views rendered");
  ok((await page.locator("button", { hasText: "MOCK" }).count()) === 3, "three request-ID chips (MOCK)");
  for (const t of ["Delulu", "Future You at 30", "Your Bestie"]) ok(await page.getByRole("heading", { name: t }).isVisible(), `view ${t}`);
  await page.screenshot({ path: `${out}/2-decide.png`, fullPage: true });
  await page.getByRole("button", { name: /go with this/ }).nth(1).click();
  await page.getByText("Saved.").waitFor();
  ok(await page.getByText(/Check back on/).isVisible(), "30-day check-back item shown");

  // Ciphertext only at rest.
  const raw = await page.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open("keyval-store");
        r.onsuccess = () => {
          const tx = r.result.transaction("keyval").objectStore("keyval").getAll();
          tx.onsuccess = () => res(JSON.stringify(tx.result));
        };
      }),
  );
  ok(raw.includes('"ct"') && !raw.includes("Bangalore") && !raw.includes("sister"), "IndexedDB holds ciphertext only");

  await page.reload();
  await page.getByText(/Went with Future You at 30/).waitFor();
  ok(true, "memory decrypts after reload");

  await page.getByRole("link", { name: "Chat" }).click();
  await page.getByPlaceholder("Message…").fill("I am scared to tell my parents");
  await page.getByRole("button", { name: "Send" }).click();
  await page.locator("button", { hasText: "MOCK" }).first().waitFor();
  ok(await page.getByText("I am scared to tell my parents", { exact: true }).isVisible(), "chat message + reply");
  await page.screenshot({ path: `${out}/3-chat.png`, fullPage: true });

  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByText(/1 decisions/).waitFor();
  await page.screenshot({ path: `${out}/4-settings.png`, fullPage: true });
  await page.getByRole("button", { name: "Delete everything" }).click();
  await page.getByRole("button", { name: /DEV wallet/ }).waitFor();
  const left = await page.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open("keyval-store");
        r.onsuccess = () => {
          const tx = r.result.transaction("keyval").objectStore("keyval").count();
          tx.onsuccess = () => res(tx.result);
        };
      }),
  );
  ok(left === 0, "delete everything wipes IndexedDB and logs out");

  ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
