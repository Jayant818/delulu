import { NextResponse } from "next/server";
import { complete } from "@/lib/ai/provider";
import { chatSystemPrompt, parseChatReply } from "@/lib/persona";
import { fail, readDecisions, readHistory, readProfile, str } from "../_shared";

// Free chat. The model answers in JSON: a reply plus an optional one-line decision pulled out of what she said.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const profile = readProfile(body?.profile);
  const message = str(body?.message, 2000).trim();
  if (!profile) return fail(400, "profile missing: finish onboarding first");
  if (!message) return fail(400, "message is empty");

  try {
    const r = await complete(
      [
        { role: "system", content: chatSystemPrompt(profile, readDecisions(body?.decisions)) },
        ...readHistory(body?.history, 20),
        { role: "user", content: message },
      ],
      { json: true },
    );
    const { reply, decision } = parseChatReply(r.text);
    return NextResponse.json({ ...r, text: reply, decision });
  } catch (e) {
    return fail(502, (e as Error).message);
  }
}
