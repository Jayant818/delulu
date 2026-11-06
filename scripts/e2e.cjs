/* eslint-disable @typescript-eslint/no-require-imports */
// E2E smoke test (DEV wallet + MOCK model). Start server with DEMO_GUARD=off.
// Usage: CHROME_PATH=/path/to/chrome node scripts/e2e.cjs <path to playwright-core> <screenshot dir>
const { chromium } = require(process.argv[2]);
const out = process.argv[3];
const B = process.env.E2E_BASE_URL || "http://localhost:3000";
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
  // Vercel serves this script only on deployments; keep the local browser test independent of analytics.
  await page.route("**/_vercel/insights/script.js", (route) => route.fulfill({ contentType: "application/javascript", body: "" }));
  const errors = [];
  let testingLimits = false;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !(testingLimits && /429/.test(m.text())) && errors.push(m.text()));

  // No login screen in DEV mode and no setup questions: opening the app lands in the chat, input focused.
  await page.goto(B + "/app");
  await page.getByRole("heading", { name: /Tell Delulu anything/ }).waitFor();
  ok(page.url() === B + "/app", "open -> straight into the chat (no onboarding route)");
  ok((await page.evaluate(() => document.activeElement?.getAttribute("placeholder"))) === "Tell me anything…", "chat input is focused");
  await page.screenshot({ path: `${out}/1-open.png` });

  // It learns about her from the chat (mock: "I'm ..." -> one fact), stored encrypted with the rest.
  await page.getByPlaceholder("Tell me anything…").fill("I'm a UX intern in Pune and my sister is my person");
  await page.getByRole("button", { name: "Send" }).click();
  await page.locator("button", { hasText: "MOCK" }).first().waitFor();

  // Free talk with a decision in it -> inline decision card.
  const input = page.getByPlaceholder("Tell me anything…");
  await input.fill("ugh my parents want me home but should I take the Bangalore design job or stay in Jaipur?");
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByText("Sounds like a decision:").waitFor();
  ok((await page.locator("button", { hasText: "MOCK" }).count()) === 2, "every chat reply carries a request-ID chip");
  await page.screenshot({ path: `${out}/2-talk-decision.png`, fullPage: true });

  // Card -> Decide, pre-filled.
  await page.getByRole("link", { name: /See perspectives/ }).click();
  await page.waitForURL("**/decide?q=**");
  ok((await page.getByPlaceholder(/Should I take/).inputValue()).includes("Bangalore design job"), "Decide pre-filled from the chat");
  ok(await page.getByText("Pulled from your chat.").isVisible(), "Decide says it came from chat");
  await page.getByRole("button", { name: "Hear all three" }).click();
  await page.getByRole("button", { name: /go with this/ }).nth(2).waitFor(); // all three voices answered
  ok((await page.locator("button", { hasText: "MOCK" }).count()) === 3, "three views, three request-ID chips");
  for (const t of ["The sane one", "You at 30", "Your bestie"]) ok(await page.getByRole("heading", { name: t }).isVisible(), `view ${t}`);
  await page.getByRole("button", { name: /go with this/ }).nth(1).click();
  await page.getByText("Saved.").waitFor();
  ok(await page.getByText(/Check back on/).isVisible(), "30-day check-back item shown");
  await page.screenshot({ path: `${out}/3-decide.png`, fullPage: true });

  // Ciphertext only at rest; survives reload.
  const raw = await idb(page, "all");
  ok(raw.includes('"ct"') && !raw.includes("Bangalore") && !raw.includes("sister"), "IndexedDB holds ciphertext only");
  await page.goto(B + "/decide");
  await page.getByText(/Went with You at 30/).waitFor();
  ok(true, "memory decrypts after reload");

  // Back in chat: the card now shows the outcome; small talk makes no card.
  await page.getByRole("link", { name: "Talk" }).click();
  await page.getByText(/Decided: went with You at 30/).waitFor();
  ok(true, "chat card shows the decision she made");

  // In-app check-back (dev server runs with NEXT_PUBLIC_CHECKBACK_MS=8000; the scheduler ticks every 15 s).
  await page.getByText(/Check-back\. You decided/).waitFor({ timeout: 40_000 });
  await page.getByRole("button", { name: "😊 Glad I did" }).click();
  await page.getByText(/Love that for you/).waitFor();
  ok(true, "in-app check-back appears when due; the answer gets a reply");

  // No commands: plain-text intents.
  const say = async (t) => {
    await page.getByPlaceholder("Tell me anything…").fill(t);
    await page.getByRole("button", { name: "Send" }).click();
  };
  await say("remind me to call Riya");
  await page.getByText(/Reminder set: call Riya/).waitFor();
  await say("what are my reminders");
  await page.getByRole("button", { name: "Cancel" }).first().waitFor();
  ok(await page.getByText(/⏰ call Riya ·/).isVisible(), "reminders list from plain text");
  await say("delete everything");
  await page.getByRole("button", { name: "No, keep it" }).click();
  await page.getByText("Okay, keeping everything 💛").waitFor();
  ok(true, "'delete everything' asks first; No keeps it");
  await page.getByPlaceholder("Tell me anything…").fill("hiii");
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByText("hiii", { exact: true }).waitFor();
  await page.waitForTimeout(1500);
  ok((await page.getByText("Sounds like a decision:").count()) === 0, "small talk does not create a decision card");
  await page.screenshot({ path: `${out}/4-talk.png`, fullPage: true });

  // Try-on (MOCK without OPENAI_API_KEY): photo -> style -> look -> brief (0G) -> three voices -> pick.
  await page.getByRole("link", { name: "Try-on", exact: true }).click();
  await page.getByRole("heading", { name: "Try the look" }).waitFor();
  ok((await page.getByText(/Try-on photos are processed/).count()) === 0, "no privacy banner on the try-on screen (it lives in the FAQ)");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAAKklEQVR4nO3NQQkAAAgEsIttEjMZyxQ+hMH+y1SfikAgEAgEAoFAIPgSLPAYWGrIjiB9AAAAAElFTkSuQmCC", "base64");
  await page.locator('input[type="file"]').setInputFiles({ name: "selfie.png", mimeType: "image/png", buffer: png });
  await page.getByRole("img", { name: "Your photo" }).waitFor();
  await page.getByRole("button", { name: "Sleek chin-length bob" }).click();
  await page.getByRole("button", { name: /See it on me/ }).click();
  await page.getByText("MOCK: no image model configured").waitFor({ timeout: 30_000 });
  await page.getByText(/MOCK, no model configured/).first().waitFor();
  ok(await page.getByRole("heading", { name: /Your stylist brief/ }).isVisible(), "try-on result + stylist brief");
  await page.getByRole("button", { name: /Ask the three voices/ }).click();
  await page.getByRole("button", { name: /go with this/ }).nth(2).waitFor(); // all three voices answered
  ok((await page.getByRole("button", { name: /go with this/ }).count()) === 3, "three voices on the look");
  await page.getByRole("button", { name: /go with this/ }).first().click();
  await page.getByText(/Saved\. I'll ask you how the new look feels/).waitFor();
  const stored = await idb(page, "all");
  ok(!stored.includes("data:image") && !stored.includes("Sleek"), "no photo (and no plaintext) in stored memory");

  // Delete everything.
  await page.getByRole("link", { name: "Settings" }).click();
  await page.getByText(/\d+ decisions/).waitFor();
  ok(await page.getByText(/· 1 thing it knows about you/).isVisible(), "Settings counts what it learned");
  await page.getByText(/What Delulu knows about you/).click();
  ok(await page.getByText("I'm a UX intern in Pune and my sister is my person").isVisible(), "…and lists it");
  await page.getByRole("button", { name: "Delete everything" }).click();
  await page.getByText(/What's on your mind\?/).waitFor();
  ok((await idb(page, "count")) === 0, "delete everything wipes IndexedDB and starts fresh in the chat");

  // Deterministic 429 UI checks; the mock server itself runs with DEMO_GUARD=off.
  testingLimits = true;
  const resting = "Delulu is resting. This demo has a daily limit so it stays free. Try again later.";
  const limited = (route) => route.fulfill({ status: 429, contentType: "application/json", headers: { "Retry-After": "600" }, body: JSON.stringify({ error: "demo_limit", message: resting }) });
  await page.route("**/api/chat", limited);
  await say("hello");
  const note = page.getByRole("status").filter({ hasText: resting });
  await note.waitFor();
  ok(await note.evaluate((el) => getComputedStyle(el).color) === "rgb(20, 33, 61)", "chat limit is a calm navy assistant note");
  await input.fill("hi again");
  ok(await page.getByRole("button", { name: "Send" }).isEnabled(), "chat remains usable after a limit");
  await page.unroute("**/api/chat", limited);
  await page.getByRole("button", { name: "Send" }).click();
  await page.locator("button", { hasText: "MOCK" }).first().waitFor();
  ok((await note.count()) === 0, "a later chat can succeed and clears the limit note");

  await page.route("**/api/decide", limited);
  await page.goto(B + "/decide");
  await page.getByPlaceholder(/Should I take/).fill("Should I go?");
  await page.getByRole("button", { name: "Hear all three" }).click();
  await page.getByRole("status").filter({ hasText: resting }).nth(2).waitFor();
  ok(await page.getByRole("button", { name: "Hear all three" }).isEnabled(), "limited decision views keep the form usable");

  await page.route("**/api/brief", limited);
  await page.goto(B + "/tryon");
  await page.locator('input[type="file"]').setInputFiles({ name: "selfie.png", mimeType: "image/png", buffer: png });
  await page.getByRole("img", { name: "Your photo" }).waitFor();
  await page.getByRole("button", { name: "Sleek chin-length bob" }).click();
  await page.getByRole("button", { name: /See it on me/ }).click();
  await page.getByRole("status").filter({ hasText: resting }).waitFor();
  ok(await page.getByRole("img", { name: /AI preview/ }).isVisible() && !(await page.getByText("Writing it privately…").count()), "limited brief keeps the image and stops loading");
  await page.getByRole("button", { name: /Ask the three voices/ }).click();
  await page.getByRole("status").filter({ hasText: resting }).nth(3).waitFor();
  ok(true, "try-on decision limits also render calm notes");

  ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
