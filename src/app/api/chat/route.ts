import { NextResponse } from "next/server";
import { complete, type ChatMessage } from "@/lib/ai/provider";
import { chatSystemPrompt } from "@/lib/persona";
import { fail, readDecisions, readProfile, str } from "../_shared";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const profile = readProfile(body?.profile);
  const message = str(body?.message, 2000).trim();
  if (!profile) return fail(400, "profile missing: finish onboarding first");
  if (!message) return fail(400, "message is empty");

  const history: ChatMessage[] = (Array.isArray(body?.history) ? body.history : [])
    .slice(-20)
    .filter((m: { role?: string }) => m?.role === "user" || m?.role === "assistant")
    .map((m: { role: "user" | "assistant"; content: unknown }) => ({ role: m.role, content: str(m.content, 2000) }));

  try {
    const r = await complete([
      { role: "system", content: chatSystemPrompt(profile, readDecisions(body?.decisions)) },
      ...history,
      { role: "user", content: message },
    ]);
    return NextResponse.json(r);
  } catch (e) {
    return fail(502, (e as Error).message);
  }
}
