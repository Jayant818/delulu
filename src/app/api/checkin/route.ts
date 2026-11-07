import { NextResponse } from "next/server";
import { checkInText } from "@/lib/brain";
import { fail, guardDemo, readDecisions, readHistory, readProfile } from "../_shared";

// Daily check-in text for the web app (the app decides WHEN; this only writes it, sealed on 0G).
// Vercel: 0G answers in 2-5 s, but a busy TEE provider can be slower; 60 s is the Hobby plan maximum.
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const profile = readProfile(body?.profile);
  const blocked = guardDemo(req); if (blocked) return blocked;
  try {
    return NextResponse.json(await checkInText({ profile, decisions: readDecisions(body?.decisions), history: readHistory(body?.history, 10) }));
  } catch (e) {
    return fail(502, (e as Error).message);
  }
}
