/**
 * Stable, opaque public identifiers.
 * The real filesystem path is NEVER exposed to the URL or the UI.
 * An id is derived deterministically from (rootId, relative path) so that the
 * same file always maps to the same /watch?v=<id> link across rescans.
 */

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

function fnv1a64(input: string): [number, number] {
  // 64-bit FNV-1a implemented on two 32-bit halves (no BigInt for worker perf).
  let h1 = 0x811c9dc5;
  let h2 = 0xcbf29ce4;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h2 ^= (c << 5) | (c >>> 27);
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = Math.imul(h2, 0x85ebca6b) >>> 0;
  }
  return [h1 >>> 0, h2 >>> 0];
}

function encode(n: number, len: number): string {
  let out = "";
  let v = n;
  for (let i = 0; i < len; i++) {
    out = ALPHABET[v % ALPHABET.length] + out;
    v = Math.floor(v / ALPHABET.length);
  }
  return out;
}

/** Opaque 10 character public id, e.g. `x7K92LmP4q`. */
export function publicId(prefixSeed: string, path: string[]): string {
  const [a, b] = fnv1a64(`${prefixSeed}\u0000${path.join("\u0000")}`);
  return encode(a, 5) + encode(b, 5);
}

export function randomId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}
