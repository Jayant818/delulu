import { connection, NextResponse } from "next/server";
import { configuredBackends, ZG_MODEL, ZG_TRUST_MODE } from "@/lib/ai/provider";

// Never returns secrets: only which backends are configured.
export async function GET() {
  await connection(); // read env at request time, not at build time
  return NextResponse.json({ backends: configuredBackends(), zgModel: ZG_MODEL, zgTrustMode: ZG_TRUST_MODE });
}
