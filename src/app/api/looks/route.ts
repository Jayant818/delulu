import { NextResponse } from "next/server";
import { looksFor } from "@/lib/brain";
import { MOCK_LOOKS, parseLooks } from "@/lib/looks";
import { fail, guardDemo, readHistory, readProfile } from "../_shared";

// After her photo: 3 try-on ideas that fit the chat (Jayant TG 3761). Text only on 0G (sealed); the photo never comes
// here. MOCK returns fixed, labelled ideas so the E2E stays free. The app shows fixed chips if this fails or is slow.
export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const profile = readProfile(body?.profile);
  const history = readHistory(body?.history, 6);
  const blocked = guardDemo(req); if (blocked) return blocked;
  try {
    const ai = await looksFor(profile, history);
    const looks = ai.backend === "mock" ? MOCK_LOOKS : parseLooks(ai.text);
    if (!looks) return fail(502, "no usable ideas");
    return NextResponse.json({ looks, backend: ai.backend, requestId: ai.requestId });
  } catch (e) {
    return fail(502, (e as Error).message);
  }
}
