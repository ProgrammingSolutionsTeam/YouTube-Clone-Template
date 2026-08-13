/**
 * Vault cryptography.
 *
 * Everything user related is stored locally and encrypted with WebCrypto:
 *  - a random 256 bit Data Encryption Key (DEK) per profile folder,
 *  - the DEK is wrapped with a Key Encryption Key (KEK) derived from the
 *    account password through PBKDF2-SHA256 (high iteration count),
 *  - every file is sealed with AES-GCM using a fresh 96 bit IV,
 *  - the password itself is never stored; only an independent PBKDF2 verifier.
 *
 * Changing a password only re-wraps the DEK, so stored files stay valid.
 */

const PBKDF2_ITERATIONS = 250_000;
const VERIFIER_ITERATIONS = 310_000;

export const KDF = { PBKDF2_ITERATIONS, VERIFIER_ITERATIONS };

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function toBase64(bytes: Uint8Array | ArrayBuffer): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = "";
  for (let i = 0; i < view.length; i++) out += String.fromCharCode(view[i]);
  return btoa(out);
}

export function fromBase64(value: string): Uint8Array {
  const raw = atob(value);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function importPassword(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
    "deriveKey",
  ]);
}

/** Derives the key-encryption-key used to wrap/unwrap a profile DEK. */
export async function deriveKek(
  password: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const base = await importPassword(password);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    base,
    { name: "AES-KW", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

/** Password verifier — independent from the KEK, safe to store. */
export async function passwordVerifier(
  password: string,
  salt: Uint8Array,
  iterations = VERIFIER_ITERATIONS,
): Promise<string> {
  const base = await importPassword(password);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    base,
    256,
  );
  return toBase64(bits);
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Creates a fresh, extractable AES-GCM data key for a profile folder. */
export async function createDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function wrapDek(dek: CryptoKey, kek: CryptoKey): Promise<string> {
  const wrapped = await crypto.subtle.wrapKey("raw", dek, kek, "AES-KW");
  return toBase64(wrapped);
}

export async function unwrapDek(wrapped: string, kek: CryptoKey): Promise<CryptoKey> {
  return crypto.subtle.unwrapKey(
    "raw",
    fromBase64(wrapped) as BufferSource,
    kek,
    "AES-KW",
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

/** Derives a device-bound key, used for anonymous (session) profiles. */
export async function deriveDeviceKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await importPassword(secret);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 120_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export interface SealedPayload {
  iv: string;
  data: ArrayBuffer;
}

export async function seal(key: CryptoKey, value: unknown): Promise<SealedPayload> {
  const iv = randomBytes(12);
  const plain = new TextEncoder().encode(JSON.stringify(value));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, plain);
  return { iv: toBase64(iv), data };
}

export async function open<T>(key: CryptoKey, payload: SealedPayload): Promise<T> {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(payload.iv) as BufferSource },
    key,
    payload.data,
  );
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

/** URL/folder safe slug for a user name (falls back to a random suffix). */
export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return base || `user-${toBase64(randomBytes(4)).replace(/[^a-z0-9]/gi, "").slice(0, 6).toLowerCase()}`;
}

export function newSessionId(): string {
  return toBase64(randomBytes(12)).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
}
