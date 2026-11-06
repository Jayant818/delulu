import { NextResponse } from "next/server";
import { viewOn } from "@/lib/brain";
import { fail, guardDemo, isView, readDecisions, readHistory, readProfile, str } from "../_shared";

// One view per request. The client asks for all three in parallel, so each view gets its own 0G request ID.
// Vercel: 0G answers in 2-5 s, but a busy TEE provider can be slower; 60 s is the Hobby plan maximum.
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const profile = readProfile(body?.profile);
  const question = str(body?.question, 1000).trim();
  if (!question) return fail(400, "decision is empty");
  if (!isView(body?.view)) return fail(400, "view must be sane | future | bestie");
  const blocked = guardDemo(req); if (blocked) return blocked;

  try {
    const r = await viewOn(
      body.view,
      { profile, decisions: readDecisions(body?.decisions), history: readHistory(body?.history, 10) },
      question,
    );
    return NextResponse.json(r);
  } catch (e) {
    return fail(502, (e as Error).message);
  }
}
