// Encrypted-at-rest store for the Telegram bot. One file per user, nothing readable on disk:
// - file name = HMAC(master, telegram user id): the folder does not list who uses the bot
// - per-user random data key encrypts the record (AES-256-GCM); the data key is wrapped by the master key
// - /forget deletes the file, so the wrapped key and the data go together (crypto-shredding)
// Honest limit: whoever holds BOT_MASTER_KEY on this server can decrypt. "Nothing readable at rest", not "unreadable to us".
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Outcome, Profile, ViewId } from "@/lib/persona";
import type { AiResult } from "@/lib/ai/provider";

export type Proof = Omit<AiResult, "text"> & { at: string; kind: "chat" | "view" | "voice" };
export type BotDecision = {
  id: string;
  question: string;
  choice: ViewId;
  at: string;
  checkInAt: string;
  views: Partial<Record<ViewId, string>>;
  outcome?: Outcome;
};
// Scheduled bot messages. Kept inside the encrypted record, so the schedule is as private as the memory.
export type Job = { id: string; kind: "checkback" | "daily" | "reminder"; at: string; ref?: string; text?: string };
export type BotUser = {
  uid: number; // telegram user id = private chat id; needed to message her first (check-ins, reminders)
  profile: Profile | null;
  onboarding: { step: number; answers: Partial<Profile> } | null;
  chat: { role: "user" | "assistant"; content: string; at: string }[];
  decisions: BotDecision[];
  pending: Record<string, { question: string; views?: Partial<Record<ViewId, string>> }>;
  proofs: Proof[];
  usage: { day: string; count: number };
  dailyAt: string | null; // "HH:MM" IST, or null = no daily check-in
  jobs: Job[];
};

export const newUser = (uid = 0): BotUser => ({
  uid,
  profile: null,
  onboarding: null,
  chat: [],
  decisions: [],
  pending: {},
  proofs: [],
  usage: { day: "", count: 0 },
  dailyAt: null,
  jobs: [],
});

type Box = { iv: string; ct: string; tag: string };
type FileV1 = { v: 1; wk: Box; d: Box };

function seal(key: Buffer, plain: Buffer): Box {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(plain), c.final()]);
  return { iv: iv.toString("base64"), ct: ct.toString("base64"), tag: c.getAuthTag().toString("base64") };
}

function open(key: Buffer, b: Box): Buffer {
  const d = createDecipheriv("aes-256-gcm", key, Buffer.from(b.iv, "base64"));
  d.setAuthTag(Buffer.from(b.tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(b.ct, "base64")), d.final()]);
}

export class BotStore {
  private master: Buffer;
  constructor(
    private dir: string,
    masterKeyB64: string,
  ) {
    this.master = Buffer.from(masterKeyB64 ?? "", "base64");
    if (this.master.length !== 32) throw new Error("BOT_MASTER_KEY must be 32 bytes, base64");
  }

  private file(userId: number | string) {
    return path.join(this.dir, createHmac("sha256", this.master).update(`user:${userId}`).digest("hex").slice(0, 40) + ".json");
  }

  async load(userId: number | string): Promise<BotUser | null> {
    let raw: string;
    try {
      raw = await readFile(this.file(userId), "utf8");
    } catch {
      return null;
    }
    const f = JSON.parse(raw) as FileV1;
    const dataKey = open(this.master, f.wk);
    return { ...newUser(), ...JSON.parse(open(dataKey, f.d).toString("utf8")) };
  }

  async save(userId: number | string, user: BotUser): Promise<void> {
    await mkdir(this.dir, { recursive: true, mode: 0o700 });
    const target = this.file(userId);
    let dataKey: Buffer;
    try {
      dataKey = open(this.master, (JSON.parse(await readFile(target, "utf8")) as FileV1).wk);
    } catch {
      dataKey = randomBytes(32);
    }
    const body: FileV1 = { v: 1, wk: seal(this.master, dataKey), d: seal(dataKey, Buffer.from(JSON.stringify(user))) };
    const tmp = `${target}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(body), { mode: 0o600 });
    await rename(tmp, target); // atomic: a crash never leaves half a record
  }

  /** Every user id with a record. Decrypts each file: O(users), fine for a demo-sized bot. */
  async userIds(): Promise<number[]> {
    let names: string[];
    try {
      names = (await readdir(this.dir)).filter((n) => n.endsWith(".json"));
    } catch {
      return [];
    }
    const ids: number[] = [];
    for (const n of names) {
      try {
        const f = JSON.parse(await readFile(path.join(this.dir, n), "utf8")) as FileV1;
        const uid = JSON.parse(open(open(this.master, f.wk), f.d).toString("utf8")).uid;
        if (typeof uid === "number" && uid) ids.push(uid);
      } catch {}
    }
    return ids;
  }

  async forget(userId: number | string): Promise<void> {
    await rm(this.file(userId), { force: true });
  }
}
