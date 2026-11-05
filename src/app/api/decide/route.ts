import { NextResponse } from "next/server";
import { complete } from "@/lib/ai/provider";
import { viewSystemPrompt } from "@/lib/persona";
import { fail, isView, readDecisions, readProfile, str } from "../_shared";

// One view per request. The client asks for all three in parallel, so each view gets its own 0G request ID.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const profile = readProfile(body?.profile);
  const question = str(body?.question, 1000).trim();
  if (!profile) return fail(400, "profile missing: finish onboarding first");
  if (!question) return fail(400, "decision is empty");
  if (!isView(body?.view)) return fail(400, "view must be tara | future | bestie");

  try {
    const r = await complete(
      [
        { role: "system", content: viewSystemPrompt(body.view, profile, readDecisions(body?.decisions)) },
        { role: "user", content: `The decision I am facing: ${question}` },
      ],
      { maxTokens: 400 },
    );
    return NextResponse.json(r);
  } catch (e) {
    return fail(502, (e as Error).message);
  }
}
