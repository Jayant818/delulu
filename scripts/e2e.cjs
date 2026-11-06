/* eslint-disable @typescript-eslint/no-require-imports */
// E2E smoke test (DEV wallet + MOCK model, dev server on :3000).
// Usage: CHROME_PATH=/path/to/chrome node scripts/e2e.cjs <path to playwright-core> <screenshot dir>
const { chromium } = require(process.argv[2]);
const out = process.argv[3];
const B = "http://localhost:3000";
const ok = (c, m) => {
  if (!c) throw new Error("FAIL: " + m);
  console.log("PASS:", m);
};
const idb = (page, op) =>
  page.evaluate(
    (op) =>
      new Promise((res) => {
        const r = indexedDB.open("keyval-store");
        r.onsuccess = () => {
          const s = r.result.transaction("keyval").objectStore("keyval");
          const q = op === "count" ? s.count() : s.getAll();
          q.onsuccess = () => res(op === "count" ? q.result : JSON.stringify(q.result));
        };
      }),
    op,
  );

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  // Login + onboarding -> home is the chat.
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
  ok(await page.getByRole("heading", { name: /Tell Delulu anything/ }).isVisible(), "home is the 'Tell Delulu anything' chat");

  // Free talk with a decision in it -> inline decision card.
  const input = page.getByPlaceholder("Tell me anything…");
  await input.fill("ugh my parents want me home but should I take the Bangalore design job or stay in Jaipur?");
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByText("Sounds like a decision:").waitFor();
  ok((await page.locator("button", { hasText: "MOCK" }).count()) === 1, "chat reply carries a request-ID chip");
  await page.screenshot({ path: `${out}/2-talk-decision.png`, fullPage: true });

  // Card -> Decide, pre-filled.
  await page.getByRole("link", { name: /See 3 views/ }).click();
  await page.waitForURL("**/decide?q=**");
  ok((await page.getByPlaceholder(/Should I take/).inputValue()).includes("Bangalore design job"), "Decide pre-filled from the chat");
  ok(await page.getByText("Pulled from your chat.").isVisible(), "Decide says it came from chat");
  await page.getByRole("button", { name: "Hear all three" }).click();
  await page.getByRole("button", { name: /go with this/ }).first().waitFor();
  ok((await page.locator("button", { hasText: "MOCK" }).count()) === 3, "three views, three request-ID chips");
  for (const t of ["Delulu", "Future You at 30", "Your Bestie"]) ok(await page.getByRole("heading", { name: t }).isVisible(), `view ${t}`);
  await page.getByRole("button", { name: /go with this/ }).nth(1).click();
  await page.getByText("Saved.").waitFor();
  ok(await page.getByText(/Check back on/).isVisible(), "30-day check-back item shown");
  await page.screenshot({ path: `${out}/3-decide.png`, fullPage: true });

  // Ciphertext only at rest; survives reload.
  const raw = await idb(page, "all");
  ok(raw.includes('"ct"') && !raw.includes("Bangalore") && !raw.includes("sister"), "IndexedDB holds ciphertext only");
  await page.goto(B + "/decide");
  await page.getByText(/Went with Future You at 30/).waitFor();
  ok(true, "memory decrypts after reload");

  // Back in chat: the card now shows the outcome; small talk makes no card.
  await page.getByRole("link", { name: "Talk" }).click();
  await page.getByText(/Decided: went with Future You at 30/).waitFor();
  ok(true, "chat card shows the decision she made");
  await page.getByPlaceholder("Tell me anything…").fill("hiii");
  await page.getByRole("button", { name: "Send" }).click();
  await page.locator("button", { hasText: "MOCK" }).nth(1).waitFor();
  ok((await page.getByText("Sounds like a decision:").count()) === 0, "small talk does not create a decision card");
  await page.screenshot({ path: `${out}/4-talk.png`, fullPage: true });

  // Delete everything.
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByText(/1 decisions/).waitFor();
  await page.getByRole("button", { name: "Delete everything" }).click();
  await page.getByRole("button", { name: /DEV wallet/ }).waitFor();
  ok((await idb(page, "count")) === 0, "delete everything wipes IndexedDB and logs out");

  ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
