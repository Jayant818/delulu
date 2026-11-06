// Public deployment check. No credentials; --chat opts into exactly one paid request.
try {
  const [url, flag, ...extra] = process.argv.slice(2);
  if (!url || (flag && flag !== "--chat") || extra.length) throw new Error("Usage: npm run check:url -- https://example.vercel.app [--chat]");
  const base = new URL(url);
  if (!["https:", "http:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error("Use an HTTP(S) URL without credentials, query parameters or a fragment.");
  }
  const status = await fetch(new URL("/api/status", base), { signal: AbortSignal.timeout(15_000), redirect: "error" });
  if (!status.ok) throw new Error(`/api/status: HTTP ${status.status}`);
  const info = await status.json();
  console.log("status:", JSON.stringify(info));
  if (!Array.isArray(info.backends) || info.backends.includes("mock") || !info.backends.includes("0g")) {
    throw new Error("Not live on 0G: backends must include 0g and exclude mock.");
  }
  if (flag === "--chat") {
    const res = await fetch(new URL("/api/chat", base), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Say hi." }),
      signal: AbortSignal.timeout(65_000),
      redirect: "error",
    });
    if (!res.ok) throw new Error(`/api/chat: HTTP ${res.status}`);
    const reply = await res.json();
    console.log(`chat: 0G=${reply.backend === "0g"} sealed=${reply.sealed === true}`);
    if (reply.backend !== "0g" || reply.sealed !== true) throw new Error("Chat did not return a sealed 0G reply.");
  }
  console.log(flag ? "PASS: live sealed reply from 0G" : "PASS: 0G configured (chat not requested)");
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
}
