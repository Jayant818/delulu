/* eslint-disable @typescript-eslint/no-require-imports */
// E2E smoke test (DEV wallet + MOCK model, dev server on :3300).
// Usage: CHROME_PATH=/path/to/chrome node scripts/e2e.cjs <path to playwright-core> <screenshot dir>
const { chromium } = require(process.argv[2]);
const out = process.argv[3];
const B = process.env.E2E_BASE_URL || `http://localhost:${process.env.PORT || 3300}`; // start the server with DEMO_GUARD=off
const { mkdirSync } = require("node:fs");
mkdirSync(out, { recursive: true });
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
  for (const width of [390, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  // Vercel serves the analytics script only on deployments; keep the local browser test independent of the network.
  await page.route("**/_vercel/insights/script.js", (route) => route.fulfill({ contentType: "application/javascript", body: "" }));
  await page.route("**/va.vercel-scripts.com/**", (route) => route.fulfill({ contentType: "application/javascript", body: "" }));
  const shot = async (name) => {
    await page.waitForTimeout(500); // let the smooth chat scroll settle before capturing
    await page.screenshot({ path: `${out}/${width}-${name}.png` });
  };
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource.*(502|429)/.test(m.text()) && errors.push(m.text()));

  // No login screen in DEV mode and no setup questions: opening the app lands in the chat, input focused.
  await page.goto(B + "/app");
  await page.getByRole("heading", { name: "Delulu", exact: true }).waitFor();
  ok(page.url() === B + "/app", "open -> straight into the chat (no onboarding route)");
  ok((await page.evaluate(() => document.activeElement?.getAttribute("placeholder"))) === "Tell me anything…", "chat input is focused");
  await page.getByText("MOCK demo · no AI model connected").waitFor();
  await shot("1-open");
  ok((await (await page.request.get(B + "/api/status")).json()).backends[0] === "mock", "MOCK backend only");
  ok(await page.getByText("MOCK demo · no AI model connected").isVisible(), "truthful header status");

  // It learns about her from the chat (mock: "I'm ..." -> one fact), stored encrypted with the rest.
  await page.getByPlaceholder("Tell me anything…").fill("I'm a UX intern in Pune and my sister is my person");
  await page.getByRole("button", { name: "Send message" }).click();
  await page.locator("button", { hasText: "MOCK" }).first().waitFor();

  // Free talk with a decision in it -> inline decision card.
  const input = page.getByPlaceholder("Tell me anything…");
  await input.fill("ugh my parents want me home but should I take the Bangalore design job or stay in Jaipur?");
  await page.getByRole("button", { name: "Send message" }).click();
  await page.getByText("Sounds like a decision:").waitFor();
  ok((await page.locator("button", { hasText: "MOCK" }).count()) === 2, "every chat reply carries a request-ID chip");
  await shot("2-talk-decision");

  // The three voices open in the thread, without a route change.
  await page.getByRole("button", { name: "Hear all three" }).click();
  await page.getByRole("button", { name: /go with this/ }).nth(2).waitFor();
  ok(page.url() === B + "/app", "decision stays inline");
  ok((await page.locator("button", { hasText: "MOCK" }).count()) === 5, "chat and three views each retain their request chip");
  for (const t of ["The sane one", "You at 30", "Your bestie"]) ok(await page.getByRole("heading", { name: t }).isVisible(), `view ${t}`);
  await shot("3-three-voices");
  await page.getByRole("button", { name: /go with this/ }).nth(1).click();
  await page.getByText(/Decided: went with You at 30/).waitFor();
  ok(await page.getByText(/Check back on/).isVisible(), "30-day check-back item shown");

  // Ciphertext only at rest; survives reload.
  const raw = await idb(page, "all");
  ok(raw.includes('"ct"') && !raw.includes("Bangalore") && !raw.includes("sister"), "IndexedDB holds ciphertext only");
  await page.goto(B + "/decide");
  await page.getByText(/Went with You at 30/).waitFor();
  ok(true, "memory decrypts after reload");

  // Back in chat: the card now shows the outcome; small talk makes no card.
  await page.getByRole("link", { name: "Talk" }).click(); // the back link on pages other than Talk
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
    await page.getByRole("button", { name: "Send message" }).click();
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
  await page.getByRole("button", { name: "Send message" }).click();
  await page.getByText("hiii", { exact: true }).waitFor();
  await page.waitForTimeout(1500);
  ok((await page.getByText("Sounds like a decision:").count()) === 0, "small talk does not create a decision card");
  await shot("4-reminders");

  // The attachment never leaves before consent; cancel leaves no photo bubble.
  let uploads = 0;
  page.on("request", (r) => { if (r.url() === B + "/api/tryon" && r.method() === "POST") uploads++; });
  const attach = async () => {
    await page.locator('input[type="file"]').setInputFiles("public/visuals-west/hair-base-west.jpg");
    await page.getByRole("dialog", { name: "Send photo" }).waitFor();
  };
  await attach();
  await shot("5-consent");
  ok(uploads === 0, "no upload before consent");
  ok(await page.getByText(/our server.*MOCK/).isVisible(), "consent names the actual backend");
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();
  ok((await page.getByRole("img", { name: "Your photo", exact: true }).count()) === 0, "cancel discards the photo");
  await attach();
  await page.getByRole("dialog").getByRole("button", { name: "Send", exact: true }).click();
  await page.getByRole("button", { name: "Nails", exact: true }).click();
  ok(await page.getByRole("button", { name: "Glazed chrome", exact: true }).isVisible(), "inline nails exposes the existing nail presets");
  await page.getByRole("button", { name: "Haircut", exact: true }).click();
  ok(uploads === 0, "choosing a kind still does not upload");
  // A brief failure must preserve the result; retry must not consume another image.
  await page.route("**/api/brief", (route) => route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "Brief temporarily unavailable" }) }), { times: 1 });
  await page.getByRole("button", { name: "Sleek chin-length bob" }).click();
  await page.getByText(/brief couldn't finish/).waitFor();
  ok(uploads === 1, "consented photo uses the existing try-on API once");
  ok(await page.getByRole("img", { name: "AI preview", exact: true }).isVisible(), "AI preview survives a failed brief");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByText(/Stylist brief: Sleek chin-length bob/).waitFor();
  ok(uploads === 1, "brief retry does not spend a second try-on");
  ok(await page.getByText(/AI preview · MOCK: original photo, unchanged/).isVisible(), "mock preview is explicitly unchanged");
  await shot("6-preview-brief");

  // Free-text hair color is hair at the API boundary; a 429 is shown verbatim and chat stays usable.
  await attach();
  await page.getByRole("dialog").getByRole("button", { name: "Send", exact: true }).click();
  await page.getByRole("button", { name: "Hair color", exact: true }).click();
  ok(await page.getByRole("button", { name: "Copper red, same cut" }).isVisible(), "hair color reuses existing presets");
  await page.getByRole("button", { name: "Describe a look" }).click();
  await page.getByPlaceholder("Describe your look…").fill("Soft copper, same cut");
  let colorBody = "";
  await page.route("**/api/tryon", (route) => {
    colorBody = route.request().postData() || "";
    return route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: "You've used your 5 try-ons for today. Back tomorrow!" }) });
  }, { times: 1 });
  await page.getByRole("button", { name: "Send message" }).click();
  await page.getByText(/You've used your 5 try-ons for today/).waitFor();
  ok(colorBody.includes('name="kind"\r\n\r\nhair') && colorBody.includes("Soft copper, same cut"), "free-text color uses the supported hair request shape");
  await say("still here after the demo limit");
  await page.getByText(/would answer here.*still here after the demo limit/).waitFor();
  ok(true, "chat remains usable after a demo-limit error");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByText(/Stylist brief: Soft copper, same cut/).waitFor();
  await shot("7-recovered");
  const beforeReload = await idb(page, "all");
  ok(!beforeReload.includes("data:image") && !beforeReload.includes("Sleek"), "stored memory has neither plaintext briefs nor photos");
  await page.reload();
  await page.getByText(/Stylist brief: Sleek chin-length bob/).waitFor();
  ok((await page.getByRole("img", { name: "Your photo", exact: true }).count()) === 0, "photos are not restored from saved memory");

  // The standalone Try-on route still works.
  // Try-on (MOCK without OPENAI_API_KEY): photo -> style -> look -> brief (0G) -> three voices -> pick.
  await page.goto(B + "/tryon"); // not in the nav any more (TG 3740), the route still works
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
  await page.getByRole("link", { name: "Talk" }).click(); // back from /tryon
  await page.getByRole("link", { name: "Settings" }).click(); // the gear in the Talk header
  await page.getByText(/\d+ decisions/).waitFor();
  ok(await page.getByText(/· 1 thing it knows about you/).isVisible(), "Settings counts what it learned");
  await page.getByText(/What Delulu knows about you/).click();
  ok(await page.getByText("I'm a UX intern in Pune and my sister is my person").isVisible(), "…and lists it");
  await page.getByRole("button", { name: "Delete everything" }).click();
  await page.getByText(/What's on your mind\?/).waitFor();
  ok((await idb(page, "count")) === 0, "delete everything wipes IndexedDB and starts fresh in the chat");

  // Explicit decide intent also stays inline, and deleting chat clears tab-only photos too.
  await say("help me decide tea or coffee");
  await page.getByRole("button", { name: "Hear all three" }).waitFor();
  ok(page.url() === B + "/app", "explicit decide intent stays in chat");
  await attach();
  await page.getByRole("dialog").getByRole("button", { name: "Send", exact: true }).click();
  await say("delete everything");
  await page.getByRole("button", { name: "Yes, delete everything" }).click();
  await page.getByText(/What's on your mind\?/).waitFor();
  ok((await idb(page, "count")) === 0 && (await page.getByRole("img", { name: "Your photo", exact: true }).count()) === 0, "chat delete clears saved memory and tab-only photos");
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal overflow");
  await shot("8-deleted");
  ok(errors.length === 0, "no page errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  console.log(`PASS: ${width}px chat flow complete`);
  await page.close();
  }
  await browser.close();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
