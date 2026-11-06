// Server-only. One interface for every model call: complete(messages) -> AiResult.
// Order: 0G Private Computer -> OpenAI-compatible fallback -> mock (mock ONLY when nothing is configured,
// so a broken 0G key fails loudly instead of quietly turning into canned text).

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type Backend = "0g" | "openai" | "mock";

export type AiResult = {
  text: string;
  backend: Backend;
  model: string;
  requestId: string | null;
  provider: string | null; // on-chain address of the 0G provider that served the request
  teeVerified: boolean | null; // from x_0g_trace.tee_verified (verify_tee: true)
  costNeuron: string | null; // 1e18 neuron = 1 0G
  fallbackReason?: string; // set when 0G failed and the OpenAI-compatible backend answered
};

const env = (k: string) => process.env[k]?.trim() || undefined;

const zgBaseUrl = () => env("ZG_BASE_URL") ?? "https://router-api.0g.ai/v1";
// 0gm-1.0-35b-a3b is the only chat model with a TeeML (sealed) provider in /v1/models on 2026-11-06.
export const ZG_MODEL = env("ZG_MODEL") ?? "0gm-1.0-35b-a3b";
// private = TeeML providers only (prompts stay inside the enclave). A request fails with 503 rather than downgrade.
export const ZG_TRUST_MODE = env("ZG_TRUST_MODE") ?? "private";

export function configuredBackends(): Backend[] {
  const list: Backend[] = [];
  if (env("ZG_API_KEY")) list.push("0g");
  if (env("OPENAI_COMPAT_API_KEY") && env("OPENAI_COMPAT_BASE_URL")) list.push("openai");
  if (list.length === 0) list.push("mock");
  return list;
}

// Some reasoning models inline their thinking. The user never sees it.
const stripThinking = (s: string) => s.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parse0g(data: any, model: string): AiResult {
  const t = data?.x_0g_trace ?? {};
  return {
    text: stripThinking(data?.choices?.[0]?.message?.content ?? ""),
    backend: "0g",
    model: data?.model ?? model,
    requestId: t.request_id ?? null,
    provider: t.provider ?? null,
    teeVerified: typeof t.tee_verified === "boolean" ? t.tee_verified : null,
    costNeuron: t.billing?.total_cost ?? null,
  };
}

type Opts = { maxTokens?: number; temperature?: number; json?: boolean };
const jsonMode = (o: Opts) => (o.json ? { response_format: { type: "json_object" } } : {});

async function postJson(url: string, headers: Record<string, string>, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

async function call0g(messages: ChatMessage[], o: Opts): Promise<AiResult> {
  const data = await postJson(
    `${zgBaseUrl()}/chat/completions`,
    { Authorization: `Bearer ${env("ZG_API_KEY")}`, "X-0G-Provider-Trust-Mode": ZG_TRUST_MODE },
    {
      model: ZG_MODEL,
      messages,
      max_tokens: o.maxTokens ?? 700,
      temperature: o.temperature ?? 0.8,
      verify_tee: true, // Router checks the provider's TEE signature; result lands in x_0g_trace.tee_verified
      ...jsonMode(o), // 0gm-1.0 lists response_format in supported_parameters (/v1/models, 2026-11-06)
      chat_template_kwargs: { enable_thinking: false }, // 0gm thinks by default; off = faster, cheaper replies
    },
  );
  return parse0g(data, ZG_MODEL);
}

async function callOpenAI(messages: ChatMessage[], o: Opts): Promise<AiResult> {
  const model = env("OPENAI_COMPAT_MODEL") ?? "gpt-4.1-mini";
  const data = await postJson(
    `${env("OPENAI_COMPAT_BASE_URL")!.replace(/\/$/, "")}/chat/completions`,
    { Authorization: `Bearer ${env("OPENAI_COMPAT_API_KEY")}` },
    { model, messages, max_tokens: o.maxTokens ?? 700, temperature: o.temperature ?? 0.8, ...jsonMode(o) },
  );
  return {
    text: stripThinking(data?.choices?.[0]?.message?.content ?? ""),
    backend: "openai",
    model: data?.model ?? model,
    requestId: data?.id ?? null,
    provider: null,
    teeVerified: null,
    costNeuron: null,
  };
}

async function callMock(messages: ChatMessage[], o: Opts): Promise<AiResult> {
  const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const voice = messages[0]?.content.match(/^VOICE: (.+)$/m)?.[1] ?? "the app";
  const reply = `[MOCK, no model configured] ${voice} would answer here. You said: "${last.slice(0, 140)}"`;
  // Crude stand-in for the model's decision flag, so the decision card can be demoed without a key.
  const decision = /\b(should i|or not|decide|choose|whether)\b|\?.*\bor\b|\bor\b.*\?/i.test(last) ? last.slice(0, 100) : null;
  return {
    text: o.json ? JSON.stringify({ reply, decision }) : reply,
    backend: "mock",
    model: "mock",
    requestId: `mock-${crypto.randomUUID()}`,
    provider: null,
    teeVerified: null,
    costNeuron: null,
  };
}

const CALL: Record<Backend, (m: ChatMessage[], o: Opts) => Promise<AiResult>> = {
  "0g": call0g,
  openai: callOpenAI,
  mock: callMock,
};

export async function complete(messages: ChatMessage[], opts: Opts = {}): Promise<AiResult> {
  let firstError: Error | undefined;
  for (const backend of configuredBackends()) {
    try {
      const r = await CALL[backend](messages, opts);
      if (firstError) r.fallbackReason = firstError.message;
      return r;
    } catch (e) {
      firstError ??= e as Error;
      console.error(`[ai] ${backend} failed:`, (e as Error).message);
    }
  }
  throw firstError ?? new Error("no AI backend answered");
}
