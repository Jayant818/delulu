import { NextResponse } from "next/server";
import { checkInText } from "@/lib/brain";
import { fail, readDecisions, readHistory, readProfile } from "../_shared";

// Daily check-in text for the web app (the app decides WHEN; this only writes it, sealed on 0G).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const profile = readProfile(body?.profile);
  if (!profile) return fail(400, "profile missing");
  try {
    return NextResponse.json(await checkInText({ profile, decisions: readDecisions(body?.decisions), history: readHistory(body?.history, 10) }));
  } catch (e) {
    return fail(502, (e as Error).message);
  }
}
