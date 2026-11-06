import { NextResponse } from "next/server";
import { chatTurn } from "@/lib/brain";
import { fail, readDecisions, readHistory, readProfile, str } from "../_shared";

// Free chat. The model answers in JSON: a reply plus an optional one-line decision pulled out of what she said.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const profile = readProfile(body?.profile);
  const message = str(body?.message, 2000).trim();
  if (!profile) return fail(400, "profile missing: finish onboarding first");
  if (!message) return fail(400, "message is empty");

  try {
    const { decision, ai } = await chatTurn(
      { profile, decisions: readDecisions(body?.decisions), history: readHistory(body?.history, 20) },
      message,
      { channel: "web" }, // no scheduler and no intents here; the web app has buttons
    );
    return NextResponse.json({ ...ai, decision });
  } catch (e) {
    return fail(502, (e as Error).message);
  }
}
