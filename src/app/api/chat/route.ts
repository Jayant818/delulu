import { NextResponse } from "next/server";
import { chatTurn } from "@/lib/brain";
import { fail, guardDemo, readDecisions, readHistory, readProfile, str } from "../_shared";

// Free chat. The model answers in JSON: a reply plus an optional one-line decision pulled out of what she said.
// Nothing here is logged or stored: her context arrives decrypted from her device for this one request only.
// Vercel: 0G answers in 2-5 s, but a busy TEE provider can be slower; 60 s is the Hobby plan maximum.
export const maxDuration = 60;

const LOOK = /\b(wear|outfit|dress|hair|bangs|nails?|haircut|hair ?colou?r|suits? me|look good on me)\b/i;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const profile = readProfile(body?.profile);
  const message = str(body?.message, 2000).trim();
  if (!message) return fail(400, "message is empty");
  const blocked = guardDemo(req); if (blocked) return blocked;

  try {
    const { decision, reminder, intent, remember, ai } = await chatTurn(
      { profile, decisions: readDecisions(body?.decisions), history: readHistory(body?.history, 20) },
      message,
      { channel: "web" },
    );
    // Look questions always get the "Send a photo" button, even when the model forgets the intent (Jayant TG 3740).
    // ponytail: keyword match on her message; swap for a classifier if it fires on the wrong messages.
    const lookIntent = !intent && LOOK.test(message) ? ({ type: "photo" } as const) : intent;
    return NextResponse.json({ ...ai, decision, reminder, intent: lookIntent, remember });
  } catch (e) {
    return fail(502, (e as Error).message);
  }
}
