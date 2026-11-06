// Client-side encryption for her memory.
// key = HKDF-SHA256(wallet signature over a fixed message) -> AES-256-GCM. Only ciphertext is stored.
// Needs a deterministic signer (RFC 6979 ECDSA): Privy embedded wallets and viem local accounts are.
// Fixed text, independent of APP_NAME: changing it changes every key and makes stored memory unreadable.
export const KEY_MESSAGE = `Unlock my private memory (v1)

Signing this creates the key that encrypts your chats and decisions on this device. It is free and sends no transaction.`;

export type Sealed = { v: 1; iv: string; ct: string };

const enc = new TextEncoder();
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function hexToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]+$/.test(h) || h.length % 2) throw new Error("signature is not hex");
  return Uint8Array.from(h.match(/../g)!, (b) => parseInt(b, 16));
}

export async function deriveKey(signatureHex: string, address: string): Promise<CryptoKey> {
  const ikm = await crypto.subtle.importKey("raw", hexToBytes(signatureHex) as BufferSource, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    // A fixed salt is fine: the input is a 65-byte signature, already high-entropy. The address in `info` binds the key to
    // one wallet, so two wallets on one phone never share a key.
    { name: "HKDF", hash: "SHA-256", salt: enc.encode("memory/v1"), info: enc.encode(`aes-gcm:${address.toLowerCase()}`) },
    ikm,
    { name: "AES-GCM", length: 256 },
    false, // not extractable: the raw key never leaves WebCrypto
    ["encrypt", "decrypt"],
  );
}

export async function seal(key: CryptoKey, value: unknown): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(value)));
  return { v: 1, iv: b64(iv), ct: b64(new Uint8Array(ct)) };
}

export async function unseal<T>(key: CryptoKey, s: Sealed): Promise<T> {
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(s.iv) as BufferSource }, key, unb64(s.ct) as BufferSource);
  return JSON.parse(new TextDecoder().decode(pt)) as T;
}
