import { NextResponse } from "next/server";
import { chatTurn } from "@/lib/brain";
import { fail, readDecisions, readHistory, readProfile, str } from "../_shared";

// Free chat. The model answers in JSON: a reply plus an optional one-line decision pulled out of what she said.
// Nothing here is logged or stored: her context arrives decrypted from her device for this one request only.
// Vercel: 0G answers in 2-5 s, but a busy TEE provider can be slower; 60 s is the Hobby plan maximum.
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const profile = readProfile(body?.profile);
  const message = str(body?.message, 2000).trim();
  if (!message) return fail(400, "message is empty");

  try {
    const { decision, reminder, intent, remember, ai } = await chatTurn(
      { profile, decisions: readDecisions(body?.decisions), history: readHistory(body?.history, 20) },
      message,
      { channel: "web" },
    );
    return NextResponse.json({ ...ai, decision, reminder, intent, remember });
  } catch (e) {
    return fail(502, (e as Error).message);
  }
}
