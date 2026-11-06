import { NextResponse } from "next/server";
import { briefFor } from "@/lib/brain";
import { fail, readProfile, str } from "../_shared";

// Stylist / nail tech brief: text only, written on 0G (sealed). The photo never comes here.
// Vercel: 0G answers in 2-5 s, but a busy TEE provider can be slower; 60 s is the Hobby plan maximum.
export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const profile = readProfile(body?.profile);
  const kind = body?.kind;
  const style = str(body?.style, 120).trim();
  if (kind !== "hair" && kind !== "nails") return fail(400, "kind must be hair or nails");
  if (!style) return fail(400, "style missing");
  try {
    return NextResponse.json(await briefFor(kind, style, profile));
  } catch (e) {
    return fail(502, (e as Error).message);
  }
}
