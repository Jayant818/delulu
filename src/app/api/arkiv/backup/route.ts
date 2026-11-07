import { connection, NextResponse } from "next/server";
import { arkivEnabled, deleteBackup, findBackup, writeBackup } from "@/lib/arkiv-server";
import { backupMessage, deleteMessage, freshTs, fromB64, MAX_BLOB_BYTES, sha256Hex, signedBy } from "@/lib/backup";
import { fail, str } from "../../_shared";

// The server sees only ciphertext + a signature. It checks the signature recovers her address, then the relayer writes.
const ADDR = /^0x[0-9a-fA-F]{40}$/;
const SIG = /^0x[0-9a-fA-F]{130}$/;
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

export async function GET(req: Request) {
  await connection();
  if (!arkivEnabled()) return NextResponse.json({ enabled: false });
  const owner = new URL(req.url).searchParams.get("owner") ?? "";
  if (!ADDR.test(owner)) return fail(400, "bad owner");
  try {
    return NextResponse.json({ enabled: true, backup: await findBackup(owner, true) });
  } catch (e) {
    return fail(502, `Arkiv read failed: ${(e as Error).message.slice(0, 200)}`);
  }
}

export async function POST(req: Request) {
  await connection();
  if (!arkivEnabled()) return fail(404, "Arkiv backup is off");
  const b = await req.json().catch(() => null);
  const owner = str(b?.owner, 42);
  const blobB64 = str(b?.blob, 200_000);
  const sig = str(b?.signature, 132);
  const ts = b?.ts;
  if (!ADDR.test(owner) || !SIG.test(sig) || !B64.test(blobB64) || !freshTs(ts)) return fail(400, "bad request");
  let blob: Uint8Array;
  try {
    blob = fromB64(blobB64);
  } catch {
    return fail(400, "bad base64");
  }
  if (blob.length > MAX_BLOB_BYTES) return fail(413, "backup too big");
  if (!(await signedBy(owner, backupMessage(await sha256Hex(blob), ts), sig))) return fail(401, "signature does not match owner");
  try {
    return NextResponse.json({ enabled: true, ...(await writeBackup(owner, blob, ts)) });
  } catch (e) {
    const m = (e as Error).message;
    return fail(m === "stale backup" ? 409 : 502, `Arkiv write failed: ${m.slice(0, 200)}`);
  }
}

export async function DELETE(req: Request) {
  await connection();
  if (!arkivEnabled()) return NextResponse.json({ enabled: false });
  const b = await req.json().catch(() => null);
  const owner = str(b?.owner, 42);
  const sig = str(b?.signature, 132);
  if (!ADDR.test(owner) || !SIG.test(sig) || !freshTs(b?.ts)) return fail(400, "bad request");
  if (!(await signedBy(owner, deleteMessage(b.ts), sig))) return fail(401, "signature does not match owner");
  try {
    return NextResponse.json({ enabled: true, deleted: await deleteBackup(owner, b.ts) });
  } catch (e) {
    const m = (e as Error).message;
    return fail(m === "stale backup" ? 409 : 502, `Arkiv delete failed: ${m.slice(0, 200)}`);
  }
}
