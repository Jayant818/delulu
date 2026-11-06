import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { test } from "node:test";

test("check:url exits truthfully and --chat sends at most one tiny public request", async (t) => {
  let info;
  let reply;
  let statusCode;
  let chatCode;
  const requests = [];
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    requests.push({ path: req.url, method: req.method, body, auth: req.headers.authorization, cookie: req.headers.cookie });
    const chat = req.url === "/api/chat";
    res.writeHead(chat ? chatCode : statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(chat ? reply : info));
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const cases = [
    { name: "0G status only", backends: ["0g"], exit: 0, chats: 0 },
    { name: "mock status", backends: ["mock"], chat: true, exit: 1, chats: 0 },
    { name: "mixed mock status", backends: ["0g", "mock"], exit: 1, chats: 0 },
    { name: "fallback only", backends: ["openai"], exit: 1, chats: 0 },
    { name: "malformed status", backends: "0g", exit: 1, chats: 0 },
    { name: "sealed 0G", backends: ["0g", "openai"], chat: true, exit: 0, chats: 1 },
    { name: "unsealed 0G", backends: ["0g"], chat: true, sealed: false, exit: 1, chats: 1 },
    { name: "chat fell back", backends: ["0g", "openai"], chat: true, backend: "openai", exit: 1, chats: 1 },
    { name: "chat rate limited", backends: ["0g"], chat: true, chatCode: 429, exit: 1, chats: 1 },
    { name: "status unavailable", backends: ["0g"], statusCode: 503, chat: true, exit: 1, chats: 0 },
  ];
  for (const c of cases) await t.test(c.name, async () => {
    requests.length = 0;
    info = { backends: c.backends, zgModel: "test-model", zgTrustMode: "private" };
    reply = { backend: c.backend ?? "0g", sealed: c.sealed ?? true, text: "Hi." };
    statusCode = c.statusCode ?? 200;
    chatCode = c.chatCode ?? 200;
    const child = spawn(process.execPath, ["scripts/check-url.mjs", base, ...(c.chat ? ["--chat"] : [])], { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (data) => { output += data; });
    child.stderr.on("data", (data) => { output += data; });
    const code = await new Promise((resolve, reject) => { child.on("error", reject); child.on("close", resolve); });
    assert.equal(code, c.exit, output);
    assert.equal(requests.length, 1 + c.chats);
    assert.equal(requests[0].path, "/api/status");
    assert.equal(requests[0].method, "GET");
    for (const req of requests) {
      assert.equal(req.auth, undefined);
      assert.equal(req.cookie, undefined);
    }
    if (c.chats) {
      assert.equal(requests[1].path, "/api/chat");
      assert.equal(requests[1].method, "POST");
      assert.deepEqual(JSON.parse(requests[1].body), { message: "Say hi." });
    }
    if (c.name === "sealed 0G") assert.match(output, /chat: 0G=true sealed=true/);
    if (c.name === "0G status only") assert.match(output, /chat not requested/);
  });
});
